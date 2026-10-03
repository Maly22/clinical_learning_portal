import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { getServerEnv } from "@/lib/env";
import { getCurrentMembership } from "@/lib/data/dashboard";

const inviteSchema = z.object({
  email: z.email(),
  firstName: z.string().trim().max(80).optional().default(""),
  role: z.enum(["student", "preceptor", "supervisor"]),
});

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export async function POST(request: NextRequest) {
  const parsed = inviteSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address and role." }, { status: 400 });

  const membership = await getCurrentMembership();
  if (!membership) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const supabase = await createClient();
  const { data: isSupervisor } = await supabase.rpc("has_program_role", {
    target_program: membership.locationProgramId,
    allowed_roles: ["supervisor", "platform_admin"],
  });
  if (!isSupervisor) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { email, firstName, role } = parsed.data;
  const to = email.trim().toLowerCase();
  const env = getServerEnv();
  const signUpUrl = new URL("/sign-up", env.NEXT_PUBLIC_APP_URL);
  signUpUrl.searchParams.set("email", to);
  signUpUrl.searchParams.set("program", membership.locationProgramId);
  signUpUrl.searchParams.set("role", role);
  if (firstName) signUpUrl.searchParams.set("first_name", firstName);

  const inviter = escapeHtml(`${membership.firstName} ${membership.lastName}`.trim() || "A supervisor");
  const location = escapeHtml(membership.locationName || "your Phase II location");
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hello,";

  await sendTransactionalEmail({
    to,
    subject: `You're invited to PhasePrep Navigator — ${membership.locationName || "Phase II"}`,
    html: `<p>${greeting}</p><p>${inviter} invited you to join <strong>PhasePrep Navigator</strong> as a <strong>${role}</strong> at ${location} (${escapeHtml(membership.afscCode)}).</p><p><a href="${signUpUrl.toString()}">Create your account</a></p><p>Your location and role are filled in for you. After you sign up, a supervisor will approve your access.</p>`,
    idempotencyKey: `invite:${membership.locationProgramId}:${to}:${Date.now()}`,
  });

  return NextResponse.json({ ok: true });
}
