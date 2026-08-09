"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import { Input } from "@/components/ui";

/**
 * A money field that shows thousands separators while you type.
 *
 * WHY THIS IS NOT `type="number"`. A number input cannot display "400,000" —
 * the browser rejects the grouping character and the field either clears itself
 * or refuses the keystroke. Six-figure amounts are the common case here, and
 * "400000" is a figure the applicant has to count digits on to trust. So this is
 * a text input carrying `inputMode="numeric"`, which still raises the numeric
 * keypad on a phone.
 *
 * NOTHING ON THE SERVER CHANGES. Both parseAmount() and parseCreditScore() in
 * the prequal action already strip everything outside [0-9.] before parsing, so
 * a submitted "400,000" arrives as 400000 whether or not this component is used.
 * That is worth keeping true: the field degrades to a plain text input without
 * JavaScript, and the value it posts is still read correctly.
 */

function format(raw: string): string {
  // One decimal point survives, everything else that isn't a digit is dropped.
  const cleaned = raw.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  const whole = firstDot === -1 ? cleaned : cleaned.slice(0, firstDot);
  const fraction =
    firstDot === -1 ? null : cleaned.slice(firstDot + 1).replace(/\./g, "");

  // Cents, and no further. Anything beyond is a typo the applicant can't see.
  const grouped = whole.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (fraction === null) return grouped;
  return `${grouped}.${fraction.slice(0, 2)}`;
}

/** Digits (and the decimal point) to the left of the caret, ignoring commas. */
function significantBefore(value: string, caret: number): number {
  return value.slice(0, caret).replace(/[^\d.]/g, "").length;
}

/** Where that many significant characters lands in the formatted string. */
function caretAfterFormat(formatted: string, significant: number): number {
  if (significant <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/[\d.]/.test(formatted[i])) seen += 1;
    if (seen === significant) return i + 1;
  }
  return formatted.length;
}

export function AmountInput({
  defaultValue,
  ...props
}: Omit<ComponentPropsWithoutRef<"input">, "type" | "value" | "onChange"> & {
  defaultValue?: string;
}) {
  const [value, setValue] = useState(() => format(String(defaultValue ?? "")));

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={value}
      onChange={(event) => {
        const input = event.currentTarget;
        const caret = input.selectionStart ?? input.value.length;
        const significant = significantBefore(input.value, caret);
        const formatted = format(input.value);

        setValue(formatted);

        // Re-anchoring the caret is not cosmetic: inserting a comma shifts every
        // character to its right, and without this, editing the middle of a
        // number throws the cursor to the end on the keystroke that adds a
        // separator. Deferred because React has not written the value yet.
        requestAnimationFrame(() => {
          const next = caretAfterFormat(formatted, significant);
          input.setSelectionRange(next, next);
        });
      }}
    />
  );
}
