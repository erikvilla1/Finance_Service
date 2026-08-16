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
 * The count itself, shared by CountUp and CountUpRange.
 *
 * Returns the live value plus two flags that are deliberately not the same
 * thing: `settled` starts TRUE so the first render — the one the server sends —
 * is the destination figure, while `done` starts FALSE and only becomes true
 * when a real animation reaches the end. Anything that should fire once the
 * count lands has to key off `done`, or it fires on the server render too.
 *
 * Reduced motion is honoured here rather than through the global CSS rule,
 * because this is JavaScript setting state — the blanket duration override in
 * globals.css cannot reach it. Bailing out leaves both flags in their initial
 * state, which is the final value, rendered immediately.
 */
function useCountUpValue(from: number, to: number, durationMs: number) {
  const [display, setDisplay] = useState(to);
  const [settled, setSettled] = useState(true);
  const [done, setDone] = useState(false);

  useBeforePaint(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const start = performance.now();

    /**
     * Ease-out quadratic — front-loaded, but not so hard that the start is
     * unreadable.
     *
     * Quart was the previous choice and it hid the beginning of the count: half
     * the distance was covered in the first 15% of the time, so a count from 1
     * to 20 looked like it began somewhere around 10. Nobody can read a figure
     * that is only on screen for two frames.
     *
     * STEEPER CURVES WERE TRIED FOR THE TICKER AND PUT BACK. Quart, quint and
     * expo all decelerate harder, and all of them strand the final tick: every
     * ease-out has zero slope at t=1, so the last step of the count waits for
     * the clock rather than for the curve. Measured over a 2s count that was a
     * dead pause of 700–1000ms sitting on the second-to-last figure before it
     * snapped — which reads as a hang, not a landing. Quad bounds the same gap
     * to about 300ms, which is a beat. The ticker feel comes from quantising
     * the output (see CountUpAmount), not from the curve.
     */
    const ease = (t: number) => 1 - Math.pow(1 - t, 2);

    // Nothing is set here. The first animation frame writes everything, which
    // keeps this out of the effect body and so out of the way of
    // react-hooks/set-state-in-effect — and means the pre-animation render is
    // the final figure, which is what the server sent.
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      setSettled(progress >= 1);
      if (progress >= 1) setDone(true);
      setDisplay(from + ease(progress) * (to - from));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to, durationMs]);

  return { display, settled, done };
}

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
  shineWhenSettled = false,
  className,
}: {
  /** Where the count starts. Defaults to zero. */
  from?: number;
  to: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  /**
   * Add the .shine-text glint once the count has arrived, not before.
   *
   * Running both at once means the highlight sweeps a figure that is still
   * changing, and the two movements compete. Waiting also gives the shine a
   * job: it marks the moment the number lands.
   */
  shineWhenSettled?: boolean;
  className?: string;
}) {
  const { display, settled, done: shine } = useCountUpValue(from, to, durationMs);

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
    <span
      className={`inline-grid ${shineWhenSettled && shine ? "shine-text" : ""} ${
        className ?? ""
      }`}
    >
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

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/**
 * A whole-dollar figure, or a range of two, counting up once on mount.
 *
 * ONE COMPONENT FOR THE PAIR RATHER THAN TWO CountUps. Both figures run off a
 * single rAF loop, so they cannot drift apart and land on different frames —
 * a range whose two ends stop counting at visibly different moments reads as
 * broken rather than animated.
 *
 * NO DECIMAL IN FLIGHT, unlike CountUp. That trick exists because counting 0 to
 * 20 in whole numbers is only twenty-one states, which is slow enough to watch
 * each one arrive. These figures are in the tens of thousands: there are more
 * intermediate values than there are frames to show them in, so the number
 * already blurs. Adding cents would just be noise, and cents on a financing
 * figure implies a precision this page explicitly does not have.
 *
 * RENDERS THE FINAL FIGURE FIRST, same as CountUp and for the same reason.
 * State starts at the destination, so the server-rendered HTML carries the real
 * amount. A dollar figure that reads $0 because a script did not run is the
 * worst available failure on a page about how much someone might borrow.
 *
 * ROUNDED TO THE DOLLAR ON EVERY FRAME. Math.round rather than truncation —
 * the eased value approaches the target from below, and flooring would leave
 * the count one dollar short until the very last frame.
 */
export function CountUpAmount({
  min,
  max,
  durationMs = 2000,
  className,
}: {
  min: number | null;
  max: number | null;
  /**
   * Shorter than the hero's 3000ms. That figure is the first thing on the
   * homepage and has the screen to itself; these sit several to a page and a
   * three-second count is still running when the reader has moved on.
   *
   * Not much shorter, though. Most of this budget is the slow end of the
   * count, so trimming it takes the ticks away from precisely the part worth
   * watching — at 1600ms the last few steps stop being separable.
   */
  durationMs?: number;
  className?: string;
}) {
  // The single source of truth for the animation is the larger end of the
  // range, expressed as progress from 0 to 1, so both figures share a clock.
  const target = max ?? min ?? 0;
  const { display, settled, done } = useCountUpValue(0, target, durationMs);

  /**
   * QUANTISED INTO TICKS, WHICH IS WHAT MAKES IT READ AS A TICKER.
   *
   * Easing alone does not produce the game-show effect. The eased value is
   * sampled every frame, so near the end each frame moves it by a fraction of a
   * dollar, the rounded figure stops changing for a while, and it reads as
   * having simply stopped early. Steepening the curve makes that worse, not
   * better — see the note on the easing.
   *
   * Flooring progress to a fixed number of steps is what fixes it. The figure
   * can only ever sit on one of TICKS values, so every change is a jump of the
   * same size and what varies is how long each one stays on screen. Early on
   * several steps are crossed per frame and the number blurs; by the end a
   * single step holds for a dozen frames.
   *
   * 40 STEPS OVER 2000ms, WHICH IS TUNED RATHER THAN PICKED. Simulated against
   * a 60fps frame budget, that schedule holds each tick for roughly
   * 17ms early, then 67, 66, 84, 83, 100, 133 and finally 300ms — a clean
   * deceleration ending on a beat long enough to read. More steps make the
   * ending choppy against the frame clock; fewer make the jumps large enough
   * to look like the figure is wrong rather than arriving.
   *
   * FLOOR, NOT ROUND. Rounding lets the display reach the final tick while the
   * clock is still running, parking the finished figure on screen with the
   * animation not yet over — and the shine keys off the animation, so the glint
   * would arrive noticeably after the number stopped moving.
   *
   * Both ends of a range are computed from this one value, so they jump on the
   * same frames rather than ticking independently.
   */
  const TICKS = 40;
  const eased = target === 0 ? 1 : display / target;
  const progress = settled ? 1 : Math.floor(eased * TICKS) / TICKS;

  const value = (end: number) =>
    currency.format(settled ? end : Math.round(end * progress));

  const final =
    min != null && max != null
      ? `${currency.format(min)} – ${currency.format(max)}`
      : currency.format((min ?? max) as number);

  const live =
    min != null && max != null
      ? `${value(min)} – ${value(max)}`
      : value((min ?? max) as number);

  return (
    /* The glint starts only once the count lands — keyed off `done`, which is
       false on the server render and false during the count. Running both at
       once means the highlight sweeps a figure that is still changing and the
       two movements compete; waiting also gives the shine a job, which is to
       mark the moment the amount settles.

       shine-text-ink, not shine-text: these amounts are ink-900 on a white
       card, and the white-on-dark original would render them invisible. */
    <span
      className={`inline-grid ${done ? "shine-text-ink" : ""} ${
        className ?? ""
      }`}
    >
      {/* The final string reserves the width. Counting up means every
          intermediate value is shorter than the destination — "$9,999" before
          "$112,500" — so without this the figure grows as it counts and drags
          the card's layout with it. tabular-nums fixes the width of each digit
          but not how many of them there are. */}
      <span
        aria-hidden="true"
        className="invisible col-start-1 row-start-1 tabular-nums"
      >
        {final}
      </span>
      <span aria-hidden="true" className="col-start-1 row-start-1 tabular-nums">
        {live}
      </span>
      {/* Screen readers get the real range once, not sixty intermediate
          amounts. */}
      <span className="sr-only">{final}</span>
    </span>
  );
}
