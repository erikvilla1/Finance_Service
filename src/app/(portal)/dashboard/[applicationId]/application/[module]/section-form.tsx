"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { AmountInput } from "@/components/application/amount-input";
import { primaryButton } from "@/components/portal/ui";
import type { Question } from "@/lib/questions";
import { hiddenQuestionKeys } from "@/lib/questions/rules";
import type { QuestionRuleRow } from "@/types/database";
import { saveSectionAction, type SectionState } from "./actions";
import { CoOwnersBlock } from "./co-owners-block";
import { toPercent, type CoOwner } from "@/lib/application-form/co-owners";

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
  nextHref,
  coOwners,
}: {
  applicationId: string;
  module: string;
  questions: Question[];
  values: Record<string, unknown>;
  rules: QuestionRuleRow[];
  baseValues: Record<string, unknown>;
  readOnly: boolean;
  /** Where a successful save goes: the application overview. */
  nextHref: string;
  /** The additional-owner lines as saved (owner section only). */
  coOwners?: CoOwner[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  // Field errors from either path (autosave or the button), by question key.
  // Held here rather than read off the action state so autosave can set them
  // and typing in a field can clear its own.
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Autosave bookkeeping (see AUTOSAVE below).
  const pendingSave = useRef(false);
  const inFlight = useRef(false);
  const debounce = useRef<number | undefined>(undefined);

  // "Save and continue" saves and goes back to the overview. A save with a
  // rejected field stays put so it can be fixed; the button reads "Saving…"
  // until the next page is up, because the navigation runs inside the same
  // transition.
  const [state, formAction, pending] = useActionState<SectionState, FormData>(
    async (previous, formData) => {
      pendingSave.current = false;
      window.clearTimeout(debounce.current);
      const result = await saveSectionAction(previous, formData);
      setErrors(result.fieldErrors ?? {});
      if (result.saved && !result.error) router.push(nextHref);
      return result;
    },
    {},
  );

  const [draft, setDraft] = useState<Record<string, string>>(() =>
    seedFrom(questions, values),
  );

  /*
   * AUTOSAVE. "Your answers save as you go" was on the dashboard in four
   * places and wasn't true: nothing was written until the button. Now the
   * whole section (exactly what the button would send) is saved a moment
   * after typing stops, as soon as someone leaves a field, and when the tab
   * is hidden or the page is left.
   *
   * The WHOLE section, not the one field: the business row is created on the
   * first save that carries a legal name, and a lone "city" would be refused.
   *
   * One save at a time. A change that lands while one is in flight marks the
   * section dirty again and is saved as soon as it returns, so the last word
   * always gets written.
   *
   * A field's error isn't shown while the cursor is still in it: "that
   * number is too short" after three digits is nagging, not help.
   */
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [autosave, setAutosave] = useState<
    { state: "idle" } | { state: "saving" } | { state: "saved" } | { state: "error"; message: string }
  >({ state: "idle" });

  // The latest flush, for timers and listeners set up earlier than this render.
  const flushRef = useRef<() => void>(() => {});
  // The form's contents as of the last render. Used when leaving the page:
  // by the time an unmount cleanup runs, React has already detached formRef.
  const lastData = useRef<FormData | null>(null);

  async function flush() {
    const data = formRef.current ? new FormData(formRef.current) : lastData.current;
    if (readOnly || !data || !pendingSave.current) return;
    if (inFlight.current) return; // picked up when the current save returns
    pendingSave.current = false;
    window.clearTimeout(debounce.current);
    inFlight.current = true;
    setAutosave({ state: "saving" });
    try {
      const result = await saveSectionAction({}, data);
      setErrors(result.fieldErrors ?? {});
      setAutosave(
        result.error && !result.fieldErrors
          ? { state: "error", message: result.error }
          : result.fieldErrors
            ? { state: "error", message: "Saved, except the fields marked below." }
            : { state: "saved" },
      );
    } catch {
      pendingSave.current = true;
      setAutosave({ state: "error", message: "Couldn't save just now. We'll try again in a moment." });
    } finally {
      inFlight.current = false;
      if (pendingSave.current) debounce.current = window.setTimeout(() => flushRef.current(), 1500);
    }
  }

  useEffect(() => {
    flushRef.current = () => void flush();
    if (formRef.current) lastData.current = new FormData(formRef.current);
  });

  function scheduleSave() {
    if (readOnly) return;
    pendingSave.current = true;
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => flushRef.current(), 1200);
  }

  // Leaving: hide the tab, close it, or navigate within the portal.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushRef.current();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      window.clearTimeout(debounce.current);
      flushRef.current();
    };
  }, []);

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

  const failed = errors;
  const failedLabels = questions
    .filter((question) => failed[question.key])
    .map((question) => question.label);
  if (Object.keys(failed).some((key) => key.startsWith("co_owner_"))) {
    failedLabels.push("Other owners");
  }

  // A hidden field is not submitted, and the save path only writes what it is
  // sent — so a question that stops applying keeps whatever it had rather than
  // being nulled behind the applicant's back.

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-6"
      onFocusCapture={(event) => {
        const target = event.target;
        const named =
          target instanceof HTMLInputElement ||
          target instanceof HTMLSelectElement ||
          target instanceof HTMLTextAreaElement;
        setActiveKey(named ? target.name : null);
      }}
      onBlurCapture={() => {
        setActiveKey(null);
        void flush();
      }}
    >
      <input type="hidden" name="application_id" value={applicationId} />
      <input type="hidden" name="module" value={module} />

      {visible.map((question) => (
        <QuestionField
          key={question.key}
          question={question}
          value={draft[question.key] ?? ""}
          onChange={(next) => {
            setDraft((current) => ({ ...current, [question.key]: next }));
            if (errors[question.key]) {
              setErrors((current) => {
                const next = { ...current };
                delete next[question.key];
                return next;
              });
            }
            scheduleSave();
          }}
          error={question.key === activeKey ? undefined : failed[question.key]}
          disabled={readOnly}
        />
      ))}

      {module === "owner" && (
        <CoOwnersBlock
          initial={coOwners ?? []}
          primaryPct={toPercent(draft.owner_ownership_pct)}
          readOnly={readOnly}
          errors={errors}
          onChange={scheduleSave}
        />
      )}

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

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-ink-100 pt-6">
          <button type="submit" disabled={pending} className={primaryButton}>
            {pending ? "Saving…" : "Save and continue"}
          </button>
          <AutosaveStatus status={autosave} />
        </div>
      )}
    </form>
  );
}

