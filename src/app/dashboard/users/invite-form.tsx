"use client";
import { useState } from "react";
import { Send } from "lucide-react";

export function InviteForm({ locationName }: { locationName: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email") || "").trim();
    setBusy(true);
    setError("");
    setSent("");
    try {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName: String(form.get("first_name") || ""), role: String(form.get("role")) }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to send the invite.");
      setSent(email);
      formElement.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send the invite.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="dash-card invite-card">
      <div className="card-heading"><h2>Invite someone</h2></div>
      <p className="invite-hint">They’ll get an email with a sign-up link for {locationName || "your location"}. Once they sign up, approve them in Pending Users. A personal email is more reliable — military email filters often block messages with links.</p>
      <form className="inline-form" onSubmit={submit}>
        <input name="first_name" placeholder="First name (optional)" autoComplete="off" />
        <input name="email" type="email" inputMode="email" placeholder="Email address" required />
        <select name="role" defaultValue="student" aria-label="Role">
          <option value="student">Student</option>
          <option value="preceptor">Preceptor</option>
          <option value="supervisor">Supervisor</option>
        </select>
        <button className="button small" disabled={busy}><Send size={14} /> {busy ? "Sending…" : "Send invite"}</button>
      </form>
      {sent && <div className="form-success" role="status">Invite sent to {sent}.</div>}
      {error && <div className="form-error" role="alert">{error}</div>}
    </section>
  );
}
