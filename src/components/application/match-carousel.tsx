"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * The result options as a sliding row, so the results page fits one screen
 * whatever the number of matches.
 *
 * Native scroll-snap underneath: a phone swipes it with momentum and the
 * browser handles snapping, and the arrows only ask it to scroll a page's
 * width, smoothly. No transform bookkeeping, and it degrades to a plain
 * scrollable row without JavaScript.
 *
 * The arrows appear only when there's somewhere to go, and each hides at its
 * end rather than sitting disabled — two greyed arrows on a two-card result
 * would suggest more exists than does.
 */
export function MatchCarousel({
  children,
  label,
  header,
}: {
  children: ReactNode;
  label: string;
  /**
   * The row's heading, set on the left of the arrows. The arrows sit up here
   * rather than under the cards so the cards are the row's last edge, which
   * the results page lines the next-step card up against.
   */
  header?: ReactNode;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // The track's px-1 (4px each end, room for the cards' edge rings) makes
    // it 8px wider than its cards even when they all fit; a tolerance under
    // that showed a "more" arrow on a row with nothing more in it.
    setCanBack(el.scrollLeft > 10);
    setCanForward(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  // Measure once mounted and whenever the track changes size (a window
  // resize changes how many cards fit). An observer callback, not setState
  // in the effect body.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const page = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  };

  const arrows = (canBack || canForward) && (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => page(-1)}
        disabled={!canBack}
        aria-label="Previous options"
        className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.18] text-white ring-1 ring-inset ring-white/30 backdrop-blur-md transition-[opacity,background-color] duration-300 hover:bg-white/[0.26] disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => page(1)}
        disabled={!canForward}
        aria-label="More options"
        className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.18] text-white ring-1 ring-inset ring-white/30 backdrop-blur-md transition-[opacity,background-color] duration-300 hover:bg-white/[0.26] disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">{header}</div>
        {arrows}
      </div>
      <ul
        ref={trackRef}
        onScroll={measure}
        aria-label={label}
        className="no-scrollbar -mx-1 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-1"
      >
        {children}
      </ul>
    </div>
  );
}
