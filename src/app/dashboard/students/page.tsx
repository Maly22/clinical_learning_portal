import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/data/dashboard";
import { DashboardShell } from "../dashboard-shell";

export default async function StudentListPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/pending-approval");
  if (membership.role !== "supervisor" && membership.role !== "platform_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: students } = await supabase
    .from("memberships")
    .select("user_id,profiles!memberships_user_id_fkey(first_name,last_name)")
    .eq("location_program_id", membership.locationProgramId)
    .eq("role", "student")
    .eq("is_active", true);

  const studentIds = (students ?? []).map((student) => student.user_id);

  const [{ data: enrollments }, { data: schedules }, { data: notes }] = await Promise.all([
    studentIds.length
      ? supabase.from("cohort_enrollments").select("student_id,cohort_id,cohorts(name)").in("student_id", studentIds)
      : Promise.resolve({ data: [] }),
    studentIds.length
      ? supabase.from("schedule_documents").select("student_id,cohort_id").eq("is_active", true)
      : Promise.resolve({ data: [] }),
    studentIds.length
      ? supabase.from("user_notes").select("subject_user_id").eq("owner_user_id", membership.userId).in("subject_user_id", studentIds).is("archived_at", null)
      : Promise.resolve({ data: [] }),
  ]);

  const classByStudent = new Map((enrollments ?? []).map((row) => [row.student_id, (row.cohorts as unknown as { name: string } | null)?.name]));
  const cohortIdByStudent = new Map((enrollments ?? []).map((row) => [row.student_id, row.cohort_id]));
  const cohortIdsWithSchedule = new Set((schedules ?? []).filter((row) => row.cohort_id).map((row) => row.cohort_id));
  const studentIdsWithDirectSchedule = new Set((schedules ?? []).filter((row) => row.student_id).map((row) => row.student_id));
  const noteCountByStudent = new Map<string, number>();
  for (const note of notes ?? []) noteCountByStudent.set(note.subject_user_id, (noteCountByStudent.get(note.subject_user_id) ?? 0) + 1);

  return (
    <DashboardShell membership={membership} activeHref="/dashboard/students">
      <div className="approval-page-head"><span className="eyebrow">Supervisor tools</span><h1>Student list</h1><p>Class assignment, schedule, and note status for every student at {membership.locationName}.</p></div>
      <section className="queue-card manage-users-table student-list-table">
        <div className="table-row table-head"><span>Student</span><span>Class</span><span>Schedule</span><span>Notes</span><span /></div>
        {(students ?? []).map((student) => {
          const profile = student.profiles as unknown as { first_name: string; last_name: string } | null;
          const cohortName = classByStudent.get(student.user_id);
          const studentCohortId = cohortIdByStudent.get(student.user_id);
          const hasSchedule = studentIdsWithDirectSchedule.has(student.user_id) || (studentCohortId != null && cohortIdsWithSchedule.has(studentCohortId));
          return (
            <div className="table-row" key={student.user_id}>
              <span>{profile?.first_name} {profile?.last_name}</span>
              <span>{cohortName ?? "Unassigned"}</span>
              <span>{hasSchedule ? "Uploaded" : "None yet"}</span>
              <span>{noteCountByStudent.get(student.user_id) ?? 0}</span>
              <Link href={`/dashboard/students/${student.user_id}`} className="table-view"><Eye size={15} /> View</Link>
            </div>
          );
        })}
        {!students?.length && <div className="queue-empty">No students yet</div>}
      </section>
    </DashboardShell>
  );
}
