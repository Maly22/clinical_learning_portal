"use client";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StarRating } from "@/components/kudos/star-rating";

type Kudos = {
  id: string; message: string; rating: number; display_student_name: boolean; created_at: string; preceptor_name: string;
  student: { first_name: string; last_name: string } | null;
  location_departments: { departments: { name: string } | null } | null;
};

export function KudosQueue({ initialKudos }: { initialKudos: Kudos[] }) {
  const [items, setItems] = useState(initialKudos);
  const [error, setError] = useState("");

  async function review(id: string, approve: boolean) {
    setError("");
    const supabase = createClient();
    const { error } = await supabase.rpc("moderate_kudos", { kudos_id: id, approve, reason: null });
    if (error) { setError(error.message); return; }
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <section className="queue-card">
      {error && <div className="form-error">{error}</div>}
      {!items.length ? (
        <div className="queue-empty"><Check /> No pending kudos</div>
      ) : (
        items.map((item) => (
          <article className="queue-row kudos-queue-row" key={item.id}>
            <div>
              <strong>{item.display_student_name && item.student ? `${item.student.first_name} ${item.student.last_name}` : "Anonymous student"} → {item.preceptor_name}</strong>
              <span>{item.location_departments?.departments?.name}</span>
              <StarRating rating={item.rating} />
              <p>&ldquo;{item.message}&rdquo;</p>
            </div>
            <time>{new Date(item.created_at).toLocaleDateString()}</time>
            <button className="reject" onClick={() => review(item.id, false)} aria-label="Reject kudos"><X size={16} /></button>
            <button className="approve-button" onClick={() => review(item.id, true)} aria-label="Approve kudos"><Check size={16} /></button>
          </article>
        ))
      )}
    </section>
  );
}
