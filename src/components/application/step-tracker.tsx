"use client";

import { Check } from "lucide-react";

/**
 * Numbered step indicator for the prequal wizard.
 *
 * Built on the project's own tokens rather than installed. The reference
 * component this follows is shadcn-shaped — it needs `cn`, class-variance-
 * authority, @radix-ui/react-slot and @radix-ui/react-label, and it reads
 * shadcn theme variables (--foreground, --muted, --background) that do not
 * exist here. Four packages and a parallel colour system for what is, once the
 * chrome is stripped off, a row of circles and some connecting lines.
 *
 * COMPLETED STEPS ARE CLICKABLE, FUTURE ONES ARE NOT. Jumping back to fix an
 * answer is the whole reason a stepper beats a progress bar. Jumping forward
 * would skip the validation the wizard exists to enforce, so those are disabled
 * rather than hidden — a greyed circle still tells the applicant how much is
 * left, which is the other half of the job.
 */
export function StepTracker({
  count,
  current,
  onSelect,
  labels,
}: {
  /** Total number of steps. */
  count: number;
  /** Zero-based index of the step being answered. */
  current: number;
  /** Called with a step index. Only ever fires for completed steps. */
  onSelect?: (index: number) => void;
  /** Accessible names, one per step. Falls back to "Step n". */
  labels?: string[];
}) {
  const pct = Math.round(((current + 1) / Math.max(count, 1)) * 100);

  return (
    <div>
      <ol className="flex flex-wrap items-center gap-y-2">
        {Array.from({ length: count }).map((_, i) => {
          const done = i < current;
          const active = i === current;
          const name = labels?.[i] ?? `Step ${i + 1}`;

          return (
            <li key={i} className="flex items-center">
              <button
                type="button"
                onClick={() => done && onSelect?.(i)}
                disabled={!done}
                aria-label={
                  done
                    ? `Go back to step ${i + 1}: ${name}`
                    : `Step ${i + 1}: ${name}`
                }
                aria-current={active ? "step" : undefined}
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                  "transition-colors duration-300",
                  done
                    ? "cursor-pointer bg-brand-100 text-brand-700 hover:bg-brand-200"
                    : active
                      ? // brand-900, not brand-600: the mid tone read as a
                        // washed-out charcoal against the cream page, and the
                        // step you are on should be the darkest thing in the
                        // row.
                        "bg-brand-900 text-white"
                      : // Upcoming steps sit on a cream page, where ink-100 is
                        // almost the same value as the ground behind it — the
                        // circles disappeared and the numerals were too faint
                        // to read. White with a ring reads as a real step that
                        // has not been reached yet, rather than as nothing.
                        "cursor-default bg-white text-ink-600 ring-1 ring-inset ring-ink-200",
                ].join(" ")}
              >
                {done ? (
                  <Check aria-hidden="true" className="h-4 w-4" strokeWidth={3} />
                ) : (
                  <span className="tabular-nums">{i + 1}</span>
                )}
              </button>

              {i < count - 1 && (
                <span
                  aria-hidden="true"
                  className="relative mx-1.5 h-[2px] w-5 overflow-hidden rounded-full bg-ink-300/70 sm:w-7"
                >
                  {/* Scaled rather than resized: transform animates on the
                      compositor, width forces layout on every frame. */}
                  <span
                    className="absolute inset-0 origin-left bg-brand-500 transition-transform duration-500 ease-out"
                    style={{ transform: `scaleX(${done ? 1 : 0})` }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Question progress"
        className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-ink-100"
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
