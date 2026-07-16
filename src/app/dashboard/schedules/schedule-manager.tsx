"use client";
import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Cohort = { id: string; name: string; starts_on: string; ends_on: string };
type Student = { id: string; name: string };
type Enrollment = { id: string; student_id: string; cohort_id: string };
type ScheduleDocument = { id: string; title: string; cohort_id: string | null; student_id: string | null; file_name: string; uploaded_at: string };

export function ScheduleManager({ locationProgramId, cohorts: initialCohorts, students, enrollments: initialEnrollments, documents: initialDocuments }: {
  locationProgramId: string; cohorts: Cohort[]; students: Student[]; enrollments: Enrollment[]; documents: ScheduleDocument[];
}) {
  const [cohorts, setCohorts] = useState(initialCohorts);
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [documents, setDocuments] = useState(initialDocuments);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [target, setTarget] = useState<"cohort" | "student">("cohort");
  const [selectedCohortId, setSelectedCohortId] = useState("");

  const studentName = (id: string) => students.find((student) => student.id === id)?.name ?? "Unknown";

  async function createCohort(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("cohorts")
      .insert({ location_program_id: locationProgramId, name: String(form.get("name")), starts_on: String(form.get("starts_on")), ends_on: String(form.get("ends_on")) })
      .select("id,name,starts_on,ends_on")
      .single();
    if (insertError) { setError(insertError.message); return; }
    setCohorts((current) => [data, ...current]);
    formEl.reset();
  }

  async function enroll(cohortId: string, studentId: string) {
    if (!studentId) return;
    setError("");
    const supabase = createClient();
    const { data, error: insertError } = await supabase.from("cohort_enrollments").insert({ cohort_id: cohortId, student_id: studentId }).select("id,student_id,cohort_id").single();
    if (insertError) { setError(insertError.message); return; }
    setEnrollments((current) => [...current, data]);
  }

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setUploading(true);
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    form.set("location_program_id", locationProgramId);
    try {
      const response = await fetch("/api/schedules/upload", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Upload failed");
      setDocuments((current) => [{ id: crypto.randomUUID(), title: String(form.get("title")), cohort_id: form.get("cohort_id") ? String(form.get("cohort_id")) : null, student_id: form.get("student_id") ? String(form.get("student_id")) : null, file_name: (form.get("file") as File).name, uploaded_at: new Date().toISOString() }, ...current]);
      formEl.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="schedule-manager">
      {error && <div className="form-error">{error}</div>}

      <section className="dash-card">
        <div className="card-heading"><h2>Classes</h2></div>
        <form className="inline-form" onSubmit={createCohort}>
          <input name="name" placeholder="Class name" required />
          <input name="starts_on" type="date" required />
          <input name="ends_on" type="date" required />
          <button className="button small"><Plus size={14} /> Create class</button>
        </form>
        <div className="cohort-list">
          {cohorts.map((cohort) => {
            const roster = enrollments.filter((enrollment) => enrollment.cohort_id === cohort.id);
            const unenrolled = students.filter((student) => !roster.some((row) => row.student_id === student.id));
            return (
              <article className="cohort-card" key={cohort.id}>
                <header><strong>{cohort.name}</strong><span>{cohort.starts_on} – {cohort.ends_on}</span></header>
                <ul>{roster.map((row) => <li key={row.id}>{studentName(row.student_id)}</li>)}{!roster.length && <li className="empty-note">No students enrolled yet</li>}</ul>
                {Boolean(unenrolled.length) && (
                  <form className="inline-form" onSubmit={(event) => { event.preventDefault(); const select = event.currentTarget.elements.namedItem("student_id") as HTMLSelectElement; enroll(cohort.id, select.value); select.value = ""; }}>
                    <select name="student_id" defaultValue="" required>
                      <option value="" disabled>Add a student…</option>
                      {unenrolled.map((student) => <option value={student.id} key={student.id}>{student.name}</option>)}
                    </select>
                    <button className="button small">Add</button>
                  </form>
                )}
              </article>
            );
          })}
          {!cohorts.length && <p className="empty-note">No classes yet.</p>}
        </div>
      </section>

      <section className="dash-card">
        <div className="card-heading"><h2>Upload a schedule</h2></div>
        <form className="auth-form" onSubmit={upload}>
          <div className="form-options">
            <label><input type="radio" name="target" checked={target === "cohort"} onChange={() => setTarget("cohort")} /> Whole class</label>
            <label><input type="radio" name="target" checked={target === "student"} onChange={() => setTarget("student")} /> Individual student</label>
          </div>
          {target === "cohort" ? (
            cohorts.length ? (
              <label className="field">
                <span>Class</span>
                <select name="cohort_id" required defaultValue="" onChange={(event) => setSelectedCohortId(event.target.value)}>
                  <option value="" disabled>Select a class</option>
                  {cohorts.map((cohort) => <option value={cohort.id} key={cohort.id}>{cohort.name}</option>)}
                </select>
                {selectedCohortId && (
                  <span className="cohort-roster-hint">
                    {enrollments.filter((enrollment) => enrollment.cohort_id === selectedCohortId).length} student(s) enrolled: {enrollments.filter((enrollment) => enrollment.cohort_id === selectedCohortId).map((enrollment) => studentName(enrollment.student_id)).join(", ") || "none yet"}
                  </span>
                )}
              </label>
            ) : (
              <p className="empty-note">No classes yet — create one above before uploading a schedule for a class.</p>
            )
          ) : (
            <label className="field"><span>Student</span><select name="student_id" required defaultValue=""><option value="" disabled>Select a student</option>{students.map((student) => <option value={student.id} key={student.id}>{student.name}</option>)}</select></label>
          )}
          <label className="field"><span>Title</span><input name="title" required placeholder="e.g. Week 3–4 rotation schedule" /></label>
          <label className="field"><span>File</span><input name="file" type="file" required /></label>
          <button className="button auth-submit" disabled={uploading}>{uploading ? "Uploading…" : "Upload schedule"}</button>
        </form>
      </section>

      <section className="dash-card">
        <div className="card-heading"><h2>Uploaded schedules</h2></div>
        <div className="table-row table-head"><span>Title</span><span>Assigned to</span><span>File</span><span /></div>
        {documents.map((document) => (
          <div className="table-row" key={document.id}>
            <span>{document.title}</span>
            <span>{document.cohort_id ? cohorts.find((cohort) => cohort.id === document.cohort_id)?.name : studentName(document.student_id ?? "")}</span>
            <span>{document.file_name}</span>
            <a className="table-view" href={`/api/schedules/${document.id}/download`}><Download size={14} /> Download</a>
          </div>
        ))}
        {!documents.length && <div className="queue-empty">No schedules uploaded yet</div>}
      </section>
    </div>
  );
}
