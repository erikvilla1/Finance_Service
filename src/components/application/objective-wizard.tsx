"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { Button, Field, Input, Select } from "@/components/ui";
import { AmountInput } from "@/components/application/amount-input";
import { SubmitButton } from "@/components/application/submit-button";
import { SectionProgress } from "@/components/application/section-progress";
import {
  reportQuestionProgress,
  reportSubmitted,
} from "@/components/application/prequal-progress";
import { useHydrated } from "@/components/marketing/use-reduced-motion";
import { isShown } from "@/lib/matching/conditions";
import { US_STATES } from "@/lib/matching/states";
import type { Facts, FieldDef } from "@/lib/matching/types";

/**
 * The qualification questionnaire for one objective: the universal profile,
 * then that objective's branch (spec §4-6), one question at a time.
 *
 * Same interaction as the original prequal wizard: fades between steps, a
 * dropdown advances on its own, typed answers and checkboxes get a Next
 * button, Back and the section line revisit earlier answers, and the submit
 * appears only when every required question is answered.
 *
 * WHAT'S NEW IS THE BRANCHING. A field with `showIf` is only a step while its
 * condition holds (the purchase price only on a purchase, balances only when
 * there are open positions). The step list is recomputed from the answers on
 * every change, so changing an earlier answer adds or removes the questions
 * that depend on it. A field that is not shown is disabled, so it never posts
 * a stale answer.
 *
 * EVERY FIELD STAYS MOUNTED, hidden with CSS, for the reasons the original
 * wizard gives: answers survive Back and forward, the form posts everything,
 * and without JavaScript the page's <noscript> styles reveal every step as a
 * plain form. Before hydration nothing is disabled and conditional fields
 * aren't required, so that no-JS form can always be submitted.
 *
 * PREFILLED ANSWERS (a guide that already knows it's a fix & flip) are posted
 * as hidden inputs and skipped as steps.
 */

type Value = string | string[];

const FADE_MS = 180;
const AUTO_ADVANCE_MS = 260;
const THIS_YEAR = new Date().getFullYear();

const hasAnswer = (value: Value | undefined) =>
  Array.isArray(value) ? value.length > 0 : typeof value === "string" && value.trim() !== "";

const isVisible = (field: FieldDef, values: Record<string, Value>) =>
  isShown(field.showIf, values as Facts);

const advancesOnSelect = (field: FieldDef) =>
  field.type === "single_select" || field.type === "state";

