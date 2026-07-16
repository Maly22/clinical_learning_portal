"use client";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Request = {
  id: string; requested_role: string; created_at: string; email: string | null;
  profiles: { first_name: string; last_name: string } | null;
  location_programs: { locations: { short_name: string } | null; afsc_programs: { code: string } | null } | null;
};

export function ApprovalQueue({ initialRequests }: { initialRequests: Request[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [error, setError] = useState("");

  async function review(id: string, approve: boolean) {
    setError("");
    const supabase = createClient();
    const { error } = await supabase.rpc("approve_role_request", { request_id: id, approve, notes: null });
    if (error) { setError(error.message); return; }
    fetch("/api/role-requests/notify-decision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: id, approved: approve }) }).catch(() => {});
    setRequests((items) => items.filter((item) => item.id !== id));
  }

  return (
    <section className="queue-card">
      {error && <div className="form-error">{error}</div>}
      {!requests.length ? (
        <div className="queue-empty"><Check /> No pending role requests</div>
      ) : (
        requests.map((request) => (
          <article className="queue-row" key={request.id}>
            <div className="avatar">{request.profiles?.first_name?.[0]}{request.profiles?.last_name?.[0]}</div>
            <div>
              <strong>{request.profiles?.first_name} {request.profiles?.last_name}</strong>
              <span className="request-meta">{request.email ?? "—"} · {request.location_programs?.locations?.short_name} · {request.location_programs?.afsc_programs?.code} · {request.requested_role}</span>
            </div>
            <time>{new Date(request.created_at).toLocaleDateString()}</time>
            <button className="reject" onClick={() => review(request.id, false)} aria-label="Reject request"><X size={16} /></button>
            <button className="approve-button" onClick={() => review(request.id, true)} aria-label="Approve request"><Check size={16} /></button>
          </article>
        ))
      )}
    </section>
  );
}
