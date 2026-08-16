"use client";

import type { ComponentPropsWithoutRef, KeyboardEvent, ClipboardEvent } from "react";
import { Input } from "@/components/ui";

/**
 * A number input that refuses characters which could never form a valid answer.
 *
 * WHY THIS EXISTS. `min` and `max` on a native number input are advisory: the
 * browser will happily accept 9999 in a field bounded at 850 and only object at
 * submit time. In this wizard that object arrives at the worst possible moment
 * — by then the field is on a step hidden with display:none, so the browser
 * cannot focus it to show the message, the submit is silently cancelled, and
 * the applicant is left clicking a button that does nothing.
 *
 * WHAT IS BLOCKED, AND WHAT IS DELIBERATELY NOT.
 *
 *   Blocked outright: `e`, `E`, `+`, `-`, `.` and `,`. A number input accepts
 *   all of these (they are legal in "1e-3"), and none of them belong in a
 *   credit score or any other bounded integer. Left alone they are also the
 *   way to produce a value the input reports as an empty string, which reads
 *   downstream as an unanswered question rather than a wrong one.
 *
 *   Blocked once the field is full: any digit past the width of `max`. 850 is
 *   three digits, so a fourth cannot be typed.
 *
 *   NOT blocked: a short value that is below `min`. "3" has to be typeable on
 *   the way to "300", so nothing keyed one character at a time can be judged
 *   against the lower bound. That check belongs after the fact, which is what
 *   the range error in the wizard does — it holds back the Next control and
 *   says what the acceptable range is, rather than eating keystrokes and
 *   leaving the applicant to guess why the field will not take their answer.
 *
 * The value is never silently corrected. Clamping 900 to 850 would answer a
 * question about the applicant's credit on their behalf, and it is the single
 * most powerful input the qualification engine reads (docs/PREQUAL_MODEL.md).
 */
export function BoundedNumberInput({
  min,
  max,
  onKeyDown,
  onPaste,
  ...props
}: Omit<ComponentPropsWithoutRef<"input">, "min" | "max" | "type"> & {
  min?: number;
  max?: number;
}) {
  const maxDigits = max == null ? null : String(Math.trunc(Math.abs(max))).length;

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    // Leave shortcuts alone — this must not break select-all, copy or paste.
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    // Anything with a multi-character name is a key, not a character:
    // Backspace, Tab, Enter, ArrowUp (the spinner, which min/max already bound).
    if (event.key.length !== 1) return;

    if (!/[0-9]/.test(event.key)) {
      event.preventDefault();
      return;
    }

    if (maxDigits == null) return;
    const input = event.currentTarget;
    if (input.value.length - selectionLength(input) >= maxDigits) {
      event.preventDefault();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    onPaste?.(event);
    if (event.defaultPrevented) return;

    const pasted = event.clipboardData.getData("text").trim();
    const tooLong = maxDigits != null && pasted.length > maxDigits;
    if (!/^[0-9]+$/.test(pasted) || tooLong) event.preventDefault();
  }

  return (
    <Input
      {...props}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
    />
  );
}

/**
 * How much text the caret has selected, which a keystroke is about to replace.
 *
 * Without this, typing over a fully-selected "850" would be refused as a fourth
 * digit — the field looks full, so the length check fires even though the
 * keystroke would leave one character behind.
 *
 * The try/catch is not defensive padding. Reading selectionStart on an input of
 * type="number" throws InvalidStateError in Chrome and Safari, because the spec
 * only defines selection on text-like inputs. An unguarded read here would
 * throw inside the keydown handler on every single keypress.
 */
function selectionLength(input: HTMLInputElement) {
  try {
    const { selectionStart, selectionEnd } = input;
    if (selectionStart == null || selectionEnd == null) return 0;
    return selectionEnd - selectionStart;
  } catch {
    return 0;
  }
}
