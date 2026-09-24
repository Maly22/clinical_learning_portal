"use client";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquareHeart, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const RATINGS = [1, 2, 3, 4, 5];

export function FeedbackButton({ className = "feedback-trigger" }: { className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const [rating, setRating] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function open() {
    setError("");
    dialogRef.current?.showModal();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rating) return setError("Please pick a rating from 1 to 5.");
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      // No .select() after insert: feedback isn't readable by the submitter.
      const { error: insertError } = await supabase.from("portal_feedback").insert({
        user_id: user?.id ?? null,
        rating,
        improvement: String(form.get("improvement") || "").trim() || null,
        role: String(form.get("role") || "") || null,
        page_path: pathname,
      });
      if (insertError) throw insertError;
      setDone(true);
    } catch {
      setError("Sorry, we couldn't send your feedback. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={open}><MessageSquareHeart size={15} /> Help us improve this portal</button>
      <dialog ref={dialogRef} className="feedback-dialog" onClose={() => { if (done) { setDone(false); setRating(0); } }}>
        <button type="button" className="feedback-close" aria-label="Close" onClick={() => dialogRef.current?.close()}><X size={18} /></button>
        {done ? (
          <div className="feedback-thanks">
            <MessageSquareHeart size={28} />
            <h2>Thank you!</h2>
            <p>Your feedback helps us make PhasePrep better for every Phase II class.</p>
            <button type="button" className="button" onClick={() => dialogRef.current?.close()}>Close</button>
          </div>
        ) : (
          <form className="auth-form feedback-form" onSubmit={submit}>
            <span className="kicker">Quick survey · 3 questions</span>
            <h2>Help us improve this portal</h2>

            <fieldset className="field">
              <legend>How helpful is this portal for you?</legend>
              <div className="feedback-scale" role="radiogroup">
                {RATINGS.map((value) => (
                  <button type="button" key={value} role="radio" aria-checked={rating === value} className={rating === value ? "active" : ""} onClick={() => setRating(value)}>{value}</button>
                ))}
              </div>
              <div className="feedback-scale-labels"><span>Not helpful</span><span>Very helpful</span></div>
            </fieldset>

            <label className="field"><span>What&apos;s one thing we could improve? <small>(optional)</small></span>
              <textarea name="improvement" rows={3} maxLength={2000} placeholder="Missing content, confusing pages, ideas…" />
            </label>

            <label className="field"><span>I am a… <small>(optional)</small></span>
              <select name="role" defaultValue="">
                <option value="">Prefer not to say</option>
                <option value="student">Student</option>
                <option value="preceptor">Preceptor</option>
                <option value="supervisor">Supervisor</option>
                <option value="other">Other</option>
              </select>
            </label>

            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button auth-submit" disabled={busy}>{busy ? "Sending…" : "Send feedback"}</button>
          </form>
        )}
      </dialog>
    </>
  );
}
