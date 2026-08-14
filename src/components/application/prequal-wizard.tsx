"use client";

import { useCallback, useState, type FormEvent } from "react";
import { ChevronLeft } from "lucide-react";
import { Button, Field, Select } from "@/components/ui";
import { QuestionField } from "@/components/application/question-field";
import { SubmitButton } from "@/components/application/submit-button";
import { StepTracker } from "@/components/application/step-tracker";
import {
  AssetRows,
  EMPTY_ASSET,
  type AssetRow,
} from "@/components/application/asset-rows";
import {
  rangeOptions,
  rangesForQuestionKey,
} from "@/lib/qualification/amount-ranges";
import type { Question } from "@/lib/questions";

/**
 * Tier one, asked one question at a time.
 *
 * WHY EVERY FIELD STAYS MOUNTED. Inactive steps are hidden with CSS, never
 * unmounted. Three things fall out of that and all three matter:
 *
 *   1. Answers survive going Back and forward again without this component
 *      having to shadow the DOM with its own copy of every value.
 *   2. The form posts everything on submit, so the server action is untouched.
 *      It still reads the same field names out of the same FormData.
 *   3. Without JavaScript the page is still a complete form — see the
 *      <noscript> block in the page, which reveals every step and drops the
 *      wizard chrome. The existing comment on QuestionField promises the flow
 *      works without JS because "applicants are often on a phone, on site, on a
 *      bad connection", and a wizard that unmounted its steps would quietly
 *      break that promise.
 *
 * A required field inside a display:none step would block native submission if
 * it were empty, but it cannot be: nothing advances past a question until it
 * has a value, and the submit control does not appear until every one of them
 * does.
 */

/** Long enough to read as a transition, short enough not to feel like a wait. */
const FADE_MS = 180;

/**
 * Beat between choosing an option and the step moving on.
 *
 * Not decoration. Without it the question is gone before the applicant has seen
 * their own answer land, which reads as the form having skipped rather than
 * advanced — and the instinct that follows is to hit Back to check.
 */
const AUTO_ADVANCE_MS = 260;

/**
 * Whether answering this question is a single click, and so can advance on its
 * own.
 *
 * A dropdown commits in one gesture, so a Next button after it is a second
 * click that carries no information. A typed field has no such moment — there
 * is no keystroke that means "done" — so those keep an explicit control.
 */
function advancesOnSelect(question: Question): boolean {
  if (question.type === "select" || question.type === "boolean") return true;
  // Money questions render as banded dropdowns, so they commit in one click too.
  return question.type === "currency" && rangesForQuestionKey(question.key) !== null;
}

/** The one question that renders as a repeating group rather than a control. */
const ASSET_QUESTION_KEY = "prequal_asset_type";

