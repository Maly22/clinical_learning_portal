import { notFound } from "next/navigation";
import { getChecklist, getLocationBySlug } from "@/lib/data/locations";
import { createClient } from "@/lib/supabase/server";
import { ChecklistClient } from "./checklist-client";
import { SaveButton } from "@/components/saved/save-button";
import { isUrlSaved } from "@/lib/data/saved";

export default async function ChecklistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getLocationBySlug(slug);
  if (!result) notFound();
  const afscCode = result.program?.afsc_programs?.code ?? "4N0";
  const items = await getChecklist(afscCode);
  const pageUrl = `/locations/${slug}/checklist`;
  const saved = await isUrlSaved(pageUrl);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let completedIds: string[] = [];
  if (user) {
    const { data: progress } = await supabase.from("student_checklist_progress").select("checklist_item_id").eq("student_id", user.id).not("completed_at", "is", null);
    completedIds = (progress ?? []).map((row) => row.checklist_item_id);
  }

  return (
    <section className="section">
      <div className="section-heading"><div><span className="kicker">Interactive checklist</span><h2>Track your readiness at {result.location.short_name}</h2></div><div className="page-actions">{!user && <p>Sign in to check off items and save your progress.</p>}<SaveButton url={pageUrl} title={`Checklist · ${result.location.short_name}`} kind="checklist" initialSaved={saved} /></div></div>
      <p className="checklist-intro">This interactive checklist is designed for Phase II students to maximize their learning, explore free medical resources, and build confidence across all departments. Each tool helps you strengthen your clinical knowledge, practice procedures, and take advantage of every opportunity during your training. Use the checklist to track your progress, stay organized, and continue growing as a future Air Force medic.</p>
      {!items.length && <p className="empty-note">Checklist items are coming soon.</p>}
      <ChecklistClient items={items} initialCompletedIds={completedIds} interactive={Boolean(user)} />
    </section>
  );
}
