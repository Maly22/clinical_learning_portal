"use client";
import { useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";

export const DEFAULT_HOW_IT_WORKS_VIDEO = "/videos/how-it-works.mp4";

/** YouTube and Loom share links become their embeddable player URLs; anything else plays as a video file. */
function toEmbedUrl(url: string) {
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}?autoplay=1&rel=0`;
  const loom = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/);
  if (loom) return `https://www.loom.com/embed/${loom[1]}?autoplay=1`;
  return null;
}

export function HowItWorksVideo({ url }: { url: string | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const src = url?.trim() || DEFAULT_HOW_IT_WORKS_VIDEO;
  const embed = toEmbedUrl(src);

  function show() {
    setOpen(true);
    dialogRef.current?.showModal();
  }

  return (
    <>
      <button type="button" className="button" onClick={show}>See how it works <ArrowRight size={17} /></button>
      <dialog ref={dialogRef} className="video-dialog" onClose={() => setOpen(false)}
        onClick={(event) => { if (event.target === dialogRef.current) dialogRef.current?.close(); }}>
        <button type="button" className="video-close" aria-label="Close video" onClick={() => dialogRef.current?.close()}><X size={20} /></button>
        {/* Mounted only while open, so playback stops when the dialog closes. */}
        <div className="video-frame">
          {open && (embed
            ? <iframe src={embed} title="How PhasePrep works" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
            : <video src={src} poster={src === DEFAULT_HOW_IT_WORKS_VIDEO ? "/videos/how-it-works-poster.jpg" : undefined} controls autoPlay playsInline />)}
        </div>
      </dialog>
    </>
  );
}
