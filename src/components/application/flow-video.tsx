"use client";

import { usePathname } from "next/navigation";
import { HeroVideo } from "@/components/marketing/hero-video";

/**
 * The drone footage behind the results page and account creation, owned by
 * the flow's layout rather than by either page.
 *
 * WHY THE LAYOUT. Layouts stay mounted across client navigations; pages
 * don't. When each page rendered its own <video>, going from the results to
 * account creation threw the first away and loaded a second: a beat of the
 * dark fallback before its first frame, then a visible seek to where the
 * first had got to. Here it's one element that simply keeps playing, and
 * each page fades its own overlay over it (MatchResults, VideoBackdrop).
 *
 * Mounted only on those two routes, so the 7MB file isn't fetched on the
 * rest of the flow, and shown only when the page opts in with data-dark-hero
 * or data-dark-bg (globals.css, .flow-video), so a result scored by the old
 * engine, which has no dark page, never has footage behind it. resumeKey
 * still carries the position across a full reload.
 */
const ROUTES = [/^\/start\/result\//, /^\/create-account(\/|$)/];

export function FlowVideo() {
  const pathname = usePathname();
  if (!ROUTES.some((route) => route.test(pathname))) return null;

  return (
    <div aria-hidden="true" className="flow-video fixed inset-0 z-0 bg-brand-950">
      {/* 1920x1080, re-encoded from the stock original
          ("corporate-business-office-buildings…utc.mov", 34 Mbps) at H.264
          CRF 23, no audio, faststart: 6.8MB. Re-encode from the original,
          not from this file. */}
      <HeroVideo
        src="/video/about.mp4"
        resumeKey="flow-drone"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}
