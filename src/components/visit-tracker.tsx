"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** A random id per browser so visits can be counted as unique visitors — not linked to any account. */
function visitorId() {
  try {
    const existing = localStorage.getItem("pp_visitor");
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem("pp_visitor", id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** Records one anonymous page view per route change for Dashboard → Visitors. */
export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || process.env.NODE_ENV !== "production") return;
    createClient()
      .from("page_views")
      .insert({ path: pathname.slice(0, 300), visitor_id: visitorId(), is_mobile: window.matchMedia("(max-width: 700px)").matches })
      .then(() => {}, () => {});
  }, [pathname]);

  return null;
}
