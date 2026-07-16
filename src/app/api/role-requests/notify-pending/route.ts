import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/email/resend";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const admin = createAdminClient();
  const { data: request } = await admin
    .from("role_requests")
    .select("id,requested_role,location_programs(locations(name),afsc_programs(code))")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!request) return NextResponse.json({ error: "No pending request found" }, { status: 404 });

  const program = request.location_programs as unknown as { locations: { name: string } | null; afsc_programs: { code: string } | null } | null;
  if (!user.email) return NextResponse.json({ ok: true });

  await sendTransactionalEmail({
    to: user.email,
    subject: "Your PhasePrep Navigator access request is pending review",
    html: `<p>Thanks for signing up. Your request for the <strong>${request.requested_role}</strong> role at ${program?.locations?.name ?? "your selected location"} (${program?.afsc_programs?.code ?? "4N0"}) has been submitted and is now awaiting supervisor review.</p><p>You'll receive another email as soon as a decision is made. You can check your status any time by signing in.</p>`,
    idempotencyKey: `role-request-pending:${request.id}`,
  });

  return NextResponse.json({ ok: true });
}
