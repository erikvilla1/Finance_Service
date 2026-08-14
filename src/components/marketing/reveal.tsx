"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fades and lifts its children into view the first time they are scrolled to.
 *
 * WHY NOT GSAP + ScrollTrigger + Lenis. That is what the reference site runs,
 * and it is three libraries for an opacity change and a 16px translate.
 * IntersectionObserver is in the platform, costs nothing, and is what
 * ScrollTrigger is built on anyway. If the site later needs pinned sections or
 * scrubbed timelines, that is the point to reach for GSAP — not this.
 *
 * REVEALS ONCE, THEN DISCONNECTS. Re-animating on every pass sounds richer and
 * is actively worse: on a long scrolling page it means content flickering as
 * the reader moves back up to re-read something.
 *
 * VISIBLE BY DEFAULT WITHOUT JAVASCRIPT. The hidden state is applied by the
 * effect rather than in the initial markup, so a browser that never runs the
 * script renders the page fully visible instead of a column of blank sections.
 * That ordering is the whole trick, and it is why this cannot be done with a
 * class in the server-rendered HTML.
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
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    // Arming here rather than in the initial state is what keeps the no-JS
    // render visible: by the time anything is hidden, we know scripts run.
    setArmed(true);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      // A little before the edge, so the reveal has finished by the time the
      // content is properly in frame rather than starting as it arrives.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: !armed || shown ? 1 : 0,
        transform: !armed || shown ? "none" : "translateY(16px)",
        transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delayMs}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}