/** The quiet line beside the button: what autosave is doing. */
function AutosaveStatus({
  status,
}: {
  status: { state: "idle" } | { state: "saving" } | { state: "saved" } | { state: "error"; message: string };
}) {
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm">
      {status.state === "saving" ? (
        <>
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin text-ink-400" />
          <span className="text-ink-500">Saving…</span>
        </>
      ) : status.state === "saved" ? (
        <>
          <Check aria-hidden="true" className="h-4 w-4 text-success-700" strokeWidth={2.5} />
          <span className="text-success-700">All changes saved</span>
        </>
      ) : status.state === "error" ? (
        <>
          <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0 text-warning-700" />
          <span className="text-warning-700">{status.message}</span>
        </>
      ) : (
        <span className="text-ink-500">Your answers save automatically as you go.</span>
      )}
    </p>
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
      // The same grouping input as the prequal: commas appear as the number
      // is typed, a stored 500000 reads back as 500,000, and the dollar sign
      // sits in the field rather than in the placeholder. Not type="number",
      // which cannot show a comma at all. The save path strips the
      // punctuation (validate.ts).
      return (
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-500"
          >
            $
          </span>
          <AmountInput
            id={id}
            name={question.key}
            disabled={disabled}
            value={value}
            onValueChange={onChange}
            placeholder={question.placeholder ?? "0"}
            className="pl-7"
          />
        </div>
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
