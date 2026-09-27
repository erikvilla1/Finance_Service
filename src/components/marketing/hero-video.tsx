"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";

/**
 * Full-bleed background video for the hero. Falls back to nothing (parent's
 * bg-brand-900 shows through) if the file is missing or fails to decode, and
 * stays paused on its first frame for prefers-reduced-motion rather than
 * autoplaying.
 */
/** Seek to the saved position, once the video knows its duration. */
function resumeFrom(video: HTMLVideoElement, key: string) {
  try {
    const saved = Number(sessionStorage.getItem(key));
    if (saved > 0 && saved < video.duration) video.currentTime = saved;
  } catch {}
}

export function HeroVideo({
  className,
  src = "/video/hero-drone2.mp4",
  resumeKey,
}: {
  className?: string;
  /**
   * Carry the playback position across pages that show the same footage
   * (the results page into account creation), so moving between them
   * continues the shot instead of restarting it. Stored in sessionStorage
   * under this key; storage failing just means starting from the top.
   */
  resumeKey?: string;
  /**
   * Defaults to the home page's drone footage.
   *
   * hero-drone2 replaced the original. The source was a 362MB, 148 Mbps
   * master; this is the same footage at 1600x900 and 5.5MB, which is a
   * background sitting under a scrim with type over it rather than something
   * anyone inspects. hero-drone.mp4 is now unreferenced.
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

  // Resume, then save the position as it plays and when the page is left.
  // The seek runs here as well as on loadedmetadata because the server-
  // rendered <video> can load its metadata before React has attached the
  // handler, and that event won't fire again.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resumeKey) return;
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) resumeFrom(video, resumeKey);
    const save = () => {
      try {
        sessionStorage.setItem(resumeKey, String(video.currentTime));
      } catch {}
    };
    video.addEventListener("timeupdate", save);
    return () => {
      save();
      video.removeEventListener("timeupdate", save);
    };
  }, [resumeKey]);

  function resume(event: SyntheticEvent<HTMLVideoElement>) {
    if (resumeKey) resumeFrom(event.currentTarget, resumeKey);
  }

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
      onLoadedMetadata={resume}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
