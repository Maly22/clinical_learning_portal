import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/data/dashboard";
import { StarRating } from "@/components/kudos/star-rating";
import { DashboardShell } from "../dashboard-shell";
import { KudosQueue } from "./kudos-queue";

export default async function DashboardKudosPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/pending-approval");
  if (membership.role === "student") redirect("/dashboard");

  const supabase = await createClient();

  if (membership.role === "supervisor" || membership.role === "platform_admin") {
    const { data: locationDepartments } = await supabase.from("location_departments").select("id").eq("location_program_id", membership.locationProgramId);
    const departmentIds = (locationDepartments ?? []).map((item) => item.id);

    const { data: kudos } = departmentIds.length
      ? await supabase
          .from("kudos")
          .select("id,message,rating,display_student_name,created_at,preceptor_name,student_name,student:profiles!kudos_student_id_fkey(first_name,last_name),location_departments(departments(name))")
          .in("location_department_id", departmentIds)
          .eq("status", "pending")
          .order("created_at")
      : { data: [] };

    return (
      <DashboardShell membership={membership} activeHref="/dashboard/kudos">
        <div className="approval-page-head"><span className="eyebrow">Supervisor tools</span><h1>Kudos review queue</h1><p>Approve or reject student-submitted recognition before it&apos;s published to the department gallery.</p></div>
        <KudosQueue initialKudos={(kudos ?? []) as never[]} />
      </DashboardShell>
    );
  }

  const { data: received } = await supabase
    .from("kudos")
    .select("id,message,rating,display_student_name,published_at,preceptor_name,student_name,student:profiles!kudos_student_id_fkey(first_name,last_name),location_departments(departments(name))")
    .eq("preceptor_id", membership.userId)
    .eq("status", "approved")
    .order("published_at", { ascending: false });

  return (
    <DashboardShell membership={membership} activeHref="/dashboard/kudos">
      <div className="approval-page-head"><span className="eyebrow">Recognition</span><h1>Kudos received</h1><p>Approved feedback students have submitted about you.</p></div>
      {!received?.length && <p className="empty-note">No approved kudos yet.</p>}
      <div className="kudos-cards">
        {(received ?? []).map((item) => {
          const student = item.student as unknown as { first_name: string; last_name: string } | null;
          const department = (item.location_departments as unknown as { departments: { name: string } | null } | null)?.departments;
          return (
            <article className="kudos-card" key={item.id}>
              <StarRating rating={item.rating} />
              <p>&ldquo;{item.message}&rdquo;</p>
              <span>— {item.display_student_name && (student ? `${student.first_name} ${student.last_name}` : item.student_name) || "Anonymous student"} · {department?.name}</span>
            </article>
          );
        })}
      </div>
    </DashboardShell>
  );
}
