"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Whether the visitor has asked for reduced motion.
 *
 * useSyncExternalStore rather than an effect. A media query is an external
 * store that changes on its own — which is precisely what this hook is for —
 * and reading it in an effect meant rendering once with the animation on and
 * then again with it off, which react-hooks/set-state-in-effect rejects and
 * which briefly animates at someone who asked for no animation.
 *
 * The third argument is the server snapshot: no motion preference exists during
 * SSR, and claiming one would produce a hydration mismatch. Assuming motion is
 * allowed matches what the markup renders.
 *
 * Kept local for now. `reveal.tsx` has the same pattern and the same lint error,
 * so this is worth lifting into a shared hook when someone is next in that file.
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onStoreChange);
      return () => query.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * The long stroke that runs behind the step cards.
 *
 * SHAPE. A carriage return, not a serpentine. The cards read left-to-right on
 * both rows — card 5 sits under card 1, not under card 4 — so a path that
 * doubled back along the second row would point against its own numbering. This
 * sweeps right across row one, drops and returns to the left margin, then
 * sweeps right again, which is the motion the eye already makes.
 *
 * preserveAspectRatio="none" so the path stretches to whatever the grid is
 * doing at that breakpoint, and vector-effect="non-scaling-stroke" so the line
 * keeps an even weight while it does. Without the second, a wide short grid
 * squashes the vertical segments to hairlines and fattens the horizontal ones.
 *
 * DRAWS ON SCROLL, ONCE. dasharray equal to the path length with the offset
 * animating to zero is the standard line-drawing trick; the only wrinkle is
 * that the length has to be measured from the live DOM, because it changes with
 * the container. Measured on mount and again on resize.
 */
export function FlowArrow({ className }: { className?: string }) {
  const pathRef = useRef<SVGPathElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [length, setLength] = useState(0);
  const [scrolledInto, setScrolledInto] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  // Reduced motion shows the finished line rather than drawing it, so it is a
  // reason to be drawn, not a separate state to set.
  const drawn = reducedMotion || scrolledInto;

  useEffect(() => {
    const measure = () => {
      if (pathRef.current) setLength(pathRef.current.getTotalLength());
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const node = wrapRef.current;

    // Nothing to watch for: the line is already shown in full.
    if (!node || reducedMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        // Inside a callback, not the effect body — this fires when the browser
        // tells us something changed, which is what effects are for.
        setScrolledInto(true);
        observer.disconnect();
      },
      { threshold: 0.2 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <div ref={wrapRef} aria-hidden="true" className={className}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <path
          ref={pathRef}
          d="M 1 26 H 88 C 96 26 96 50 88 50 H 12 C 4 50 4 74 12 74 H 99"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{
            strokeDasharray: length || undefined,
            strokeDashoffset: length ? (drawn ? 0 : length) : undefined,
            transition: "stroke-dashoffset 2.6s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </svg>
    </div>
  );
}
