import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/data/dashboard";
import { DashboardShell } from "../dashboard-shell";
import { ChecklistReview } from "./checklist-review";

export default async function StudentChecklistsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/pending-approval");
  if (membership.role !== "preceptor") redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: students }, { data: items }] = await Promise.all([
    supabase.from("memberships").select("user_id,profiles!memberships_user_id_fkey(first_name,last_name)").eq("location_program_id", membership.locationProgramId).eq("role", "student").eq("is_active", true),
    supabase.from("checklist_items").select("id,title,requirement_type,sort_order,afsc_programs!inner(code)").eq("afsc_programs.code", membership.afscCode).order("sort_order"),
  ]);

  const studentIds = (students ?? []).map((student) => student.user_id);
  const { data: progress } = studentIds.length
    ? await supabase.from("student_checklist_progress").select("student_id,checklist_item_id,completed_at,signed_off_at").in("student_id", studentIds)
    : { data: [] };

  return (
    <DashboardShell membership={membership} activeHref="/dashboard/checklists">
      <div className="approval-page-head"><span className="eyebrow">Preceptor tools</span><h1>Student checklists</h1><p>Review progress and sign off completed items for students at {membership.locationName}.</p></div>
      {!students?.length && <p className="empty-note">No students at this location yet.</p>}
      <ChecklistReview
        students={(students ?? []).map((student) => ({ id: student.user_id, name: `${(student.profiles as unknown as { first_name: string; last_name: string } | null)?.first_name ?? ""} ${(student.profiles as unknown as { first_name: string; last_name: string } | null)?.last_name ?? ""}`.trim() }))}
        items={(items ?? []) as never[]}
        progress={(progress ?? []) as never[]}
      />
    </DashboardShell>
  );
}
