"use client";
import Link from "next/link";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SavedItem = { id: string; url: string; title: string; kind: string };

export function SavedList({ initialItems }: { initialItems: SavedItem[] }) {
  const [items, setItems] = useState(initialItems);

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("saved_items").delete().eq("id", id);
    setItems((current) => current.filter((item) => item.id !== id));
  }

  if (!items.length) return <p className="empty-note">Nothing saved yet. Use the Save button on any department, checklist, or handbook page.</p>;

  return (
    <div className="saved-list">
      {items.map((item) => (
        <div className="saved-row" key={item.id}>
          <Link href={item.url}>{item.title}</Link>
          <span className="tag">{item.kind}</span>
          <button type="button" onClick={() => remove(item.id)} aria-label="Remove saved item"><Trash2 size={14} /></button>
        </div>
      ))}
    </div>
  );
}
