"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { assessPassword } from "@/lib/auth/password-policy";

/**
 * Password strength meter.
 *
 * WHY NOT `motion`. The reference drives every segment and label with a spring
 * from motion/react. The visible result is a bar that scales and some text that
 * cross-fades — CSS transitions do both, on the compositor, for nothing. A
 * springy password meter is not worth a runtime animation library on a form
 * whose job is to take four fields and get out of the way.
 *
 * WHY THE RULES ARE IMPORTED, NOT DECLARED HERE. See password-policy.ts: the
 * server validates against the same definitions, so this cannot advertise a
 * requirement the server ignores or miss one it enforces.
 *
 * ONLY REQUIRED RULES ARE LISTED. The advisory ones used to appear greyed out
 * with an "optional" tag beside them, which reads as a checklist you are
 * failing at while being told not to worry about it. They still contribute to
 * the score — meeting both is the difference between Fair and Strong — but a
 * requirement list should contain requirements.
 *
 * THE ANNOUNCEMENT IS DELAYED. A live region tied directly to keystrokes makes
 * a screen reader read a new strength rating on every character. Settling for
 * ~700ms of quiet means it speaks once, when the typing pauses.
 */
export function PasswordStrength({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const { score, max, label, rules, guessable } = assessPassword(value);

  /*
    ONLY THE RULES THAT GATE SUBMISSION ARE LISTED.

    The advisory ones were shown with an "optional" tag, which is a checklist
    item that punishes you for not doing something it just told you not to
    bother doing. They still count — they are what separates Fair from Strong —
    they are simply not presented as a to-do list.
  */
  const shownRules = rules.filter((rule) => rule.required);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    // Everything happens in the timer, so nothing is set in the effect body.
    // The delay is the point regardless: a live region wired straight to
    // keystrokes makes a screen reader announce a new rating on every
    // character.
    const id = window.setTimeout(() => {
      if (!value) {
        setAnnouncement("");
        return;
      }
      const unmet = rules
        .filter((rule) => !rule.met)
        .map((rule) => rule.label.toLowerCase());
      setAnnouncement(
        [
          `Password strength ${label.toLowerCase()}.`,
          guessable ? "This is a commonly guessed pattern." : "",
          unmet.length
            ? `Still to add: ${unmet.join(", ")}.`
            : "All suggestions met.",
        ]
          .filter(Boolean)
          .join(" "),
      );
    }, 700);

    return () => window.clearTimeout(id);
    // rules/label/guessable are all derived from value on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // One tone per stage, now that there are exactly three.
  const tone =
    score === 0
      ? { bar: "bg-ink-300", text: "text-ink-500" }
      : score === 1
        ? { bar: "bg-danger-600", text: "text-danger-700" }
        : score === 2
          ? { bar: "bg-warning-600", text: "text-warning-700" }
          : { bar: "bg-success-600", text: "text-success-700" };

  return (
    <div className={className}>
      <div
        role="meter"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={score}
        aria-valuetext={label || "Empty"}
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${max}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className="h-1.5 overflow-hidden rounded-full bg-ink-200"
          >
            {/* scaleX rather than width: transform animates on the compositor,
                width forces layout on every frame of every keystroke. */}
            <span
              className={`block h-full origin-left rounded-full transition-transform duration-300 ease-out ${tone.bar}`}
              style={{
                transform: `scaleX(${i < score ? 1 : 0})`,
                transitionDelay: i < score ? `${i * 40}ms` : "0ms",
              }}
            />
          </span>
        ))}
      </div>

      <div className="mt-2 flex min-h-5 items-center justify-between gap-3">
        <span className={`text-xs font-semibold transition-colors ${tone.text}`}>
          {label}
        </span>
        {guessable && (
          <span className="text-xs font-medium text-danger-700">
            Commonly guessed
          </span>
        )}
      </div>

      <ul className="mt-3 space-y-1.5">
        {shownRules.map((rule) => (
          <li key={rule.id} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`grid h-4 w-4 shrink-0 place-items-center rounded transition-colors duration-200 ${
                rule.met
                  ? "bg-success-600 text-white"
                  : "border border-ink-300 text-transparent"
              }`}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
            </span>
            <span
              className={`text-xs transition-colors duration-200 ${
                rule.met ? "text-ink-700" : "text-ink-500"
              }`}
            >
              {rule.label}
            </span>
          </li>
        ))}
      </ul>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
