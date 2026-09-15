"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Environment hooks that must not set state in an effect.
 *
 * WHY useSyncExternalStore RATHER THAN useState + useEffect. The obvious
 * version of any of these reads the environment in an effect and calls setState
 * with the answer. That is what `react-hooks/set-state-in-effect` rejects, and
 * the rule is right: the component renders once with the wrong answer and again
 * with the right one, so someone who asked their operating system for no
 * animation gets a flash of one anyway.
 *
 * useSyncExternalStore has no such gap. React reads the value during render
 * from getSnapshot, so the first client render already knows, and subscribe
 * keeps it live if the answer changes mid-session.
 *
 * Every server snapshot here is a constant, because it has to be — a server
 * cannot know the viewport or the preferences of a browser that has not asked
 * for the page yet.
 */

/**
 * A media query, live.
 *
 * The server snapshot is `false`: on the server nothing matches, so the markup
 * is whatever the component does without the query. Pick the query so that
 * `false` is the safe render — the stacked list rather than the pinned one, the
 * plain header rather than the retracted one.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Whether the operating system has been asked for reduced motion. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/**
 * Whether React has hydrated on the client.
 *
 * For components whose no-JS fallback is the visible state: before hydration
 * nothing is hidden, so a browser that never runs scripts shows the page in
 * full rather than a column of blank sections.
 *
 * `subscribe` returns a no-op unsubscribe because this never changes after
 * hydration — there is no event to listen for, only two snapshots.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * Whether the page has scrolled past `threshold` pixels.
 *
 * A boolean rather than the raw offset on purpose: getSnapshot must return a
 * value that is stable when nothing meaningful has changed, and scrollY changes
 * on every pixel. Returning the number would re-render the subscriber
 * continuously through a scroll.
 */
export function useScrolledPast(threshold: number): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("scroll", onStoreChange, { passive: true });
    return () => window.removeEventListener("scroll", onStoreChange);
  }, []);

  const getSnapshot = useCallback(
    () => window.scrollY > threshold,
    [threshold],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * Whether the sticky header should hide — direction-aware, not
 * position-aware.
 *
 * The first version of this was `useScrolledPast(80)`: hidden once scrolled
 * more than 80px down. That only ever reveals the header again once scrolled
 * back within 80px of the very top, so scrolling up from anywhere deeper in
 * the page — which is the whole point of a reveal-on-scroll-up header —
 * never brought it back. This tracks the delta between consecutive scroll
 * events instead of the absolute offset: hidden while actively moving down,
 * shown the moment the direction reverses, from any scroll position. A small
 * dead zone (4px) on the delta ignores the sub-pixel jitter trackpads and
 * some mice report even when held still.
 *
 * The last-seen position and the current hidden state live in module scope,
 * not component state — persisting them is the entire mechanism (there is no
 * other way to know "up" from "down"), and this file's approach throughout
 * is to keep that bookkeeping outside React rather than inside an effect.
 * Module scope rather than per-hook-instance because the page only ever has
 * one sticky header; a second consumer would need its own copy of this.
 */
let lastScrollY = 0;
let headerHidden = false;

export function useHeaderReveal(): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY;

      if (y < 80) {
        headerHidden = false;
      } else if (delta > 4) {
        headerHidden = true;
      } else if (delta < -4) {
        headerHidden = false;
      }

      lastScrollY = y;
      onStoreChange();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const getSnapshot = useCallback(() => headerHidden, []);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
