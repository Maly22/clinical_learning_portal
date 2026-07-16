"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Item = {
  id: string; title: string; description: string | null; requirement_type: string;
  eligible_departments: string | null; skill_group: string | null;
  learning_resources: { title: string; resource_url: string; resource_type: string } | null;
};

const RESOURCE_CATEGORY_LABELS: Record<string, string> = {
  "clinical-reference": "Clinical Reference",
  "anatomy-procedures": "Anatomy & Procedures",
  "study-flashcards": "Study & Flashcards",
};
const RESOURCE_CATEGORY_ORDER = ["clinical-reference", "anatomy-procedures", "study-flashcards"];

function ChecklistRow({ item, completed, pending, interactive, toggle }: { item: Item; completed: boolean; pending: boolean; interactive: boolean; toggle: (id: string) => void }) {
  return (
    <label className={`checklist-row ${completed ? "done" : ""}`}>
      <input type="checkbox" checked={completed} disabled={!interactive || pending} onChange={() => toggle(item.id)} />
      <div>
        <strong>{item.title}</strong>
        {item.description && <p>{item.description}</p>}
        {item.eligible_departments && <p className="skill-departments">Sign off in: {item.eligible_departments}</p>}
        {item.learning_resources && <a href={item.learning_resources.resource_url} target="_blank" rel="noreferrer">{item.learning_resources.title}</a>}
      </div>
      <span className={`tag req-${item.requirement_type}`}>{item.requirement_type}</span>
    </label>
  );
}

export function ChecklistClient({ items, initialCompletedIds, interactive }: { items: Item[]; initialCompletedIds: string[]; interactive: boolean }) {
  const [completed, setCompleted] = useState(new Set(initialCompletedIds));
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(itemId: string) {
    if (!interactive || pending) return;
    setPending(itemId);
    const supabase = createClient();
    const nowCompleted = !completed.has(itemId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPending(null); return; }
    await supabase.from("student_checklist_progress").upsert({ student_id: user.id, checklist_item_id: itemId, completed_at: nowCompleted ? new Date().toISOString() : null });
    setCompleted((current) => { const next = new Set(current); if (nowCompleted) next.add(itemId); else next.delete(itemId); return next; });
    setPending(null);
  }

  const resourceItems = items.filter((item) => !item.skill_group);
  const skillItems = items.filter((item) => item.skill_group);
  const skillGroups = [...new Set(skillItems.map((item) => item.skill_group))] as string[];

  return (
    <div className="checklist-groups">
      {RESOURCE_CATEGORY_ORDER.map((category) => {
        const categoryItems = resourceItems.filter((item) => item.learning_resources?.resource_type === category);
        if (!categoryItems.length) return null;
        return (
          <div className="checklist-category" key={category}>
            <h3>{RESOURCE_CATEGORY_LABELS[category] ?? category}</h3>
            <div className="checklist-list">
              {categoryItems.map((item) => <ChecklistRow item={item} completed={completed.has(item.id)} pending={pending === item.id} interactive={interactive} toggle={toggle} key={item.id} />)}
            </div>
          </div>
        );
      })}
      {skillGroups.map((group) => (
        <div className="checklist-category" key={group}>
          <h3>{group}</h3>
          <div className="checklist-list">
            {skillItems.filter((item) => item.skill_group === group).map((item) => <ChecklistRow item={item} completed={completed.has(item.id)} pending={pending === item.id} interactive={interactive} toggle={toggle} key={item.id} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
