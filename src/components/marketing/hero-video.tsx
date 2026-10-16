"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";

/**
 * Full-bleed background video for a hero. Falls back to nothing (whatever is
 * layered behind it shows through) if the file is missing or fails to decode,
 * and holds its first frame for prefers-reduced-motion rather than playing.
 *
 * TWO ENCODES AND A STILL PER CLIP, NOT ONE FILE. Each clip used to ship as a
 * single encode: the flow's at 1920x1080 and 5.9 Mbps, the home page's at
 * 1600x900 and 2.4 Mbps. A phone on a cellular connection cannot keep up with
 * 6 Mbps, so the results page sat on its dark fallback for ten seconds or
 * more, and a desktop on a slow line did the same (client, 10-16: "the drone
 * vids are taking forever to load on mobile and sometimes on desktop"). Now:
 *
 *   • a 1280-wide encode under 2 Mbps for screens 768px and up, and an
 *     854-wide one under 1 Mbps for phones, chosen by the browser through the
 *     media attribute on <source>. A browser that ignores that attribute
 *     takes the first entry, the 1280 one: the old behaviour at a third of
 *     the size. Both are H.264 High, CRF 26/28 with a bitrate cap, no audio,
 *     faststart, re-encoded from the previous in-repo files with ffmpeg;
 *   • a poster, the first frame as a WebP under 90KB, which paints the
 *     moment the HTML does. The page is never black while the video buffers,
 *     and if autoplay is refused (iOS Low Power Mode) the still is what stays.
 *
 * autoPlay IS ON THE ELEMENT, not only requested from an effect. The browser
 * can then buffer and start the clip from the HTML, before the JavaScript has
 * arrived, which on a phone is seconds earlier. The effect still runs: it
 * pauses the clip for reduced motion (a frame or two may have moved by then,
 * which is the trade for everyone else's earlier start) and asks for play
 * where autoplay was deferred.
 */
export interface VideoClip {
  /** The 1280-wide encode, and the one a browser without <source media> gets. */
  src: string;
  /** The 854-wide encode for phones (viewports under 768px). */
  mobileSrc?: string;
  /** First frame, shown until the video has one of its own. */
  poster?: string;
}

/**
 * The home page's drone shot. The source was a 362MB, 148 Mbps master; these
 * are a background under a scrim with type over it, not something anyone
 * inspects. The old single-file hero-drone2.mp4 is unreferenced and removed.
 */
export const HOME_DRONE: VideoClip = {
  src: "/video/hero-drone2-1280.mp4",
  mobileSrc: "/video/hero-drone2-854.mp4",
  poster: "/video/hero-drone2-poster.webp",
};

/**
 * The results page's and account creation's shot (see FlowVideo). Re-encoded
 * from the stock original ("corporate-business-office-buildings…utc.mov",
 * 34 Mbps) by way of the previous 1080p file; a future re-encode should start
 * from the original, which is not in the repo.
 */
export const FLOW_DRONE: VideoClip = {
  src: "/video/about-1280.mp4",
  mobileSrc: "/video/about-854.mp4",
  poster: "/video/about-poster.webp",
};

/** Seek to the saved position, once the video knows its duration. */
function resumeFrom(video: HTMLVideoElement, key: string) {
  try {
    const saved = Number(sessionStorage.getItem(key));
    if (saved > 0 && saved < video.duration) video.currentTime = saved;
  } catch {}
}

export function HeroVideo({
  className,
  clip = HOME_DRONE,
  resumeKey,
}: {
  className?: string;
  /**
   * Which footage. Defaults to the home page's. A clip with only `src` is
   * fine: the failure path is what makes this safe to point at a file that
   * does not exist yet (the sign-in page does), because onError unmounts the
   * element and whatever is layered behind it shows through.
   */
  clip?: VideoClip;
  /**
   * Carry the playback position across pages that show the same footage
   * (the results page into account creation), so moving between them
   * continues the shot instead of restarting it. Stored in sessionStorage
   * under this key; storage failing just means starting from the top.
   */
  resumeKey?: string;
}) {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      video.pause();
    } else {
      video.play().catch(() => {});
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
      poster={clip.poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      onError={() => setFailed(true)}
      onLoadedMetadata={resume}
    >
      {/* Larger first: a browser that honours media skips it on a phone; one
          that doesn't takes it everywhere, which is the safer default. */}
      {clip.mobileSrc ? (
        <>
          <source src={clip.src} type="video/mp4" media="(min-width: 768px)" />
          <source src={clip.mobileSrc} type="video/mp4" />
        </>
      ) : (
        <source src={clip.src} type="video/mp4" />
      )}
    </video>
  );
}
