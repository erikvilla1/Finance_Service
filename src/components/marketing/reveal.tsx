"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  useHydrated,
  usePrefersReducedMotion,
} from "@/components/marketing/use-reduced-motion";

/**
 * Fades and lifts its children into view the first time they are scrolled to.
 *
 * WHY NOT GSAP + ScrollTrigger + Lenis. That is what the reference site runs,
 * and it is three libraries for an opacity change and a 16px translate.
 * IntersectionObserver is in the platform, costs nothing, and is what
 * ScrollTrigger is built on anyway.
 *
 * REVEALS ONCE, THEN DISCONNECTS. Re-animating on every pass sounds richer and
 * is actively worse: on a long scrolling page it means content flickering as
 * the reader moves back up to re-read something.
 *
 * -----------------------------------------------------------------------------
 * NO setState IN THE EFFECT BODY.
 *
 * This component used to set two pieces of state synchronously inside its
 * effect — one to arm the hidden state after mount, one to skip straight to
 * shown under reduced motion. `react-hooks/set-state-in-effect` rejects both,
 * and the cost was real rather than stylistic: the component rendered once with
 * the animation on and again with it off, so someone who had asked their
 * operating system for no animation saw a flash of one.
 *
 * Both are now read during render through useSyncExternalStore, so the first
 * client render already knows. The only setState left fires from the
 * IntersectionObserver callback, which is an event, not the effect body.
 *
 * `hydrated` is what keeps the no-JS render visible: before hydration nothing
 * is hidden, so a browser that never runs this shows the page in full rather
 * than a column of blank sections.
 * -----------------------------------------------------------------------------
 */
export function Reveal({
  children,
  delayMs = 0,
  className,
}: {
  children: ReactNode;
  /** Stagger, for sections that reveal more than one thing. */
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();
  const reducedMotion = usePrefersReducedMotion();
  const [scrolledInto, setScrolledInto] = useState(false);

  // Reduced motion is a reason to be shown, not a separate state to set.
  const shown = !hydrated || reducedMotion || scrolledInto;

  useEffect(() => {
    if (shown) return;

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setScrolledInto(true);
        observer.disconnect();
      },
      // A little before the edge, so the reveal has finished by the time the
      // content is properly in frame rather than starting as it arrives.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(16px)",
        transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delayMs}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}
