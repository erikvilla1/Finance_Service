"use client";

import { useEffect, useLayoutEffect, useState } from "react";

/**
 * Layout effect on the client, plain effect on the server.
 *
 * useLayoutEffect runs before the browser paints, which is the whole point
 * here — it lets the value be reset to the starting figure in the same frame
 * hydration completes. React warns if it is called during SSR, hence the
 * swap rather than using it directly.
 */
const useBeforePaint =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * A number that counts up once, on mount.
 *
 * WHY NOT @number-flow/react. The library referenced for this does per-digit
 * roll animation, and it is genuinely nicer — for a value that keeps changing.
 * This one changes exactly once, on load, and then never again: the roll is
 * over before anyone can look at it twice. That is a package, its transitive
 * deps, and a bundle cost on the site's most performance-sensitive screen, to
 * animate a single integer from 0 to 20. Swapping it in later is a
 * ten-line change if the digit roll turns out to be worth it.
 *
 * RENDERS THE FINAL VALUE FIRST. State starts at the destination, not at zero,
 * so the server-rendered HTML contains the real figure. Someone with JavaScript
 * disabled, or a crawler, or a screenshot taken mid-hydration, sees "20" rather
 * than "0" — and a financial figure that reads zero because a script did not
 * run is the worst possible failure mode for this particular component.
 *
 * Reduced motion is honoured directly rather than through the global CSS rule,
 * because this animation is JavaScript setting state rather than a CSS
 * animation — the blanket duration override in globals.css cannot reach it.
 */
export function CountUp({
  from = 0,
  to,
  prefix = "",
  suffix = "",
  durationMs = 3000,
  className,
}: {
  /** Where the count starts. Defaults to zero. */
  from?: number;
  to: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(to);
  const [settled, setSettled] = useState(true);

  useBeforePaint(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const start = performance.now();

    /**
     * Ease-out quadratic — front-loaded, but not so hard that the start is
     * unreadable.
     *
     * Quart was the previous choice and it hid the beginning of the count:
     * half the distance was covered in the first 15% of the time, so a count
     * from 1 to 20 looked like it began somewhere around 10. Nobody can read a
     * figure that is only on screen for two frames. Quad still puts most of the
     * movement early — which is what makes it feel quick rather than
     * ceremonial — while leaving the low numbers on screen long enough to
     * register that the count started where it says it did.
     */
    const ease = (t: number) => 1 - Math.pow(1 - t, 2);

    setSettled(false);
    setDisplay(from);

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      setDisplay(from + ease(progress) * (to - from));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setSettled(true);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to, durationMs]);

  /**
   * A decimal place, but only in flight.
   *
   * WHY. Counting 0 to 20 in whole numbers is twenty-one states. Spread over
   * three seconds that is one change every 140ms — slow enough to watch each
   * digit arrive individually, which is what made this read as sluggish no
   * matter which easing curve it used. The ceiling was the number of frames the
   * value could take, not the speed it took them at.
   *
   * A decimal turns twenty-one states into two hundred, and the figure moves
   * fast enough to blur. It resolves to the clean integer on the final frame,
   * so "20.0" is never what anyone is left looking at.
   */
  const rendered = settled ? to : display.toFixed(1);

  /**
   * The longest string this will ever render, used to reserve the width.
   *
   * tabular-nums fixes the width of each DIGIT but not the number of them. The
   * count passes through "$1.0M+" and "$19.9M+" before settling on "$20M+", so
   * the card was growing and then snapping back as the decimal disappeared. A
   * box that resizes while you read it is worse than no animation at all.
   *
   * An invisible copy of the widest state reserves the space, and the live
   * value is stacked on top of it in the same grid cell. Layout is decided once,
   * before the first frame, and never moves again.
   */
  const widest = `${prefix}${to.toFixed(1)}${suffix}`;

  return (
    <span className={`inline-grid ${className ?? ""}`}>
      <span
        aria-hidden="true"
        className="invisible col-start-1 row-start-1 tabular-nums"
      >
        {widest}
      </span>
      {/* The live region is the whole figure, announced once when it settles,
          rather than every intermediate value. */}
      <span aria-hidden="true" className="col-start-1 row-start-1 tabular-nums">
        {prefix}
        {rendered}
        {suffix}
      </span>
      <span className="sr-only">
        {prefix}
        {to}
        {suffix}
      </span>
    </span>
  );
}
