import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/data/dashboard";
import { NotesPanel } from "@/components/notes/notes-panel";
import { DashboardShell } from "../dashboard-shell";

export default async function NotesPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/pending-approval");

  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("user_notes")
    .select("id,title,body,created_at")
    .eq("owner_user_id", membership.userId)
    .is("subject_user_id", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <DashboardShell membership={membership} activeHref="/dashboard/notes">
      <div className="approval-page-head"><span className="eyebrow">Private</span><h1>My notes</h1><p>Only visible to you.</p></div>
      <div className="dash-card"><NotesPanel initialNotes={(notes ?? []) as never[]} /></div>
    </DashboardShell>
  );
}
