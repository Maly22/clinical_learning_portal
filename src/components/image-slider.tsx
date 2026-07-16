"use client";
import { useEffect, useState } from "react";

export function ImageSlider({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => setActive((current) => (current + 1) % images.length), 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="image-slider">
      {images.map((src, index) => (
        <img src={src} alt="" key={src} className={index === active ? "active" : ""} />
      ))}
    </div>
  );
}
