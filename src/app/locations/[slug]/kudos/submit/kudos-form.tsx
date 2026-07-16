"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Department = { id: string; name: string };

export function KudosForm({ departments, defaultDepartmentId }: { departments: Department[]; defaultDepartmentId?: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in to submit kudos.");

      const { data, error: insertError } = await supabase
        .from("kudos")
        .insert({
          student_id: user.id,
          preceptor_name: String(form.get("preceptor_name")).trim(),
          location_department_id: String(form.get("location_department_id")),
          rating: Number(form.get("rating")),
          shift_date: form.get("shift_date") ? String(form.get("shift_date")) : null,
          message: String(form.get("message")),
          display_student_name: form.get("anonymous") !== "on",
          status: "pending",
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      await fetch("/api/kudos/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kudosId: data.id }) }).catch(() => {});
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit kudos");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <div className="form-success">Thank you! Your kudos has been submitted for review.</div>;

  return (
    <form className="auth-form kudos-submit-form" onSubmit={submit}>
      <label className="field"><span>Preceptor name</span>
        <input name="preceptor_name" required placeholder="e.g. MSgt Maya Chen" maxLength={120} />
      </label>
      <label className="field"><span>Department</span>
        <select name="location_department_id" required defaultValue={defaultDepartmentId ?? ""}>
          <option value="" disabled>Select a department</option>
          {departments.map((department) => <option value={department.id} key={department.id}>{department.name}</option>)}
        </select>
      </label>
      <label className="field"><span>Rating</span>
        <select name="rating" required defaultValue="">
          <option value="" disabled>Select a rating</option>
          {[5, 4, 3, 2, 1].map((value) => <option value={value} key={value}>{value} star{value > 1 ? "s" : ""}</option>)}
        </select>
      </label>
      <label className="field"><span>Date of shift</span>
        <input name="shift_date" type="date" max={new Date().toISOString().slice(0, 10)} />
      </label>
      <label className="field"><span>Message of appreciation</span>
        <textarea name="message" rows={4} minLength={10} maxLength={2000} required />
      </label>
      <label className="form-options"><input type="checkbox" name="anonymous" /> Submit anonymously</label>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="button auth-submit" disabled={busy}>{busy ? "Submitting…" : "Submit kudos"}</button>
    </form>
  );
}