export function PrequalWizard({ essential }: { essential: Question[] }) {
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [shown, setShown] = useState(true);
  const [assets, setAssets] = useState<AssetRow[]>([{ ...EMPTY_ASSET }]);

  /**
   * True between choosing an option and the step actually moving.
   *
   * Without it the Next button flashes into existence for the length of the
   * auto-advance delay: picking an option sets a value, a value satisfies the
   * condition for showing Next, and 260ms later the step moves anyway. A
   * button that appears and vanishes without being clicked reads as a glitch,
   * and worse, it is clickable in that window — clicking it fires a second
   * move and skips a question.
   */
  const [advancing, setAdvancing] = useState(false);

  const lastIndex = essential.length - 1;
  const current = essential[index] ?? null;
  const onLastStep = index >= lastIndex;

  const filled = (question: Question) =>
    (values[question.key] ?? "").trim() !== "";

  const hasValue = current ? filled(current) : false;

  // Gate on every question, not on the one in view. Reaching the end is not the
  // same as having answered everything: Back exists, and an applicant can walk
  // backwards and clear a field on a step they already passed.
  const allAnswered = essential.length > 0 && essential.every(filled);

  const move = useCallback((next: number) => {
    setShown(false);
    window.setTimeout(() => {
      setIndex(next);
      setAdvancing(false);
      // Two frames: one for the incoming step to paint at zero opacity, one for
      // the class change to be a transition rather than an instant swap.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setShown(true)),
      );
    }, FADE_MS);
  }, []);

  /**
   * Change events bubble from the controls, so one listener on the wrapper
   * tracks every answer without QuestionField having to become controlled.
   *
   * Auto-advance is guarded on the changed field being the question currently
   * on screen, and on there being a step to advance to — answering the last
   * question reveals the submit rather than moving anywhere.
   */
  const handleChange = useCallback(
    (event: FormEvent<HTMLDivElement>) => {
      const target = event.target as HTMLInputElement | HTMLSelectElement;
      if (!target.name) return;

      setValues((prev) => ({ ...prev, [target.name]: target.value }));

      const active = essential[index];
      if (
        active &&
        index < lastIndex &&
        target.name === active.key &&
        target.value.trim() !== "" &&
        advancesOnSelect(active)
      ) {
        setAdvancing(true);
        window.setTimeout(() => move(index + 1), AUTO_ADVANCE_MS);
      }
    },
    [essential, index, lastIndex, move],
  );

  /**
   * Assets are their own state, then mirrored into `values` under the question
   * key so the step gating, the tracker and allAnswered keep working without
   * knowing this step is special.
   */
  const handleAssets = useCallback((rows: AssetRow[]) => {
    setAssets(rows);
    setValues((prev) => ({
      ...prev,
      [ASSET_QUESTION_KEY]: rows[0]?.type ?? "",
    }));
  }, []);

  function stepClass(stepIndex: number) {
    if (stepIndex !== index) return "hidden";
    return shown
      ? "opacity-100 transition-opacity duration-200"
      : "opacity-0 transition-opacity duration-200";
  }

  return (
    <div onChange={handleChange}>
      <div data-prequal-nav="" className="mb-8">
        <StepTracker
          count={essential.length}
          current={index}
          labels={essential.map((q) => q.label)}
          onSelect={move}
        />
      </div>

      {essential.map((question, stepIndex) => (
        <div
          key={question.key}
          data-prequal-step=""
          className={stepClass(stepIndex)}
        >
          {question.key === ASSET_QUESTION_KEY ? (
            <AssetRows
              question={question}
              rows={assets}
              onChange={handleAssets}
            />
          ) : (
            <QuestionControl question={question} />
          )}
        </div>
      ))}

      {/* Wizard chrome. Hidden entirely without JavaScript, at which point
          every step above is already on screen and the submit below is the
          only control that matters. */}
      <div data-prequal-nav="" className="mt-6">
        {!onLastStep && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Answered, and not already on its way to the next step.

                On the way forward through a dropdown this never appears: the
                selection advances on its own, and `advancing` suppresses the
                button for the 260ms in between. It exists for the two cases
                where nothing else can move the applicant on — a typed field,
                which has no keystroke that means "done", and a step reached by
                going Back, where the answer is already correct and re-picking
                it would fire no change event at all. */}
            {hasValue && !advancing && (
              <Button type="button" size="lg" onClick={() => move(index + 1)}>
                Next
              </Button>
            )}
            <span className="text-sm tabular-nums text-ink-500">
              Question {index + 1} of {essential.length}
            </span>
          </div>
        )}

        {index > 0 && (
          <button
            type="button"
            onClick={() => move(index - 1)}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-ink-900"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            Back
          </button>
        )}
      </div>

      {/*
        The submit, revealed only when every question has an answer.

        RENDERED ALWAYS, HIDDEN CONDITIONALLY. It cannot be conditionally
        rendered: without JavaScript this component never hydrates, `values` is
        empty on the server, and a submit gated on state would be absent from
        the HTML entirely — leaving a no-JS applicant with a complete form and
        no way to send it. So it is always in the document, hidden by a class,
        and the <noscript> rule in the page forces it back into view along with
        the steps.
      */}
      <div
        data-prequal-submit=""
        className={
          onLastStep && allAnswered
            ? "mt-8 border-t border-ink-200 pt-6"
            : "hidden"
        }
      >
        <SubmitButton>See my financing options</SubmitButton>
        <p className="mt-4 text-sm leading-relaxed text-ink-500">
          Submitting this does not affect your credit and is not an application
          for credit. A financing specialist reviews every submission.
        </p>
      </div>
    </div>
  );
}

/**
 * A question's control, with money questions swapped for banded dropdowns.
 *
 * Everything else defers to QuestionField, so a question type added to the
 * database still renders here without this file knowing about it.
 */
function QuestionControl({ question }: { question: Question }) {
  const ranges =
    question.type === "currency" ? rangesForQuestionKey(question.key) : null;

  if (!ranges) return <QuestionField question={question} />;

  const id = `q-${question.key}`;

  return (
    <Field
      label={question.label}
      htmlFor={id}
      hint={question.helpText ?? undefined}
      required={question.isRequired}
    >
      <Select id={id} name={question.key} required={question.isRequired}>
        <option value="">Select an option</option>
        {rangeOptions(ranges).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}
