"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Reveal } from "@/components/marketing/reveal";
import { useMediaQuery } from "@/components/marketing/use-reduced-motion";

export interface ProcessStep {
  title: string;
  body: string;
  /**
   * Two or three short facts about this step.
   *
   * Not decoration — the card needs something true to hold. A large surface
   * with one sentence in it looks emptier than no surface at all, and padding
   * it with adjectives would be worse than either.
   */
  meta: string[];
}

/**
 * Scroll distance allotted to each step, as a fraction of the viewport height.
 *
 * Sets the pace of the whole section. Too little and steps flicker past on a
 * trackpad flick; too much and the page feels stuck. Half a screen per step is
 * about one deliberate scroll gesture each.
 */
const STEP_VH = 55;

/** How many cards peek out behind the front one. */
const DECK_PEEK = 2;

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
                className="absolute left-0 top-0 h-full w-px origin-top bg-accent-800 transition-transform duration-300 ease-out"
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
                            ? "text-accent-800"
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
            {/*
              ONE SURFACE, NOT ONE PER STEP.

              The card chrome lives here rather than on each panel. When every
              step carried its own white card, the crossfade put two
              semi-transparent surfaces on top of each other for half a second
              and the outgoing step's text ghosted through the incoming
              heading. A single opaque surface with the contents swapped inside
              it cannot do that — and it means the box never changes size
              between steps, which is the one thing a pinned section must not
              do.
            */}
            {/*
              A DECK, NOT A CROSSFADE.

              Each step is its own card and they sit in a stack: the current one
              in front, the next two peeking below it, the ones already passed
              dealt off to the left. Scroll still drives it — the card that is
              in front is whichever step the pinned section is on.

              WHY NOT THE SWIPE DECK THIS IS MODELLED ON. That component is a
              decision UI: drag right to keep, left to skip, backspace to undo.
              None of those verbs exist here — this is eight fixed steps in a
              fixed order, and there is nothing to decide. Its drag also fights
              this section directly, since a horizontal drag inside a
              vertically scroll-pinned region is exactly the gesture conflict
              the pinning was written to avoid. The look is what carries over.

              The stack needs room below the front card for the peeking edges,
              hence the extra bottom padding rather than a taller card.
            */}
            <div className={pinned ? "relative min-h-[26rem] pb-8" : ""}>
              {steps.map((step, index) => {
                const isActive = index === active;
                /** How far behind the front of the deck this card sits. */
                const depth = index - active;
                /** Only the front card and two behind it are drawn. */
                const inDeck = depth >= 0 && depth <= DECK_PEEK;

                // Dealt cards leave to the right with a slight turn; cards still
                // in the deck step down and shrink; anything deeper than the
                // peek sits where card 3 sits, so it does not fly in from
                // nowhere when it becomes visible.
                const clamped = Math.min(Math.max(depth, 0), DECK_PEEK);
                const transform =
                  depth < 0
                    ? "translate3d(58%,0,0) rotate(5deg) scale(0.94)"
                    : `translate3d(0,${clamped * 18}px,0) scale(${1 - clamped * 0.04})`;

                return (
                  <div
                    key={step.title}
                    aria-hidden={pinned && !isActive}
                    style={
                      pinned
                        ? {
                            transform,
                            // Dealt cards must drop below the deck. `clamped`
                            // floors at 0, so reusing it here gave every passed
                            // card the same z-index as the front one — hidden,
                            // but stacked above the card actually in front.
                            zIndex: depth < 0 ? 0 : steps.length - clamped,
                            opacity: depth < 0 || depth > DECK_PEEK ? 0 : 1,
                          }
                        : undefined
                    }
                    className={
                      pinned
                        ? [
                            "step-card absolute inset-x-0 top-0 flex min-h-[26rem] flex-col overflow-hidden rounded-[1.75rem] border border-ink-200 p-8 shadow-card",
                            "transition-[transform,opacity] duration-[450ms] ease-out will-change-transform sm:p-12",
                            isActive ? "" : "pointer-events-none",
                          ].join(" ")
                        : "step-card relative mt-5 flex flex-col overflow-hidden rounded-[1.75rem] border border-ink-200 p-8 shadow-card first:mt-0 sm:p-10"
                    }
                  >
                    {/* Sits fully inside the card rather than bleeding past its
                        top edge. It was clipped before — deliberately, but it
                        read as a rendering fault rather than a crop, which is
                        the wrong kind of deliberate. Sized down so the whole
                        glyph fits within the padding box, and inset from the
                        right so the digits are not flush to the border. Still
                        pale enough that the heading wins. */}
                    <span
                      aria-hidden="true"
                      className="step-numeral pointer-events-none absolute right-8 top-7 select-none text-[7rem] font-bold leading-none tracking-tight sm:right-12 sm:top-9 sm:text-[10rem]"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <h3 className="relative max-w-xl text-2xl font-bold tracking-tight text-ink-900 sm:text-4xl">
                      {step.title}
                    </h3>
                    {/* Contents of the cards behind fade out. Two full step
                        write-ups showing through a 18px sliver reads as a
                        rendering fault; an empty edge reads as a deck. */}
                    <p
                      className={`relative mt-5 max-w-xl text-lg leading-relaxed text-ink-600 transition-opacity duration-300 ${
                        pinned && !isActive ? "opacity-0" : ""
                      }`}
                    >
                      {step.body}
                    </p>

                    {/* mt-auto pins these to the bottom of the surface, so the
                        chips sit on the same line from step to step instead of
                        floating wherever the copy happens to end. */}
                    <ul className={`relative mt-auto flex flex-wrap gap-2 pt-10 transition-opacity duration-300 ${pinned && !isActive ? "opacity-0" : ""}`}>
                      {step.meta.map((fact, chipIndex) => (
                        <li
                          key={fact}
                          className="step-chip rounded-full bg-ink-50 px-3.5 py-1.5 text-sm font-medium text-ink-700 ring-1 ring-inset ring-ink-200"
                          // Offset per chip so the row glimmers left to right rather
                          // than in unison. See .step-chip in globals.css.
                          style={{ "--shine-delay": `${chipIndex * 0.3}s` } as CSSProperties}
                        >
                          {fact}
                        </li>
                      ))}
                    </ul>
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
                  className="h-full origin-left bg-accent-800 transition-transform duration-150 ease-linear"
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
