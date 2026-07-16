import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/data/dashboard";
import { DashboardShell } from "../dashboard-shell";

export default async function ManageUsersPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/pending-approval");
  if (membership.role !== "supervisor" && membership.role !== "platform_admin") redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: members }, { data: emails }] = await Promise.all([
    supabase.from("memberships").select("user_id,role,profiles!memberships_user_id_fkey(first_name,last_name)").eq("location_program_id", membership.locationProgramId).eq("is_active", true),
    supabase.rpc("list_program_emails", { program_id: membership.locationProgramId }),
  ]);

  const emailByUserId = new Map<string, string>();
  for (const row of (emails ?? []) as Array<{ user_id: string; email: string }>) {
    emailByUserId.set(row.user_id, row.email);
  }

  return (
    <DashboardShell membership={membership} activeHref="/dashboard/users">
      <div className="approval-page-head"><span className="eyebrow">Supervisor tools</span><h1>Manage users</h1><p>Everyone with active access to {membership.locationName}.</p></div>
      <section className="queue-card manage-users-table">
        <div className="table-row table-head"><span>Name</span><span>Email</span><span>Role</span></div>
        {(members ?? []).map((member) => {
          const profile = member.profiles as unknown as { first_name: string; last_name: string } | null;
          return (
            <div className="table-row" key={member.user_id}>
              <span>{profile?.first_name} {profile?.last_name}</span>
              <span>{emailByUserId.get(member.user_id) ?? "—"}</span>
              <span className="tag">{member.role}</span>
            </div>
          );
        })}
        {!members?.length && <div className="queue-empty">No active members yet</div>}
      </section>
    </DashboardShell>
  );
}
