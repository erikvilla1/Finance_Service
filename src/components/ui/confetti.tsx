"use client";

import { useEffect, useState } from "react";

/**
 * White confetti falling from the top of the viewport, once, then gone.
 *
 * -----------------------------------------------------------------------------
 * NOT THE REFERENCE'S IMPLEMENTATION, and this one is not a close call.
 *
 * That version renders a Lottie animation through react-lottie. Taking it would
 * have meant:
 *
 *   react-lottie, which is unmaintained, plus its lottie-web peer — roughly
 *   250KB of animation runtime to make squares fall down a page.
 *
 *   A 40KB JSON blob pasted into a component file. It is four separate
 *   pre-comps — blue, green, yellow and red — so "white only" means rewriting
 *   the fill values inside a minified After Effects export by hand, and any
 *   future change to it means doing that again.
 *
 *   No control over piece count, density or timing, because those are baked
 *   into the export rather than exposed as props.
 *
 * Falling rectangles are a transform and a keyframe. This is the whole thing.
 * -----------------------------------------------------------------------------
 *
 * GENERATED AFTER MOUNT, NOT DURING RENDER. Every piece needs random position,
 * delay, speed and spin. Random values computed while rendering differ between
 * the server pass and the client pass, and React throws a hydration mismatch —
 * so the array starts empty, the server sends nothing, and the pieces appear in
 * an effect. It also means no confetti without JavaScript, which for decoration
 * is the correct failure.
 *
 * IT DELETES ITSELF. Once the last piece has left the bottom of the screen the
 * state is cleared and the component renders null, so ~90 absolutely positioned
 * elements are not left in the document for the rest of the session on a page
 * people sit and read.
 */

interface Piece {
  /** Horizontal start, as a percentage of the viewport. */
  left: number;
  /** Seconds before this piece starts falling. */
  delay: number;
  /** Seconds it takes to cross the screen. */
  duration: number;
  width: number;
  height: number;
  /** Horizontal travel over the fall, so pieces do not drop in straight lines. */
  drift: number;
  /** Total rotation over the fall. */
  spin: number;
}

const random = (min: number, max: number) => min + Math.random() * (max - min);

export function Confetti({
  pieceCount = 90,
  /**
   * Longest a piece can take to land. The component clears itself once the
   * slowest possible piece is guaranteed to be off screen, so nothing vanishes
   * mid-fall.
   */
  maxFallSeconds = 4.2,
  maxDelaySeconds = 1.4,
}: {
  pieceCount?: number;
  maxFallSeconds?: number;
  maxDelaySeconds?: number;
}) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    // Honoured directly rather than through the blanket rule in globals.css:
    // that rule collapses animation duration, which here would drop ninety
    // squares onto the page in a single frame rather than removing them.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setPieces(
      Array.from({ length: pieceCount }, () => ({
        left: random(-2, 102),
        delay: random(0, maxDelaySeconds),
        duration: random(maxFallSeconds * 0.6, maxFallSeconds),
        width: random(5, 9),
        height: random(9, 16),
        drift: random(-12, 12),
        spin: random(-540, 540),
        // NO OPACITY VARIATION. There was some, to stop the field reading as
        // one flat sheet — but a white piece at 0.8 over a cream page is a
        // cream piece, and "super white" was the requirement. Size, speed,
        // drift and spin already carry the variety.
      })),
    );

    const clear = window.setTimeout(
      () => setPieces([]),
      (maxDelaySeconds + maxFallSeconds) * 1000,
    );
    return () => window.clearTimeout(clear);
  }, [pieceCount, maxFallSeconds, maxDelaySeconds]);

  if (pieces.length === 0) return null;

  return (
    <div
      // Decorative and celebratory — there is nothing here for a screen reader
      // to gain, and the page already says "Prequalification complete" in text.
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {pieces.map((piece, index) => (
        <span
          key={index}
          className="confetti-piece absolute top-0 block bg-white"
          style={{
            left: `${piece.left}%`,
            width: `${piece.width}px`,
            height: `${piece.height}px`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            ["--confetti-drift" as string]: `${piece.drift}vw`,
            ["--confetti-spin" as string]: `${piece.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}
