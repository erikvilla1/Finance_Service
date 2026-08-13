import type { QuestionRuleRow } from "@/types/database";

/**
 * Conditional display, as pure functions.
 *
 * Split out of @/lib/questions so this can be imported by a client component.
 * That module imports the server Supabase client at the top level, which would
 * drag server-only code into the browser bundle — the logic itself has no
 * dependencies at all and only lived there because nothing needed it elsewhere.
 *
 * WHY THE BROWSER NEEDS IT. Rules were evaluated once, on the server, when the
 * page was built. So answering "yes, there was a bankruptcy" did nothing
 * visible: the follow-up question appeared only after saving and reloading. All
 * five rules behaved this way, and the effect was a form that seemed to ignore
 * you and then sprout new required fields once you thought you were finished.
 *
 * Behaviour is unchanged — @/lib/questions re-exports these, so every existing
 * caller keeps working.
 */

interface RuleCondition {
  key: string;
  op: string;
  value?: unknown;
}

interface RuleConditions {
  all?: RuleCondition[];
  any?: RuleCondition[];
}

interface RuleEffect {
  show_questions?: string[];
  require_documents?: string[];
}

/**
 * Returns the keys of questions that should stay hidden.
 *
 * A question named in any rule's show_questions is conditional: hidden by
 * default, revealed only when that rule's conditions are met. This keeps the
 * "hidden unless earned" logic in one place instead of scattered through the
 * form components.
 */
export function hiddenQuestionKeys(
  rules: QuestionRuleRow[],
  answers: Record<string, unknown>,
): Set<string> {
  const conditional = new Set<string>();
  const revealed = new Set<string>();

  for (const rule of rules) {
    if (!rule.is_active) continue;

    const effect = (rule.effect ?? {}) as RuleEffect;
    const targets = effect.show_questions ?? [];
    targets.forEach((key) => conditional.add(key));

    if (matchesConditions((rule.conditions ?? {}) as RuleConditions, answers)) {
      targets.forEach((key) => revealed.add(key));
    }
  }

  const hidden = new Set<string>();
  conditional.forEach((key) => {
    if (!revealed.has(key)) hidden.add(key);
  });
  return hidden;
}

function matchesConditions(
  conditions: RuleConditions,
  answers: Record<string, unknown>,
): boolean {
  const all = conditions.all ?? [];
  const any = conditions.any ?? [];

  if (all.length === 0 && any.length === 0) return false;

  if (all.length && !all.every((c) => matchesCondition(c, answers))) return false;
  if (any.length && !any.some((c) => matchesCondition(c, answers))) return false;

  return true;
}

function matchesCondition(
  condition: RuleCondition,
  answers: Record<string, unknown>,
): boolean {
  const actual = answers[condition.key];

  switch (condition.op) {
    case "eq":
      return actual === condition.value;
    case "neq":
      return actual !== condition.value;
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(actual);
    case "is_present":
      return actual !== undefined && actual !== null && actual !== "";
    case "is_absent":
      return actual === undefined || actual === null || actual === "";
    default:
      return false;
  }
}
