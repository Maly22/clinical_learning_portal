import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/email/resend";

export async function POST(request: NextRequest) {
  const { requestId } = (await request.json().catch(() => ({}))) as { requestId?: string };
  if (!requestId) return NextResponse.json({ error: "requestId is required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const admin = createAdminClient();
  const { data: roleRequest } = await admin
    .from("role_requests")
    .select("id,user_id,status,requested_role,location_program_id,location_programs(locations(name),afsc_programs(code))")
    .eq("id", requestId)
    .maybeSingle();
  if (!roleRequest) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (roleRequest.status === "pending") return NextResponse.json({ error: "Request has not been reviewed yet" }, { status: 409 });

  const { data: isSupervisor } = await supabase.rpc("has_program_role", {
    target_program: roleRequest.location_program_id,
    allowed_roles: ["supervisor", "platform_admin"],
  });
  if (!isSupervisor) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { data: authUser } = await admin.auth.admin.getUserById(roleRequest.user_id);
  const email = authUser?.user?.email;
  if (!email) return NextResponse.json({ ok: true });

  const program = roleRequest.location_programs as unknown as { locations: { name: string } | null; afsc_programs: { code: string } | null } | null;
  const approved = roleRequest.status === "approved";

  await sendTransactionalEmail({
    to: email,
    subject: approved ? "Your PhasePrep Navigator access request was approved" : "Your PhasePrep Navigator access request was not approved",
    html: approved
      ? `<p>Good news — your request for the <strong>${roleRequest.requested_role}</strong> role at ${program?.locations?.name ?? "your selected location"} (${program?.afsc_programs?.code ?? "4N0"}) has been approved. Sign in to access your dashboard.</p>`
      : `<p>Your request for the <strong>${roleRequest.requested_role}</strong> role at ${program?.locations?.name ?? "your selected location"} (${program?.afsc_programs?.code ?? "4N0"}) was not approved. Contact your Phase II supervisor if you believe your role or location needs to be corrected.</p>`,
    idempotencyKey: `role-request-decision:${roleRequest.id}`,
  });

  return NextResponse.json({ ok: true });
}
