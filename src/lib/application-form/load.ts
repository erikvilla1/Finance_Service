import { createClient } from "@/lib/supabase/server";
import {
  hiddenQuestionKeys,
  loadApplicationSteps,
  loadQuestionRules,
  type Question,
} from "@/lib/questions";
import type { ApplicationStatus, ProductTrack } from "@/types/database";
import {
  FORM_MODULES,
  isAnswered,
  targetFor,
  type FormModule,
} from "./mapping";

/**
 * Reading the full application back.
 *
 * The mirror image of the save path: values live in whichever table the mapping
 * sent them to, and this reassembles them into one key-value view the form can
 * render. Nothing else in the app should need to know where a given answer
 * physically sits.
 *
 * Runs on the caller's client. Every read is RLS-scoped, and the caller is
 * expected to have already established that this application belongs to the
 * person asking — see the page, which does that with an explicit profile filter
 * rather than trusting the policy to mean what it looks like it means.
 */

export interface FormSection {
  module: FormModule;
  title: string;
  description?: string;
  questions: Question[];
  /** Current value per question key, ready to render as defaultValue. */
  values: Record<string, unknown>;
  requiredTotal: number;
  requiredAnswered: number;
  /** Nothing required is outstanding. Optional gaps do not block. */
  complete: boolean;
  /** Nothing has been filled in at all. Drives "Start" vs "Continue". */
  untouched: boolean;
}

export interface ApplicationForm {
  sections: FormSection[];
  requiredTotal: number;
  requiredAnswered: number;
  /**
   * False once a specialist is packaging the file. The form renders read-only
   * rather than disappearing — someone who filled it in should still be able to
   * see what they said.
   */
  editable: boolean;
  status: ApplicationStatus;
}

/**
 * Mirrors public.customer_may_edit() from migration 0022.
 *
 * Duplicated deliberately, and the duplication has a direction: the database is
 * authoritative and will refuse the write regardless of what this says. This
 * exists so the UI can explain the refusal in advance instead of presenting a
 * form whose save silently affects zero rows — which is precisely the failure
 * 0022 was written to remove, and it would be perverse to reintroduce it one
 * layer up.
 */
const EDITABLE_STATUSES: ApplicationStatus[] = [
  "draft",
  "submitted",
  "initial_review",
  "contact_attempted",
  "contacted",
  "information_requested",
  "documents_requested",
  "documents_received",
];

export function isEditable(status: ApplicationStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

export async function loadApplicationForm(
  applicationId: string,
): Promise<ApplicationForm | null> {
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) return null;

  const [{ data: business }, { data: owner }, { data: answers }] =
    await Promise.all([
      application.business_id
        ? supabase
            .from("businesses")
            .select("*")
            .eq("id", application.business_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("application_owners")
        .select("*")
        .eq("application_id", applicationId)
        .eq("is_primary", true)
        .maybeSingle(),
      supabase
        .from("application_answers")
        .select("question_key, value")
        .eq("application_id", applicationId),
    ]);

  const answerMap: Record<string, unknown> = {};
  for (const row of answers ?? []) answerMap[row.question_key] = row.value;

  const sourceRows: Record<string, Record<string, unknown> | null> = {
    application: application as unknown as Record<string, unknown>,
    business: (business ?? null) as unknown as Record<string, unknown> | null,
    owner: (owner ?? null) as unknown as Record<string, unknown> | null,
  };

  const steps = await loadApplicationSteps(
    application.track as ProductTrack | null,
  );

  // Conditional questions are resolved against everything answered so far, not
  // just this section — "was there a bankruptcy" and "what year" can sit in the
  // same step, but the rules are free to reach across.
  const rules = await loadQuestionRules(application.track as ProductTrack | null);

  const readValue = (question: Question): unknown => {
    const target = targetFor(question.key);
    if (target.table === "answer") return answerMap[question.key] ?? null;
    return sourceRows[target.table]?.[target.column] ?? null;
  };

  const flatValues: Record<string, unknown> = {};
  for (const step of steps) {
    for (const question of step.questions) {
      flatValues[question.key] = readValue(question);
    }
  }

  const hidden = hiddenQuestionKeys(rules, flatValues);

  const sections: FormSection[] = [];

  // Not named `module`: Next reserves that identifier in bundled output.
  for (const moduleKey of FORM_MODULES) {
    const step = steps.find((candidate) => candidate.module === moduleKey);
    if (!step) continue;

    const visible = step.questions.filter(
      (question) => !hidden.has(question.key),
    );
    if (visible.length === 0) continue;

    const values: Record<string, unknown> = {};
    for (const question of visible) values[question.key] = flatValues[question.key];

    const required = visible.filter((question) => question.isRequired);
    const requiredAnswered = required.filter((question) =>
      isAnswered(values[question.key]),
    ).length;

    sections.push({
      module: moduleKey,
      title: step.title,
      description: step.description,
      questions: visible,
      values,
      requiredTotal: required.length,
      requiredAnswered,
      complete: required.length > 0 && requiredAnswered === required.length,
      untouched: visible.every((question) => !isAnswered(values[question.key])),
    });
  }

  return {
    sections,
    requiredTotal: sections.reduce((sum, s) => sum + s.requiredTotal, 0),
    requiredAnswered: sections.reduce((sum, s) => sum + s.requiredAnswered, 0),
    editable: isEditable(application.status),
    status: application.status,
  };
}
