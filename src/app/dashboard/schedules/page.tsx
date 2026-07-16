import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/data/dashboard";
import { DashboardShell } from "../dashboard-shell";
import { ScheduleManager } from "./schedule-manager";

export default async function AssignSchedulesPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/pending-approval");
  if (membership.role !== "supervisor" && membership.role !== "platform_admin") redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: cohorts }, { data: students }, { data: enrollments }, { data: documents }] = await Promise.all([
    supabase.from("cohorts").select("id,name,starts_on,ends_on").eq("location_program_id", membership.locationProgramId).order("starts_on", { ascending: false }),
    supabase.from("memberships").select("user_id,profiles!memberships_user_id_fkey(first_name,last_name)").eq("location_program_id", membership.locationProgramId).eq("role", "student").eq("is_active", true),
    supabase.from("cohort_enrollments").select("id,student_id,cohort_id"),
    supabase.from("schedule_documents").select("id,title,cohort_id,student_id,file_name,uploaded_at").eq("location_program_id", membership.locationProgramId).eq("is_active", true).order("uploaded_at", { ascending: false }),
  ]);

  return (
    <DashboardShell membership={membership} activeHref="/dashboard/schedules">
      <div className="approval-page-head"><span className="eyebrow">Supervisor tools</span><h1>Assign schedules</h1><p>Create classes, enroll students, and upload the clinical schedule they should see.</p></div>
      <ScheduleManager
        locationProgramId={membership.locationProgramId}
        cohorts={(cohorts ?? []) as never[]}
        students={(students ?? []).map((student) => ({ id: student.user_id, name: `${(student.profiles as unknown as { first_name: string; last_name: string } | null)?.first_name ?? ""} ${(student.profiles as unknown as { first_name: string; last_name: string } | null)?.last_name ?? ""}`.trim() }))}
        enrollments={(enrollments ?? []) as never[]}
        documents={(documents ?? []) as never[]}
      />
    </DashboardShell>
  );
}
