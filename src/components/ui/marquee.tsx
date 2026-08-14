"use client";

import { Children, type CSSProperties, type HTMLAttributes } from "react";

/**
 * Same three lines as the `cx` in ./index.tsx, deliberately duplicated.
 *
 * That one is module-private, and exporting it would mean this file imports
 * from the barrel that will re-export it — a cycle. Three lines is cheaper than
 * a shared module for a filter and a join, and cheaper than clsx, which is what
 * the shadcn original reaches for.
 */
function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/**
 * A looping strip of content.
 *
 * ADAPTED, NOT PASTED. The version this came from is written for a shadcn
 * project and this is not one — there is no components.json, no src/lib/utils,
 * and no clsx or tailwind-merge, so its `cn` import does not resolve. Four
 * other things were changed on the way in, each for a reason:
 *
 * 1. THE KEYFRAMES LIVE IN globals.css. The original injects a <style> element
 *    from inside the component body, so the rules are re-emitted for every
 *    instance on the page — and it names its keyframes `scroll`, which is
 *    about as collision-prone as a global identifier gets. They are now
 *    `marquee-*` and declared once.
 *
 * 2. PAUSE-ON-HOVER IS CSS. The original holds a `isPaused` boolean in React
 *    state and sets it from onMouseEnter/onMouseLeave, which re-renders the
 *    whole subtree twice per hover to toggle one class. `:hover` does it with
 *    no JavaScript and no render.
 *
 * 3. THE SECOND COPY IS aria-hidden. The original renders the children twice
 *    with nothing marking the duplicate, so a screen reader reads every item
 *    in the strip twice with no indication why.
 *
 * 4. REDUCED MOTION STOPS IT. The blanket rule in globals.css forces
 *    animation-duration to 0.01ms, which for an infinite loop means it snaps
 *    to its end frame rather than stopping — see the override in globals.css.
 *
 * WIDTH IS THE CALLER'S PROBLEM, WITH A GUARD. A marquee only loops seamlessly
 * if one half of the track is at least as wide as its container; short lists
 * leave a visible gap on wide screens. `copies` repeats the children within
 * each half so a five-item list still fills a desktop viewport.
 */
export interface MarqueeProps extends HTMLAttributes<HTMLDivElement> {
  /** Seconds for one full pass. Larger is slower. */
  durationSec?: number;
  pauseOnHover?: boolean;
  direction?: "left" | "right" | "up" | "down";
  /** Soften the leading and trailing edges. */
  fade?: boolean;
  /** How much of each edge the fade covers, as a percentage. */
  fadeAmount?: number;
  /** Repetitions of the children within each half of the track. */
  copies?: number;
}

export function Marquee({
  children,
  className = "",
  durationSec = 20,
  pauseOnHover = false,
  direction = "left",
  fade = true,
  fadeAmount = 10,
  copies = 2,
  ...props
}: MarqueeProps) {
  const items = Children.toArray(children);
  const isVertical = direction === "up" || direction === "down";

  // One half of the track. The animation translates by exactly -50%, so the
  // two halves must be identical for the loop to be seamless.
  const half = Array.from({ length: Math.max(1, copies) }, () => items).flat();

  const mask = `linear-gradient(to ${
    isVertical ? "bottom" : "right"
  }, transparent 0%, black ${fadeAmount}%, black ${100 - fadeAmount}%, transparent 100%)`;

  return (
    <div
      data-pause-on-hover={pauseOnHover ? "true" : undefined}
      className={cx("marquee flex w-full overflow-hidden", isVertical && "flex-col", className)}
      style={fade ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
      {...props}
    >
      <div
        className="marquee-track"
        data-direction={direction}
        style={{ "--marquee-duration": `${durationSec}s` } as CSSProperties}
      >
        {[0, 1].map((copy) => (
          // The second half exists only so the strip has something to show
          // while the first scrolls away. It carries no information.
          <div
            key={copy}
            aria-hidden={copy === 1 ? "true" : undefined}
            className={cx("flex shrink-0", isVertical && "flex-col")}
          >
            {half.map((item, index) => (
              <div
                key={index}
                className={cx("flex shrink-0", isVertical && "w-full")}
              >
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
