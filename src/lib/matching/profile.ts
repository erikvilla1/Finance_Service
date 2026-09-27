import { UNIVERSAL_PROFILE } from "./questions";
import type { Answers } from "./types";

/**
 * The applicant's key answers, as short label/value pairs for the result
 * page ("Credit 700–719"). Repeating back what they told us is what makes the
 * result read as theirs rather than generic.
 *
 * Universal-profile questions only: every objective asks them, and they're
 * the ones an applicant recognises at a glance. Values are the question's own
 * option labels, so they read exactly as the applicant chose them.
 */

const CHIPS: { id: string; label: string }[] = [
  { id: "requested_amount_range", label: "Amount" },
  { id: "time_in_business", label: "In business" },
  { id: "owner_credit_range", label: "Credit" },
  { id: "industry", label: "Industry" },
];

const FIELDS = new Map(UNIVERSAL_PROFILE.map((field) => [field.id, field]));

export function profileChips(answers: Answers): { label: string; value: string }[] {
  return CHIPS.flatMap(({ id, label }) => {
    const raw = answers[id];
    if (typeof raw !== "string" || !raw) return [];
    const option = FIELDS.get(id)?.options?.find((o) => o.value === raw);
    return [{ label, value: option?.label ?? raw }];
  });
}
