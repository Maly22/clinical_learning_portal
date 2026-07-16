"use client";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Item = { id: string; title: string; requirement_type: string };
type Progress = { student_id: string; checklist_item_id: string; completed_at: string | null; signed_off_at: string | null };

export function ChecklistReview({ students, items, progress: initialProgress }: { students: { id: string; name: string }[]; items: Item[]; progress: Progress[] }) {
  const [progress, setProgress] = useState(initialProgress);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function signOff(studentId: string, checklistItemId: string) {
    const key = `${studentId}:${checklistItemId}`;
    setBusyKey(key);
    setError("");
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("sign_off_checklist_item", { p_student_id: studentId, p_checklist_item_id: checklistItemId });
    if (rpcError) { setError(rpcError.message); setBusyKey(null); return; }
    setProgress((current) => {
      const next = current.filter((row) => !(row.student_id === studentId && row.checklist_item_id === checklistItemId));
      next.push({ student_id: studentId, checklist_item_id: checklistItemId, completed_at: new Date().toISOString(), signed_off_at: new Date().toISOString() });
      return next;
    });
    setBusyKey(null);
  }

  return (
    <div className="checklist-review">
      {error && <div className="form-error">{error}</div>}
      {students.map((student) => (
        <details className="faq-item checklist-student" key={student.id}>
          <summary>{student.name}</summary>
          <div className="checklist-list">
            {items.map((item) => {
              const row = progress.find((entry) => entry.student_id === student.id && entry.checklist_item_id === item.id);
              const key = `${student.id}:${item.id}`;
              return (
                <div className="checklist-row" key={item.id}>
                  <span className={row?.completed_at ? "status-dot done" : "status-dot"} />
                  <div><strong>{item.title}</strong></div>
                  {row?.signed_off_at ? (
                    <span className="tag">Signed off</span>
                  ) : (
                    <button className="button small" disabled={busyKey === key} onClick={() => signOff(student.id, item.id)}><CheckCircle2 size={13} /> {busyKey === key ? "Saving…" : "Sign off"}</button>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}
