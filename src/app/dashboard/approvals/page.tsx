import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/data/dashboard";
import { DashboardShell } from "../dashboard-shell";
import { ApprovalQueue } from "./approval-queue";

export default async function ApprovalsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/pending-approval");
  if (membership.role !== "supervisor" && membership.role !== "platform_admin") redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: requests }, { data: emails }] = await Promise.all([
    supabase
      .from("role_requests")
      .select("id,user_id,requested_role,status,created_at,profiles!role_requests_user_id_fkey(first_name,last_name),location_programs(locations(short_name),afsc_programs(code))")
      .eq("location_program_id", membership.locationProgramId)
      .eq("status", "pending")
      .order("created_at"),
    supabase.rpc("list_pending_request_emails", { program_id: membership.locationProgramId }),
  ]);

  const emailByUserId = new Map<string, string>();
  for (const row of (emails ?? []) as Array<{ user_id: string; email: string }>) {
    emailByUserId.set(row.user_id, row.email);
  }
  const requestsWithEmail = (requests ?? []).map((request) => ({ ...request, email: emailByUserId.get(request.user_id) ?? null }));

  return (
    <DashboardShell membership={membership} activeHref="/dashboard/approvals">
      <div className="approval-page-head"><span className="eyebrow">Supervisor tools</span><h1>Pending users</h1><p>Verify each person&apos;s location and requested role before granting access.</p></div>
      <ApprovalQueue initialRequests={requestsWithEmail as never[]} />
    </DashboardShell>
  );
}
