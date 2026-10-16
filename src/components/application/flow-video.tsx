"use client";

import { usePathname } from "next/navigation";
import { FLOW_DRONE, HeroVideo } from "@/components/marketing/hero-video";

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
 * Mounted only on those two routes, so the clip isn't fetched on the rest of
 * the flow, and shown only when the page opts in with data-dark-hero or
 * data-dark-bg (globals.css, .flow-video), so a result scored by the old
 * engine, which has no dark page, never has footage behind it. resumeKey
 * still carries the position across a full reload.
 *
 * The clip itself (FLOW_DRONE): a 2MB 1280-wide encode for larger screens,
 * an 850KB 854-wide one for phones, and a poster that paints at once. It was
 * one 7MB 1080p file at nearly 6 Mbps, which is why phones sat on the dark
 * fallback; see HeroVideo for the encode notes.
 */
const ROUTES = [/^\/start\/result\//, /^\/create-account(\/|$)/];

export function FlowVideo() {
  const pathname = usePathname();
  if (!ROUTES.some((route) => route.test(pathname))) return null;

  return (
    <div aria-hidden="true" className="flow-video fixed inset-0 z-0 bg-brand-950">
      <HeroVideo
        clip={FLOW_DRONE}
        resumeKey="flow-drone"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}
