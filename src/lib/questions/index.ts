import { createClient } from "@/lib/supabase/server";
import type {
  ApplicationQuestionRow,
  ProductTrack,
  QuestionOptionRow,
  QuestionRuleRow,
} from "@/types/database";

/**
 * Question configuration loading.
 *
 * Platform spec §9 and §39: questions live in the database, never hard-coded
 * into components. Robert can add a field without a deploy.
 */

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  key: string;
  module: string;
  track: ProductTrack | null;
  label: string;
  helpText: string | null;
  placeholder: string | null;
  type: ApplicationQuestionRow["question_type"];
  isRequired: boolean;
  isPii: boolean;
  validation: QuestionValidation;
  options: QuestionOption[];
}

export interface QuestionValidation {
  min?: number;
  max?: number;
  pattern?: string;
}

export interface QuestionStep {
  module: string;
  title: string;
  description?: string;
  questions: Question[];
}

/** Human-facing step titles. Modules are the storage key; these are the copy. */
const MODULE_META: Record<string, { title: string; description?: string }> = {
  prequal: {
    title: "Your situation",
    // Deliberately uncounted. Migration 0016 took this module from six questions
    // to fifteen and this line went on saying six; the prequal page counts its
    // own required fields at render instead, which cannot go stale.
    description:
      "A few quick questions. No documents, and nothing that affects your credit.",
  },
  core_business: {
    title: "About your business",
    description: "Details about the business applying for financing.",
  },
  financial_snapshot: {
    title: "Financial picture",
    description: "A high-level view of how the business is performing.",
  },
  owner: {
    title: "Ownership",
    description:
      "Required for each owner holding 20% or more. This information is stored securely and used only to review your application.",
  },
  equipment: { title: "Equipment details" },
  ar: { title: "Receivables details" },
  cre: { title: "Property details" },
  sba: { title: "SBA details" },
};

/** Order the modules are asked in. */
const MODULE_ORDER = [
  "prequal",
  "core_business",
  "financial_snapshot",
  "equipment",
  "ar",
  "cre",
  "sba",
  "owner",
];

function toQuestion(
  row: ApplicationQuestionRow,
  options: QuestionOptionRow[],
): Question {
  return {
    id: row.id,
    key: row.key,
    module: row.module,
    track: row.track,
    label: row.label,
    helpText: row.help_text,
    placeholder: row.placeholder,
    type: row.question_type,
    isRequired: row.is_required,
    isPii: row.is_pii,
    validation: (row.validation ?? {}) as QuestionValidation,
    options: options
      .filter((option) => option.question_id === row.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((option) => ({ value: option.value, label: option.label })),
  };
}

/**
 * Loads questions for a set of modules, optionally scoped to a track.
 *
 * Track-specific questions only appear when their track matches; global
 * questions (track = null) always apply.
 */
export async function loadQuestions(
  modules: string[],
  track?: ProductTrack | null,
): Promise<Question[]> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("application_questions")
    .select("*")
    .in("module", modules)
    .eq("is_active", true)
    .order("sort_order");

  if (error || !rows) return [];

  const scoped = rows.filter(
    (row) => row.track === null || (track != null && row.track === track),
  );

  if (scoped.length === 0) return [];

  const { data: options } = await supabase
    .from("question_options")
    .select("*")
    .in(
      "question_id",
      scoped.map((row) => row.id),
    );

  return scoped.map((row) => toQuestion(row, options ?? []));
}

/** Groups questions into ordered steps for the multi-step flow. */
export function groupIntoSteps(questions: Question[]): QuestionStep[] {
  const byModule = new Map<string, Question[]>();

  for (const question of questions) {
    const list = byModule.get(question.module) ?? [];
    list.push(question);
    byModule.set(question.module, list);
  }

  return MODULE_ORDER.filter((module) => byModule.has(module)).map((module) => ({
    module,
    title: MODULE_META[module]?.title ?? module,
    description: MODULE_META[module]?.description,
    questions: byModule.get(module) ?? [],
  }));
}

/**
 * Which questions the track's full application needs, in order.
 * The prequal module is excluded — that is tier one and asked separately.
 */
export async function loadApplicationSteps(
  track: ProductTrack | null,
): Promise<QuestionStep[]> {
  const questions = await loadQuestions(
    ["core_business", "financial_snapshot", "equipment", "ar", "cre", "sba", "owner"],
    track,
  );
  return groupIntoSteps(questions);
}

// -----------------------------------------------------------------------------
// CONDITIONAL DISPLAY
//
// The evaluation itself lives in ./rules, which imports nothing — this module
// pulls in the server Supabase client, so a client component cannot import it.
// Re-exported here so existing callers are unaffected.
// -----------------------------------------------------------------------------

export { hiddenQuestionKeys } from "./rules";

export async function loadQuestionRules(
  track?: ProductTrack | null,
): Promise<QuestionRuleRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("question_rules")
    .select("*")
    .eq("is_active", true)
    .order("priority");

  if (!data) return [];

  return data.filter(
    (rule) => rule.track === null || (track != null && rule.track === track),
  );
}
