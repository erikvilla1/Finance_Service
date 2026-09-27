import { isShown } from "./conditions";
import { US_STATES } from "./states";
import type { Answers, Facts, FieldDef } from "./types";

/**
 * Posted form data in, validated answers out.
 *
 * Kept out of the server action so it can be tested without a database, and
 * so any other entry point (an API, an import) reads answers the same way.
 */

const STATE_CODES = new Set(US_STATES.map((state) => state.value));

/** The subset of FormData this reads, so a test can pass a plain object. */
export interface FormLike {
  get(name: string): FormDataEntryValue | null;
  getAll(name: string): FormDataEntryValue[];
}

/**
 * One field's answer, validated against its own definition. Option answers
 * must be one of the field's options; amounts must be finite and
 * non-negative. Anything else is dropped rather than stored, because it came
 * from the client.
 */
export function readField(field: FieldDef, form: FormLike): Answers[string] {
  const allowed = new Set((field.options ?? []).map((option) => option.value));

  switch (field.type) {
    case "multi_select": {
      const values = form
        .getAll(field.id)
        .filter((v): v is string => typeof v === "string" && allowed.has(v));
      return values.length ? [...new Set(values)] : undefined;
    }
    case "single_select": {
      const raw = form.get(field.id);
      return typeof raw === "string" && allowed.has(raw) ? raw : undefined;
    }
    case "state": {
      const raw = form.get(field.id);
      return typeof raw === "string" && STATE_CODES.has(raw) ? raw : undefined;
    }
    default: {
      const raw = form.get(field.id);
      if (typeof raw !== "string" || !raw.trim()) return undefined;
      const parsed = Number(raw.replace(/[^0-9.]/g, ""));
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
    }
  }
}

/**
 * Every answer the applicant could actually see.
 *
 * Visibility is re-derived here, in question order, from the answers kept so
 * far. The wizard disables hidden fields, but a request can come from anywhere
 * (or from the no-JS form, which shows everything), and an answer to a
 * question that shouldn't have been asked — a purchase price on a refinance —
 * would feed the engine a fact that isn't true.
 */
export function readAnswers(fields: FieldDef[], form: FormLike): Answers {
  const answers: Answers = {};
  for (const field of fields) {
    if (!isShown(field.showIf, answers as Facts)) continue;
    const value = readField(field, form);
    if (value !== undefined) answers[field.id] = value;
  }
  return answers;
}
