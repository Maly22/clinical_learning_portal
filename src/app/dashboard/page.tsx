import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, HeartHandshake, NotebookPen, UsersRound } from "lucide-react";
import { getCurrentMembership } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/pending-approval");
  const supabase = await createClient();

  const stats: Array<[string, string, string]> = [];

  if (membership.role === "supervisor" || membership.role === "platform_admin") {
    const [{ count: pendingRoles }, { count: pendingKudos }, { count: activeMembers }] = await Promise.all([
      supabase.from("role_requests").select("id", { count: "exact", head: true }).eq("location_program_id", membership.locationProgramId).eq("status", "pending"),
      supabase.from("location_departments").select("id", { count: "exact", head: true }).eq("location_program_id", membership.locationProgramId).eq("is_active", true)
        .then(async ({ data }) => {
          const ids = (data ?? []).map((d) => d.id);
          if (!ids.length) return { count: 0 };
          return supabase.from("kudos").select("id", { count: "exact", head: true }).in("location_department_id", ids).eq("status", "pending");
        }),
      supabase.from("memberships").select("id", { count: "exact", head: true }).eq("location_program_id", membership.locationProgramId).eq("is_active", true),
    ]);
    stats.push(["Pending role requests", String(pendingRoles ?? 0), "Awaiting review"]);
    stats.push(["Pending kudos", String(pendingKudos ?? 0), "Awaiting review"]);
    stats.push(["Active members", String(activeMembers ?? 0), "This program"]);
  }

  if (membership.role === "student") {
    const [{ count: checklistDone }, { count: checklistTotal }] = await Promise.all([
      supabase.from("student_checklist_progress").select("checklist_item_id", { count: "exact", head: true }).eq("student_id", membership.userId).not("completed_at", "is", null),
      supabase.from("checklist_items").select("id, afsc_programs!inner(code)", { count: "exact", head: true }).eq("afsc_programs.code", membership.afscCode),
    ]);
    stats.push(["Checklist complete", `${checklistDone ?? 0} / ${checklistTotal ?? 0}`, "Interactive checklist"]);
    const { count: scheduleCount } = await supabase.from("schedule_documents").select("id", { count: "exact", head: true }).eq("student_id", membership.userId).eq("is_active", true);
    stats.push(["Schedule documents", String(scheduleCount ?? 0), "Available to download"]);
  }

  if (membership.role === "preceptor") {
    const { count: kudosReceived } = await supabase.from("kudos").select("id", { count: "exact", head: true }).eq("preceptor_id", membership.userId).eq("status", "approved");
    stats.push(["Kudos received", String(kudosReceived ?? 0), "Approved recognition"]);
  }

  return (
    <DashboardShell membership={membership} activeHref="/dashboard">
      <div className="welcome"><div><h1>Welcome back, {membership.firstName}.</h1><p>{membership.locationName} · {membership.afscCode}</p></div></div>
      <div className="stats-grid">
        {stats.map(([label, value, detail]) => <article className="stat-card" key={label}><small>{label}</small><strong>{value}</strong><span>{detail}</span></article>)}
      </div>
      <div className="quick-grid">
        {(membership.role === "supervisor" || membership.role === "platform_admin") && (
          <>
            <Link className="quick" href="/dashboard/approvals"><UsersRound /><strong>Pending users</strong><span>Review requested roles and locations</span></Link>
            <Link className="quick" href="/dashboard/kudos"><HeartHandshake /><strong>Kudos review</strong><span>Approve or reject submissions</span></Link>
          </>
        )}
        {membership.role === "student" && (
          <>
            <Link className="quick" href="/dashboard/schedule"><CheckCircle2 /><strong>My schedule</strong><span>View and download your assigned schedule</span></Link>
            <Link className="quick" href={`/locations/${membership.locationSlug}/kudos/submit`}><HeartHandshake /><strong>Send kudos</strong><span>Recognize a preceptor</span></Link>
          </>
        )}
        {membership.role === "preceptor" && (
          <>
            <Link className="quick" href="/dashboard/checklists"><CheckCircle2 /><strong>Student checklists</strong><span>Review and sign off</span></Link>
            <Link className="quick" href="/dashboard/kudos"><HeartHandshake /><strong>Kudos received</strong><span>See your approved recognition</span></Link>
          </>
        )}
        <Link className="quick" href="/dashboard/notes"><NotebookPen /><strong>Notes</strong><span>Only visible to you</span></Link>
      </div>
    </DashboardShell>
  );
}
