"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Full-bleed background video for the hero. Falls back to nothing (parent's
 * bg-brand-900 shows through) if the file is missing or fails to decode, and
 * stays paused on its first frame for prefers-reduced-motion rather than
 * autoplaying.
 */
export function HeroVideo({
  className,
  src = "/video/hero-drone.mp4",
}: {
  className?: string;
  /**
   * Defaults to the home page's drone footage.
   *
   * The failure path is what makes this safe to point at a file that does not
   * exist yet: onError unmounts the element, so whatever is layered behind it
   * shows through. Drop a new file in public/video and it takes over; until
   * then the fallback is what renders.
   */
  src?: string;
}) {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!reduceMotion) {
      videoRef.current?.play().catch(() => {});
    }
  }, []);

  if (failed) return null;

  return (
    <video
      ref={videoRef}
      className={className}
      muted
      loop
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
