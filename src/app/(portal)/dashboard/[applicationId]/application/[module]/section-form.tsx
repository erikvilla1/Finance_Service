"use client";

import { useActionState } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import type { Question } from "@/lib/questions";
import { saveSectionAction, type SectionState } from "./actions";

/**
 * One section of the full application.
 *
 * Every input is described by a row in `application_questions` — label, help
 * text, placeholder, type, options and validation all come from the database
 * (spec §9). Adding a field to the funding application is an insert, and this
 * component never learns its name.
 *
 * Values are uncontrolled, with defaultValue from what is already saved. A
 * controlled form here would mean holding forty pieces of state to solve a
 * problem nobody has: the browser is perfectly good at remembering what someone
 * typed into an input, and the save posts the whole section anyway.
 */
export function SectionForm({
  applicationId,
  module,
  questions,
  values,
  readOnly,
}: {
  applicationId: string;
  module: string;
  questions: Question[];
  values: Record<string, unknown>;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState<SectionState, FormData>(
    saveSectionAction,
    {},
  );

  return (
    <form action={formAction} className="mt-6 space-y-6">
      <input type="hidden" name="application_id" value={applicationId} />
      <input type="hidden" name="module" value={module} />

      {/*
        Uncontrolled inputs are what makes a rejected save survivable. The
        action re-renders this component, but defaultValue only applies on
        mount, so what someone typed is still sitting in the DOM — they fix the
        one field that was wrong instead of retyping the section.
      */}
      {questions.map((question) => (
        <QuestionField
          key={question.key}
          question={question}
          value={values[question.key]}
          error={state.fieldErrors?.[question.key]}
          disabled={readOnly}
        />
      ))}

      {state.error && (
        <p role="alert" className="text-sm font-medium text-danger-700">
          {state.error}
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

function QuestionField({
  question,
  value,
  error,
  disabled,
}: {
  question: Question;
  value: unknown;
  error?: string;
  disabled: boolean;
}) {
  const id = question.key;
  const current = value == null ? "" : String(value);

  return (
    <Field
      label={question.label}
      htmlFor={id}
      hint={question.helpText ?? undefined}
      error={error}
      required={question.isRequired}
    >
      {renderControl(question, id, current, disabled)}
    </Field>
  );
}

function renderControl(
  question: Question,
  id: string,
  current: string,
  disabled: boolean,
) {
  const shared = {
    id,
    name: question.key,
    disabled,
    placeholder: question.placeholder ?? undefined,
  };

  switch (question.type) {
    case "boolean":
      // A select rather than a checkbox, because an unchecked checkbox and an
      // unanswered question post identically — and "no existing MCA" is a very
      // different fact from "did not get to that question yet".
      return (
        <Select {...shared} defaultValue={current}>
          <option value="">Select…</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>
      );

    case "select":
      return (
        <Select {...shared} defaultValue={current}>
          <option value="">Select…</option>
          {question.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );

    case "textarea":
      return <Textarea {...shared} defaultValue={current} />;

    case "currency":
      // Deliberately not type="number". Someone typing "1,200,000" into a
      // number input gets silently emptied by the browser; the save path strips
      // the punctuation instead.
      return (
        <Input
          {...shared}
          type="text"
          inputMode="decimal"
          defaultValue={current}
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
          defaultValue={current}
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
          defaultValue={current}
        />
      );

    case "date":
      // Trimmed because Postgres hands back a timestamp for some date columns
      // and <input type="date"> silently renders nothing for anything that is
      // not exactly yyyy-mm-dd.
      return <Input {...shared} type="date" defaultValue={current.slice(0, 10)} />;

    case "email":
      return <Input {...shared} type="email" autoComplete="email" defaultValue={current} />;

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
          defaultValue={current}
        />
      );

    default:
      return (
        <Input
          {...shared}
          type="text"
          maxLength={question.validation.max}
          pattern={question.validation.pattern}
          defaultValue={current}
        />
      );
  }
}
