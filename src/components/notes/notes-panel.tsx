"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Note = { id: string; title: string; body: string; created_at: string };

export function NotesPanel({ initialNotes, subjectUserId }: { initialNotes: Note[]; subjectUserId?: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    // React nulls out event.currentTarget once the handler yields past its first
    // await, so the form element must be captured synchronously up front rather than
    // read again after the request resolves.
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");
      const { data, error: insertError } = await supabase
        .from("user_notes")
        .insert({ owner_user_id: user.id, subject_user_id: subjectUserId ?? null, title: String(form.get("title")), body: String(form.get("body")) })
        .select("id,title,body,created_at")
        .single();
      if (insertError) throw insertError;
      setNotes((current) => [data, ...current]);
      formEl.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save note");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("user_notes").update({ archived_at: new Date().toISOString() }).eq("id", id);
    setNotes((current) => current.filter((note) => note.id !== id));
  }

  return (
    <div className="notes-panel">
      <form className="notes-form" onSubmit={submit}>
        <input name="title" placeholder="Title" required maxLength={120} />
        <textarea name="body" placeholder="Note details…" rows={3} required />
        {error && <div className="form-error">{error}</div>}
        <button className="button small" disabled={busy}>{busy ? "Saving…" : "Save note"}</button>
      </form>
      <div className="notes-list">
        {!notes.length && <p className="empty-note">No notes yet.</p>}
        {notes.map((note) => (
          <article className="note-card" key={note.id}>
            <div><strong>{note.title}</strong><p>{note.body}</p><time>{new Date(note.created_at).toLocaleString()}</time></div>
            <button type="button" onClick={() => remove(note.id)} aria-label="Delete note"><Trash2 size={14} /></button>
          </article>
        ))}
      </div>
    </div>
  );
}