export function ObjectiveWizard({
  fields,
  sections,
  prefill = {},
}: {
  fields: FieldDef[];
  /** Titled groups of field ids, for the progress bar (see sectionsFor). */
  sections: { title: string; fieldIds: string[] }[];
  prefill?: Record<string, string>;
}) {
  const hydrated = useHydrated();
  const [values, setValues] = useState<Record<string, Value>>(() => ({ ...prefill }));
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  const steps = useMemo(
    () => fields.filter((field) => !(field.id in prefill) && isVisible(field, values)),
    [fields, prefill, values],
  );

  // Answers can remove steps behind the cursor; never point past the end.
  const safeIndex = Math.min(index, Math.max(steps.length - 1, 0));
  const current = steps[safeIndex] ?? null;
  const onLastStep = safeIndex >= steps.length - 1;

  const answered = (field: FieldDef) => hasAnswer(values[field.id]);
  const allAnswered = steps.every((field) => !field.required || answered(field));

  // Sections over the visible steps. The questions are already in section
  // order (universal profile, then the branch), so each section is one run.
  const progress = useMemo(() => {
    const counts = sections.map((section) => {
      const ids = new Set(section.fieldIds);
      return steps.filter((field) => ids.has(field.id)).length;
    });
    return sections.map((section, i) => ({
      title: section.title,
      start: counts.slice(0, i).reduce((sum, n) => sum + n, 0),
      count: counts[i],
    }));
  }, [sections, steps]);

  // Drive the page's "2 of 3" bar (PrequalFlowProgress).
  //
  // EQUAL SLICES OF THE WHOLE FORM, NOT OF WHAT'S SHOWN. Every question this
  // objective could ask gets the same share of the bar, and the bar sits at
  // the current question's place in that full list. Dividing by the visible
  // steps instead made the bar slide backwards mid-form whenever an answer
  // added follow-ups (two balance questions after "2 positions"), and it
  // moved without the applicant moving. Now it only changes when they go to
  // another question: one slice per question, and a follow-up that doesn't
  // apply is stepped past, its slice included, rather than shrinking the
  // others. Full once everything is answered.
  const complete = onLastStep && allAnswered;
  const allSteps = useMemo(
    () => fields.filter((field) => !(field.id in prefill)),
    [fields, prefill],
  );
  const place = current ? allSteps.findIndex((field) => field.id === current.id) : 0;
  const fraction = complete ? 1 : allSteps.length ? Math.max(place, 0) / allSteps.length : 0;
  useEffect(() => {
    reportQuestionProgress(fraction);
  }, [fraction]);
  useEffect(
    () => () => {
      reportQuestionProgress(0);
      reportSubmitted(false);
    },
    [],
  );

  const move = useCallback((next: number) => {
    setShown(false);
    window.setTimeout(() => {
      setIndex(next);
      setAdvancing(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    }, FADE_MS);
  }, []);

  // A cleared answer is removed rather than stored as "", so a question that
  // depends on it hides again instead of reading "" as "not 0".
  const set = useCallback((id: string, value: Value) => {
    setValues((prev) => {
      const next = { ...prev };
      if (hasAnswer(value)) next[id] = value;
      else delete next[id];
      return next;
    });
  }, []);

  /** Typed answers (currency, number) arrive as bubbled change events. */
  const handleChange = useCallback(
    (event: FormEvent<HTMLDivElement>) => {
      const target = event.target as HTMLInputElement;
      const field = fields.find((f) => f.id === target.name);
      if (!field || (field.type !== "currency" && field.type !== "number")) return;
      set(field.id, target.value);
    },
    [fields, set],
  );

  const choose = (field: FieldDef, value: string) => {
    set(field.id, value);
    if (advancesOnSelect(field) && value && field.id === current?.id && !onLastStep) {
      setAdvancing(true);
      window.setTimeout(() => move(safeIndex + 1), AUTO_ADVANCE_MS);
    }
  };

  const toggle = (field: FieldDef, option: string) => {
    const selected = Array.isArray(values[field.id]) ? (values[field.id] as string[]) : [];
    let next: string[];
    if (selected.includes(option)) next = selected.filter((v) => v !== option);
    // "None" (and "None of these") excludes everything else, both ways.
    else if (option === "none") next = ["none"];
    else next = [...selected.filter((v) => v !== "none"), option];
    set(field.id, next);
  };

  return (
    <div onChange={handleChange}>
      {Object.entries(prefill).map(([id, value]) => (
        <input key={id} type="hidden" name={id} value={value} />
      ))}

      <div data-prequal-nav="" className="mb-6">
        <SectionProgress
          sections={progress}
          current={safeIndex}
          complete={complete}
          onSelect={move}
        />
      </div>

      {fields
        .filter((field) => !(field.id in prefill))
        .map((field) => {
          const visible = isVisible(field, values);
          const isCurrent = current?.id === field.id;
          const className = !isCurrent
            ? "hidden"
            : shown
              ? "opacity-100 transition-opacity duration-200"
              : "opacity-0 transition-opacity duration-200";
          return (
            <div key={field.id} data-prequal-step="" className={className}>
              <FieldControl
                field={field}
                value={values[field.id]}
                disabled={hydrated && !visible}
                // Before hydration (no JS) only unconditional required fields
                // are marked required, so the plain form stays submittable.
                // After, the wizard gates progress itself.
                required={!hydrated && field.required && !field.showIf}
                onChoose={(value) => choose(field, value)}
                onToggle={(option) => toggle(field, option)}
              />
            </div>
          );
        })}

      <div data-prequal-nav="" className="mt-6">
        {current && !onLastStep && (
          <div className="flex flex-wrap items-center gap-3">
            {answered(current) && !advancing && (
              <Button type="button" variant="contrast" size="lg" onClick={() => move(safeIndex + 1)}>
                Next
              </Button>
            )}
            {!current.required && !answered(current) && (
              <Button type="button" variant="secondary" size="lg" onClick={() => move(safeIndex + 1)}>
                Skip
              </Button>
            )}
          </div>
        )}

        {safeIndex > 0 && (
          <button
            type="button"
            onClick={() => move(safeIndex - 1)}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-ink-900"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            Back
          </button>
        )}
      </div>

      <div
        data-prequal-submit=""
        className={onLastStep && allAnswered ? "animate-fade-in-up mt-8 border-t border-ink-200 pt-6" : "hidden"}
      >
        <SubmitButton variant="contrast">See my financing options</SubmitButton>
        <p className="mt-4 text-sm leading-relaxed text-ink-500">
          Submitting this does not affect your credit and is not an application
          for credit. A financing specialist reviews every submission.
        </p>
      </div>
    </div>
  );
}

function FieldControl({
  field,
  value,
  disabled,
  required,
  onChoose,
  onToggle,
}: {
  field: FieldDef;
  value: Value | undefined;
  disabled: boolean;
  required: boolean;
  onChoose: (value: string) => void;
  onToggle: (option: string) => void;
}) {
  const id = `q-${field.id}`;
  const hint = field.help ?? (field.required ? undefined : "Optional");

  if (field.type === "multi_select") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset disabled={disabled}>
        <legend className="text-sm font-medium text-ink-900">{field.label}</legend>
        {hint && <p className="mt-1 text-sm text-ink-500">{hint}</p>}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(field.options ?? []).map((option) => {
            const checked = selected.includes(option.value);
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 text-sm transition-colors ${
                  checked
                    ? "border-brand-900 bg-brand-900/[0.03] text-ink-900"
                    : "border-ink-200 bg-white text-ink-700 hover:border-ink-400"
                }`}
              >
                <input
                  type="checkbox"
                  name={field.id}
                  value={option.value}
                  checked={checked}
                  onChange={() => onToggle(option.value)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                    checked ? "border-brand-900 bg-brand-900 text-white" : "border-ink-300 bg-white"
                  }`}
                >
                  {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  const options = field.type === "state" ? US_STATES : field.options;

  return (
    <Field label={field.label} htmlFor={id} hint={hint} required={field.required}>
      {field.type === "single_select" || field.type === "state" ? (
        <Select
          id={id}
          name={field.id}
          required={required}
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChoose(event.currentTarget.value)}
        >
          <option value="">{field.type === "state" ? "Select a state" : "Select an option"}</option>
          {(options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ) : field.type === "currency" ? (
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-500"
          >
            $
          </span>
          <AmountInput id={id} name={field.id} required={required} disabled={disabled} placeholder="0" className="pl-7" />
        </div>
      ) : (
        <Input
          id={id}
          name={field.id}
          type="number"
          inputMode="numeric"
          required={required}
          disabled={disabled}
          min={field.id === "equipment_year" ? 1950 : 0}
          max={field.id === "equipment_year" ? THIS_YEAR + 1 : undefined}
          placeholder={field.id === "equipment_year" ? String(THIS_YEAR - 5) : undefined}
        />
      )}
    </Field>
  );
}
