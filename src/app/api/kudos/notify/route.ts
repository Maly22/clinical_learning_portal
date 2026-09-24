import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { getServerEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  const { kudosId } = (await request.json().catch(() => ({}))) as { kudosId?: string };
  if (!kudosId) return NextResponse.json({ error: "kudosId is required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Guests can't read pending kudos through RLS, so ownership is checked with the admin client.
  // Guest submissions (no student_id) may only trigger a notification shortly after creation.
  const admin = createAdminClient();
  const { data: ownedKudos } = await admin.from("kudos").select("id,student_id,status,created_at").eq("id", kudosId).maybeSingle();
  const isOwner = ownedKudos?.student_id != null && ownedKudos.student_id === user?.id;
  const isFreshGuest = ownedKudos?.student_id == null && ownedKudos?.status === "pending" && Date.now() - new Date(ownedKudos.created_at).getTime() < 15 * 60 * 1000;
  if (!ownedKudos || !(isOwner || isFreshGuest)) {
    return NextResponse.json({ error: "Kudos not found" }, { status: 404 });
  }

  const { data: kudos } = await admin
    .from("kudos")
    .select("id,message,rating,decision_token,preceptor_name,student_name,student:profiles!kudos_student_id_fkey(first_name,last_name),location_departments(location_program_id,departments(name),location_programs(locations(name)))")
    .eq("id", kudosId)
    .maybeSingle();
  if (!kudos) return NextResponse.json({ error: "Kudos not found" }, { status: 404 });

  const locationDepartment = kudos.location_departments as unknown as { location_program_id: string; departments: { name: string } | null; location_programs: { locations: { name: string } | null } | null } | null;
  const student = kudos.student as unknown as { first_name: string; last_name: string } | null;
  const programId = locationDepartment?.location_program_id;

  const { data: supervisorMemberships } = await admin
    .from("memberships")
    .select("user_id")
    .eq("location_program_id", programId ?? "")
    .in("role", ["supervisor", "platform_admin"])
    .eq("is_active", true);

  const env = getServerEnv();
  const reviewUrl = `${env.NEXT_PUBLIC_APP_URL}/kudos-review/${kudos.decision_token}`;

  await Promise.all(
    (supervisorMemberships ?? []).map(async (membership) => {
      const { data: authUser } = await admin.auth.admin.getUserById(membership.user_id);
      const email = authUser?.user?.email;
      if (!email) return;
      await sendTransactionalEmail({
        to: email,
        subject: `New kudos to review — ${kudos.preceptor_name}`,
        html: `<p>${student?.first_name ?? kudos.student_name ?? "A student"} submitted kudos for ${kudos.preceptor_name} in ${locationDepartment?.departments?.name ?? "a department"} at ${locationDepartment?.location_programs?.locations?.name ?? "a Phase II location"}.</p><p>Rating: ${kudos.rating} / 5</p><blockquote>${kudos.message}</blockquote><p><a href="${reviewUrl}">Review and approve or reject this kudos</a></p>`,
        idempotencyKey: `kudos-notify:${kudos.id}:${membership.user_id}`,
      });
    }),
  );

  return NextResponse.json({ ok: true });
}
