import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/data/dashboard";
import { DashboardShell } from "../dashboard-shell";

export default async function StudentSchedulePage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/pending-approval");
  if (membership.role !== "student") redirect("/dashboard");

  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("schedule_documents")
    .select("id,title,file_name,uploaded_at")
    .order("uploaded_at", { ascending: false });

  return (
    <DashboardShell membership={membership} activeHref="/dashboard/schedule">
      <div className="approval-page-head"><span className="eyebrow">Clinical schedule</span><h1>My schedule</h1><p>Uploaded by your Phase II supervisor. View and download only — these files can&apos;t be edited.</p></div>
      {!documents?.length && <p className="empty-note">No schedule has been uploaded for you yet.</p>}
      <div className="cohort-list">
        {(documents ?? []).map((document) => (
          <article className="cohort-card" key={document.id}>
            <header><strong>{document.title}</strong><span>{document.file_name} · {new Date(document.uploaded_at).toLocaleDateString()}</span></header>
            <a className="button small" href={`/api/schedules/${document.id}/download`}><Download size={14} /> Download</a>
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}
