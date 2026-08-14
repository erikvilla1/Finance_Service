"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/marketing/reveal";
import { useMediaQuery } from "@/components/marketing/use-reduced-motion";

export interface ProcessStep {
  title: string;
  body: string;
}

/**
 * Scroll distance allotted to each step, as a fraction of the viewport height.
 *
 * Sets the pace of the whole section. Too little and steps flicker past on a
 * trackpad flick; too much and the page feels stuck. Half a screen per step is
 * about one deliberate scroll gesture each.
 */
const STEP_VH = 55;

/**
 * The process, advanced by scrolling.
 *
 * WHAT THIS IS. The section pins to the viewport and the eight steps advance as
 * you scroll through it, then it releases and the page carries on normally.
 * Scroll position drives which step is showing — there is no timer and nothing
 * moves on its own.
 *
 * WHY PINNING RATHER THAN AUTO-PLAY. The previous version advanced on a timer,
 * which meant the reader was racing it. Tying it to scroll inverts that: the
 * sequence moves exactly as fast as the person moves, stops when they stop, and
 * goes backwards when they scroll up. It also *is* the thing it describes — a
 * process you move through — instead of a description of one.
 *
 * NOT HIJACKED. Scroll is never intercepted or preventDefault'd. The section is
 * simply tall, and its contents are sticky; the browser does the rest. Someone
 * who wants past it can flick and be through in a second, and the scrollbar
 * tells the truth about how much is left the whole time.
 *
 * DESKTOP ONLY. Pinning is measured against viewport height, and mobile browser
 * chrome resizes the viewport mid-scroll, which makes the maths jitter. Below
 * lg — and whenever reduced motion is asked for, and before hydration — every
 * step renders stacked in order. That stacked form is also the no-JS render, so
 * the section is a plain readable list without a line of script.
 */
export function ProcessSteps({ steps }: { steps: ProcessStep[] }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  /**
   * Read during render, not set from an effect. The server snapshot is false,
   * so the server and any browser that never hydrates get the stacked list —
   * which is the safe render, and the reason the query is phrased so that
   * `false` means "do not pin".
   */
  const pinned = useMediaQuery(
    "(min-width: 64rem) and (prefers-reduced-motion: no-preference)",
  );

  useEffect(() => {
    if (!pinned) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const node = outerRef.current;
      if (!node) return;

      // How far into the tall wrapper we are, 0 to 1. offsetHeight minus one
      // viewport is the travel available while the sticky child is pinned —
      // past that the wrapper's bottom reaches the viewport bottom and it
      // releases on its own.
      const travel = node.offsetHeight - window.innerHeight;
      if (travel <= 0) return;

      const ratio = Math.min(Math.max(-node.getBoundingClientRect().top / travel, 0), 1);
      setProgress(ratio);

      // The last step gets the final slice rather than a single instant at
      // ratio === 1, which nothing but a scroll that lands exactly on the end
      // would ever hit.
      setActive(Math.min(steps.length - 1, Math.floor(ratio * steps.length)));
    };

    const onScroll = () => {
      // Coalesce to one read per frame. Scroll fires far faster than paint, and
      // getBoundingClientRect forces layout every time it is called.
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pinned, steps.length]);

  /** Clicking a step scrolls to where that step is showing. */
  const jumpTo = useCallback(
    (index: number) => {
      const node = outerRef.current;
      if (!node || !pinned) return;

      const travel = node.offsetHeight - window.innerHeight;
      // Mid-slice, so the target lands with the step comfortably active rather
      // than balanced on the boundary between it and its neighbour.
      const target =
        node.offsetTop + ((index + 0.5) / steps.length) * travel;
      window.scrollTo({ top: target, behavior: "smooth" });
    },
    [pinned, steps.length],
  );

  return (
    <div
      ref={outerRef}
      className="relative"
      style={pinned ? { height: `${steps.length * STEP_VH + 100}vh` } : undefined}
    >
      <div
        className={
          pinned
            ? "sticky top-0 flex min-h-dvh flex-col justify-center overflow-hidden py-24"
            : "py-16 sm:py-24"
        }
      >
        <div className="mx-auto w-full max-w-[110rem] px-6 sm:px-10 lg:px-14">
          {/* Staggered so the eyebrow, headline and sub-line arrive in reading
              order. This was lost when the heading moved inside this component
              — the old markup had three Reveals around it, and replacing the
              card grid took them with it. */}
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              How it works
            </p>
          </Reveal>
          <Reveal delayMs={110}>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              A simple path forward
            </h2>
          </Reveal>
          <Reveal delayMs={220}>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-600">
              Eight steps from first question to funded file. Nothing here
              commits you to anything.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
            {/* ------------------------------------------------------ RAIL */}
            <ol className="relative flex flex-col">
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 top-0 w-px bg-ink-200"
              />
              {/* One continuous line scaled to the current step rather than a
                  border per item — a per-item treatment steps, this glides. */}
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 h-full w-px origin-top bg-accent-600 transition-transform duration-300 ease-out"
                style={{ transform: `scaleY(${(active + 1) / steps.length})` }}
              />

              {steps.map((step, index) => {
                const isActive = index === active;
                const isDone = index < active;

                return (
                  <li key={step.title}>
                    <button
                      type="button"
                      onClick={() => jumpTo(index)}
                      aria-current={isActive ? "step" : undefined}
                      className="group flex w-full items-center gap-4 py-3 pl-5 pr-2 text-left"
                    >
                      <span
                        aria-hidden="true"
                        className={[
                          "w-6 shrink-0 text-sm font-semibold tabular-nums transition-colors duration-300",
                          isActive
                            ? "text-accent-600"
                            : isDone
                              ? "text-ink-500"
                              : "text-ink-300",
                        ].join(" ")}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={[
                          "text-[0.98rem] transition-colors duration-300",
                          isActive
                            ? "font-semibold text-ink-900"
                            : "font-medium text-ink-500 group-hover:text-ink-800",
                        ].join(" ")}
                      >
                        {step.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {/* ----------------------------------------------------- PANEL */}
            <div className={pinned ? "relative min-h-[16rem]" : ""}>
              {steps.map((step, index) => {
                const isActive = index === active;

                return (
                  <div
                    key={step.title}
                    aria-hidden={pinned && !isActive}
                    className={
                      pinned
                        ? [
                            "absolute inset-0 transition-all duration-500 ease-out",
                            isActive
                              ? "translate-y-0 opacity-100 blur-0"
                              : "pointer-events-none translate-y-4 opacity-0 blur-[2px]",
                          ].join(" ")
                        : "mt-10 first:mt-0"
                    }
                  >
                    <p
                      aria-hidden="true"
                      className="text-[5rem] font-bold leading-none tracking-tight text-ink-100 sm:text-[7rem]"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="-mt-6 text-2xl font-bold tracking-tight text-ink-900 sm:-mt-8 sm:text-3xl">
                      {step.title}
                    </h3>
                    <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-600">
                      {step.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Position within the section. A pinned region is disorienting
              without one — the page has stopped moving and nothing else says
              how much is left. */}
          {pinned && (
            <div className="mt-12 flex items-center gap-4">
              <div className="h-px flex-1 overflow-hidden bg-ink-200">
                <div
                  className="h-full origin-left bg-ink-400 transition-transform duration-150 ease-linear"
                  style={{ transform: `scaleX(${progress})` }}
                />
              </div>
              <span className="text-xs font-medium tabular-nums text-ink-400">
                {String(active + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
