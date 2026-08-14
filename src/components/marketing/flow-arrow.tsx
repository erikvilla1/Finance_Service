"use client";

import { useEffect, useRef, useState } from "react";

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
  const [drawn, setDrawn] = useState(false);

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
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDrawn(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setDrawn(true);
        observer.disconnect();
      },
      { threshold: 0.2 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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
