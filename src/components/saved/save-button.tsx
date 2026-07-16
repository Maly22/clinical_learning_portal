"use client";
import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SaveButton({ url, title, kind = "link", initialSaved }: { url: string; title: string; kind?: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = `/sign-in?next=${encodeURIComponent(url)}`; return; }
    if (saved) {
      await supabase.from("saved_items").delete().eq("user_id", user.id).eq("url", url);
      setSaved(false);
    } else {
      await supabase.from("saved_items").insert({ user_id: user.id, url, title, kind });
      setSaved(true);
    }
    setBusy(false);
  }

  return (
    <button type="button" className={`save-button ${saved ? "saved" : ""}`} onClick={toggle} disabled={busy}>
      {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />} {saved ? "Saved" : "Save"}
    </button>
  );
}
