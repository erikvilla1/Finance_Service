import { Fragment } from "react";

/**
 * Text that types itself in, a letter at a time, each coming into focus
 * from a soft blur rather than snapping on.
 *
 * The softness is the point. A hard typewriter (letters popping in beside a
 * blinking block cursor) reads as a terminal; letters easing out of a blur at
 * a steady pace read as considered, which is the register the flow's
 * account step is going for.
 *
 * CSS only (.type-in-char in globals.css), so it's server-rendered and plays
 * without waiting for hydration. Each letter is its own span with its own
 * delay; words are kept whole in nowrap spans so a line never breaks
 * mid-word. The visual copy is aria-hidden and the sentence is given once,
 * whole, to assistive tech. Reduced motion shows it immediately.
 */
export function TypeIn({
  text,
  delayMs = 0,
  stepMs = 34,
}: {
  text: string;
  /** Before the first letter. */
  delayMs?: number;
  /** Between letters. */
  stepMs?: number;
}) {
  const words = text.split(" ");
  // Index of each word's first letter in the whole string (spaces count, so
  // the pause between words matches a letter's).
  const starts = words.map((_, w) =>
    words.slice(0, w).reduce((sum, word) => sum + word.length + 1, 0),
  );

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, w) => (
          <Fragment key={w}>
            <span className="whitespace-nowrap">
              {[...word].map((char, c) => (
                <span
                  key={c}
                  className="type-in-char"
                  style={{ animationDelay: `${delayMs + (starts[w] + c) * stepMs}ms` }}
                >
                  {char}
                </span>
              ))}
            </span>
            {w < words.length - 1 && " "}
          </Fragment>
        ))}
      </span>
    </>
  );
}
