import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/data/dashboard";
import { DashboardShell } from "../../dashboard-shell";
import { NotesPanel } from "@/components/notes/notes-panel";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/pending-approval");
  if (membership.role !== "supervisor" && membership.role !== "platform_admin") redirect("/dashboard");
  const { id: studentId } = await params;

  const supabase = await createClient();
  const { data: studentMembership } = await supabase
    .from("memberships")
    .select("user_id,profiles!memberships_user_id_fkey(first_name,last_name)")
    .eq("user_id", studentId)
    .eq("location_program_id", membership.locationProgramId)
    .eq("role", "student")
    .eq("is_active", true)
    .maybeSingle();
  if (!studentMembership) notFound();
  const profile = studentMembership.profiles as unknown as { first_name: string; last_name: string } | null;

  const [{ data: progress }, { data: notes }] = await Promise.all([
    supabase
      .from("student_checklist_progress")
      .select("checklist_item_id,completed_at,signed_off_at,checklist_items(title)")
      .eq("student_id", studentId),
    supabase
      .from("user_notes")
      .select("id,title,body,created_at")
      .eq("owner_user_id", membership.userId)
      .eq("subject_user_id", studentId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <DashboardShell membership={membership} activeHref="/dashboard/students">
      <div className="approval-page-head"><span className="eyebrow">Student</span><h1>{profile?.first_name} {profile?.last_name}</h1></div>
      <div className="dashboard-grid">
        <article className="dash-card">
          <div className="card-heading"><h2>Checklist progress</h2></div>
          {!progress?.length && <p className="empty-note">No checklist activity yet.</p>}
          <div className="checklist-list">
            {(progress ?? []).map((item) => (
              <div className="checklist-row" key={item.checklist_item_id}>
                <span className={item.completed_at ? "status-dot done" : "status-dot"} />
                <div><strong>{(item.checklist_items as unknown as { title: string } | null)?.title}</strong></div>
                <span className="tag">{item.signed_off_at ? "Signed off" : item.completed_at ? "Completed" : "Pending"}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="dash-card">
          <div className="card-heading"><h2>My notes about {profile?.first_name}</h2></div>
          <NotesPanel subjectUserId={studentId} initialNotes={(notes ?? []) as never[]} />
        </article>
      </div>
    </DashboardShell>
  );
}
