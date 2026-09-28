"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export type TourStep = {
  /** A `data-tour` value to highlight; omit for a centered step (welcome/finish). */
  target?: string;
  title: string;
  body: string;
};

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 6;
const POPUP_W = 320;

/** Really on screen: has a size and isn't inside a closed menu (browsers still report sizes for those). */
const isVisible = (el: Element) => {
  if (el.closest("details:not([open]) > :not(summary)")) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

/** The phone "More" menu, if it's on screen (it isn't on computers). */
function moreMenu() {
  const menu = document.querySelector<HTMLDetailsElement>("details.mobile-more");
  const summary = menu?.querySelector("summary");
  return menu && summary && isVisible(summary) ? menu : null;
}

/**
 * The first *visible* element for a target — the sidebar on computers, the bottom bar on phones.
 * On phones, pages that don't fit in the bottom bar live under "More": the tour opens that menu
 * so it can point at the real item inside it.
 */
function findTarget(target: string): { el: HTMLElement; viaMore: boolean } | null {
  const selector = `[data-tour="${CSS.escape(target)}"]`;
  const match = [...document.querySelectorAll<HTMLElement>(selector)].find(isVisible);
  if (match) return { el: match, viaMore: !!match.closest(".mobile-more-sheet") };
  const menu = moreMenu();
  if (!menu) return null;
  menu.open = true;
  const inside = [...menu.querySelectorAll<HTMLElement>(selector)].find(isVisible);
  return inside ? { el: inside, viaMore: true } : { el: menu.querySelector("summary") as HTMLElement, viaMore: true };
}

/** Closes the More menu unless the current step needs it. */
function closeMoreMenu() {
  const menu = document.querySelector<HTMLDetailsElement>("details.mobile-more");
  if (menu) menu.open = false;
}

export function GuidedTour({ steps, storageKey }: { steps: TourStep[]; storageKey: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viaMore, setViaMore] = useState(false);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [popupH, setPopupH] = useState(230);
  const popupRef = useRef<HTMLDivElement | null>(null);

  // Track the pop-up's real height so it can be placed fully on screen.
  useEffect(() => {
    const node = popupRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setPopupH(node.offsetHeight));
    observer.observe(node);
    return () => observer.disconnect();
  }, [index]);

  // Start automatically on first visit, or when the page is opened with ?tour=1.
  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("tour") === "1";
    let seen = false;
    try { seen = localStorage.getItem(storageKey) === "done"; } catch { /* private mode */ }
    // Wait a moment so the dashboard has laid out before the first highlight.
    const auto = forced || !seen ? window.setTimeout(() => setIndex(0), 400) : undefined;
    const start = () => setIndex(0);
    window.addEventListener("start-guided-tour", start);
    return () => { window.clearTimeout(auto); window.removeEventListener("start-guided-tour", start); };
  }, [storageKey]);

  const finish = useCallback(() => {
    setIndex(null);
    closeMoreMenu();
    try { localStorage.setItem(storageKey, "done"); } catch { /* ignore */ }
    if (new URLSearchParams(window.location.search).get("tour") === "1") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [storageKey]);

  const measure = useCallback(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight });
    const step = index === null ? null : steps[index];
    if (!step?.target) { setRect(null); setViaMore(false); return; }
    const found = findTarget(step.target);
    if (!found) { setRect(null); setViaMore(false); return; }
    const r = found.el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
    setViaMore(found.viaMore);
  }, [index, steps]);

  useLayoutEffect(() => {
    if (index === null) return;
    const step = steps[index];
    closeMoreMenu(); // findTarget reopens it when this step's page lives under More
    const found = step.target ? findTarget(step.target) : null;
    found?.el.scrollIntoView({ block: "center", behavior: "smooth" });
    const frame = window.requestAnimationFrame(measure);
    const t = window.setTimeout(measure, 350);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(t); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [index, steps, measure]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setIndex((i) => (i !== null && i < steps.length - 1 ? i + 1 : i));
      if (e.key === "ArrowLeft") setIndex((i) => (i !== null && i > 0 ? i - 1 : i));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, steps.length, finish]);

  if (index === null) return null;
  const step = steps[index];
  const last = index === steps.length - 1;
  const w = Math.min(POPUP_W, viewport.w - 24);

  // Place the pop-up beside the highlight when there's room (computer sidebar), else above/below it (phone bar).
  let popup: React.CSSProperties = { width: w, left: (viewport.w - w) / 2, top: Math.max(16, viewport.h / 2 - 120) };
  let arrow: "left" | "up" | "down" | null = null;
  let arrowOffset = 0;
  if (rect) {
    const spaceRight = viewport.w - (rect.left + rect.width);
    if (spaceRight > w + 40) {
      const top = Math.min(Math.max(12, rect.top + rect.height / 2 - 60), viewport.h - 220);
      popup = { width: w, left: rect.left + rect.width + 18, top };
      arrow = "left"; arrowOffset = rect.top + rect.height / 2 - top;
    } else {
      const left = Math.min(Math.max(12, rect.left + rect.width / 2 - w / 2), viewport.w - w - 12);
      const below = rect.top + rect.height + 18;
      const above = rect.top - 18 - popupH;
      if (below + popupH <= viewport.h - 12) { popup = { width: w, left, top: below }; arrow = "up"; }
      else if (above >= 12) { popup = { width: w, left, top: above }; arrow = "down"; }
      else { popup = { width: w, left, top: 12 }; } // Target is too tall for either side: pin to the top, no arrow.
      arrowOffset = rect.left + rect.width / 2 - left;
    }
  }

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {rect ? (
        <div className="tour-spotlight" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />
      ) : (
        <div className="tour-backdrop" />
      )}
      <div className="tour-popup" style={popup} ref={popupRef}>
        {arrow && <span className={`tour-arrow ${arrow}`} style={arrow === "left" ? { top: Math.min(Math.max(14, arrowOffset), 200) } : { left: Math.min(Math.max(14, arrowOffset), w - 14) }} />}
        <button type="button" className="tour-close" aria-label="Close tour" onClick={finish}><X size={16} /></button>
        <span className="tour-count">{index + 1} of {steps.length}</span>
        <h3 id="tour-title">{step.title}</h3>
        <p>{step.body}</p>
        {viaMore && <p className="tour-hint">On your phone, this is under <b>More</b> — we opened it for you.</p>}
        <div className="tour-actions">
          {index > 0 ? <button type="button" className="tour-back" onClick={() => setIndex(index - 1)}>Back</button> : <button type="button" className="tour-back" onClick={finish}>Skip tour</button>}
          <button type="button" className="button small" onClick={() => (last ? finish() : setIndex(index + 1))}>{last ? "Finish" : index === 0 ? "Start" : "Next"}</button>
        </div>
      </div>
    </div>
  );
}

/** Replays the tour from anywhere on the page. */
export function TourButton({ className = "tour-replay" }: { className?: string }) {
  return <button type="button" className={className} onClick={() => window.dispatchEvent(new Event("start-guided-tour"))}>Take the tour</button>;
}
