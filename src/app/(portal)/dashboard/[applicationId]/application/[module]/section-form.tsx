"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import type { Question } from "@/lib/questions";
import { hiddenQuestionKeys } from "@/lib/questions/rules";
import type { QuestionRuleRow } from "@/types/database";
import { saveSectionAction, type SectionState } from "./actions";

/**
 * One section of the full application.
 *
 * Every input is described by a row in `application_questions` — label, help
 * text, placeholder, type, options and validation all come from the database
 * (spec §9). Adding a field to the funding application is an insert, and this
 * component never learns its name.
 *
 * THE INPUTS ARE CONTROLLED, AND THEY HAVE TO BE.
 *
 * The first version left them uncontrolled on the reasoning that the browser
 * already remembers what someone typed, so a rejected save would leave their
 * work in the DOM to correct. That is wrong, and it destroyed real data during
 * testing: React 19 resets a form automatically once a `<form action={...}>`
 * submission completes. Not on success — on completion. A section rejected for
 * one malformed phone number came back with all eighteen fields blank and the
 * applicant no way to recover them.
 *
 * The cost is one piece of state holding every field, which is a good deal less
 * than the "forty pieces of state" the original comment worried about, and it
 * was never worth trading a form people fill in on a phone for.
 */
export function SectionForm({
  applicationId,
  module,
  questions,
  values,
  rules,
  baseValues,
  readOnly,
}: {
  applicationId: string;
  module: string;
  questions: Question[];
  values: Record<string, unknown>;
  rules: QuestionRuleRow[];
  baseValues: Record<string, unknown>;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState<SectionState, FormData>(
    saveSectionAction,
    {},
  );

  const [draft, setDraft] = useState<Record<string, string>>(() =>
    seedFrom(questions, values),
  );

  /**
   * Which follow-up questions the current answers have earned.
   *
   * Evaluated here rather than on the server, where it used to happen once at
   * page load. Answering "yes, there was a bankruptcy" now reveals the year
   * immediately, instead of doing nothing until a save and reload.
   *
   * `baseValues` underneath the draft so a rule that reads a field from another
   * section still resolves — the browser only holds this section's fields.
   */
  const hidden = hiddenQuestionKeys(rules, {
    ...baseValues,
    ...typedDraft(questions, draft),
  });

  const visible = questions.filter((question) => !hidden.has(question.key));

  const errorRef = useRef<HTMLParagraphElement>(null);

  // The summary sits under the last field, so on a long section a rejection can
  // land entirely below the fold — which reads as the button doing nothing.
  useEffect(() => {
    if (state.error) {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state.error]);

  const failed = state.fieldErrors ?? {};
  const failedLabels = questions
    .filter((question) => failed[question.key])
    .map((question) => question.label);

  // A hidden field is not submitted, and the save path only writes what it is
  // sent — so a question that stops applying keeps whatever it had rather than
  // being nulled behind the applicant's back.

  return (
    <form action={formAction} className="mt-6 space-y-6">
      <input type="hidden" name="application_id" value={applicationId} />
      <input type="hidden" name="module" value={module} />

      {visible.map((question) => (
        <QuestionField
          key={question.key}
          question={question}
          value={draft[question.key] ?? ""}
          onChange={(next) =>
            setDraft((current) => ({ ...current, [question.key]: next }))
          }
          error={failed[question.key]}
          disabled={readOnly}
        />
      ))}

      {state.error && (
        <p
          ref={errorRef}
          role="alert"
          className="rounded-lg bg-danger-50 p-4 text-sm font-medium leading-relaxed text-danger-700"
        >
          {state.error}
          {/* Naming them saves scrolling a section hunting for red text. */}
          {failedLabels.length > 0 && (
            <span className="mt-1 block font-normal">
              {failedLabels.join(", ")}
            </span>
          )}
        </p>
      )}

      {state.saved && !state.error && (
        <p role="status" className="text-sm font-medium text-success-700">
          Saved.
        </p>
      )}

      {!readOnly && (
        <div className="flex items-center gap-3 border-t border-ink-100 pt-5">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save and continue"}
          </Button>
          <p className="text-sm text-ink-500">
            You can leave this and come back — nothing is lost.
          </p>
        </div>
      )}
    </form>
  );
}

/**
 * Saved values as form strings.
 *
 * Dates need trimming because Postgres returns a timestamp for some date
 * columns and `<input type="date">` renders nothing at all for anything that is
 * not exactly yyyy-mm-dd — silently, so the field looks unanswered.
 */
/**
 * Draft strings back into the shapes the rules compare against.
 *
 * Rules test `=== true`, so a boolean sitting in form state as the string
 * "true" would never match and its follow-up would never appear. Same coercion
 * the save path applies, kept deliberately simple: only the types any rule
 * actually reads need converting.
 */
function typedDraft(
  questions: Question[],
  draft: Record<string, string>,
): Record<string, unknown> {
  const typed: Record<string, unknown> = {};

  for (const question of questions) {
    const raw = draft[question.key];

    if (raw === undefined || raw === "") {
      typed[question.key] = null;
      continue;
    }

    switch (question.type) {
      case "boolean":
        typed[question.key] = raw === "true";
        break;
      case "number":
      case "currency":
      case "percent": {
        const value = Number(raw.replace(/[$,\s%]/g, ""));
        typed[question.key] = Number.isFinite(value) ? value : null;
        break;
      }
      default:
        typed[question.key] = raw;
    }
  }

  return typed;
}

function seedFrom(
  questions: Question[],
  values: Record<string, unknown>,
): Record<string, string> {
  const seed: Record<string, string> = {};

  for (const question of questions) {
    const value = values[question.key];
    if (value === null || value === undefined) {
      seed[question.key] = "";
      continue;
    }

    seed[question.key] =
      question.type === "date" ? String(value).slice(0, 10) : String(value);
  }

  return seed;
}

function QuestionField({
  question,
  value,
  onChange,
  error,
  disabled,
}: {
  question: Question;
  value: string;
  onChange: (next: string) => void;
  error?: string;
  disabled: boolean;
}) {
  const id = question.key;

  return (
    <Field
      label={question.label}
      htmlFor={id}
      hint={question.helpText ?? undefined}
      error={error}
      required={question.isRequired}
    >
      {renderControl(question, id, value, onChange, disabled)}
    </Field>
  );
}

function renderControl(
  question: Question,
  id: string,
  value: string,
  onChange: (next: string) => void,
  disabled: boolean,
) {
  const shared = {
    id,
    name: question.key,
    disabled,
    value,
    onChange: (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => onChange(event.target.value),
    placeholder: question.placeholder ?? undefined,
  };

  switch (question.type) {
    case "boolean":
      // A select rather than a checkbox, because an unchecked checkbox and an
      // unanswered question post identically — and "no existing MCA" is a very
      // different fact from "did not get to that question yet".
      return (
        <Select {...shared}>
          <option value="">Select…</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>
      );

    case "select":
      return (
        <Select {...shared}>
          <option value="">Select…</option>
          {question.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );

    case "textarea":
      return <Textarea {...shared} />;

    case "currency":
      // Deliberately not type="number". Someone typing "1,200,000" into a
      // number input gets silently emptied by the browser; the save path strips
      // the punctuation instead.
      return (
        <Input
          {...shared}
          type="text"
          inputMode="decimal"
          placeholder={question.placeholder ?? "$0"}
        />
      );

    case "percent":
      return (
        <Input
          {...shared}
          type="number"
          inputMode="decimal"
          min={question.validation.min ?? 0}
          max={question.validation.max ?? 100}
          step="0.01"
        />
      );

    case "number":
      return (
        <Input
          {...shared}
          type="number"
          inputMode="numeric"
          min={question.validation.min}
          max={question.validation.max}
        />
      );

    case "date":
      return <Input {...shared} type="date" />;

    case "email":
      return <Input {...shared} type="email" autoComplete="email" />;

    case "phone":
      // pattern and maxLength come from the question row, not from here — the
      // rules live in the database (migration 0023) so the next validated field
      // is an insert rather than an edit to this switch. They are enforced
      // again on save, because a pattern attribute stops honest mistakes and
      // nothing else.
      return (
        <Input
          {...shared}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={question.validation.max}
          pattern={question.validation.pattern}
        />
      );

    default:
      return (
        <Input
          {...shared}
          type="text"
          maxLength={question.validation.max}
          pattern={question.validation.pattern}
        />
      );
  }
}
