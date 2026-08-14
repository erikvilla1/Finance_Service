import type { Question } from "@/lib/questions";

/**
 * Splitting tier one into "what we need" and "what helps".
 *
 * Migration 0016 took the prequal from six questions to fifteen. Every one of
 * them is worth having, but asking for all fifteen in one stacked column asks
 * the applicant to scroll through a form that looks like the paperwork they came
 * here to avoid — on the single page where BUSINESS_CONTEXT §13 says every extra
 * field costs conversion.
 *
 * So the page shows what the qualification engine actually reads, and folds the
 * rest into a disclosure the applicant can open. Nothing is removed and nothing
 * stops being collected: a collapsed <details> still submits its inputs, so an
 * applicant who ignores it posts the same empty strings the fields would have
 * posted anyway.
 *
 * WHY THIS IS DERIVED RATHER THAN A LIST OF KEYS. Questions live in the database
 * precisely so Robert can change the form without a deploy (spec §9), and a
 * hard-coded array of keys here would quietly undo that — a question added
 * tomorrow would land in whichever half this file happened to guess. Requiredness
 * is already the flag that says "this one matters", and it is already editable in
 * the database, so it is the flag used.
 */

/**
 * Questions the engine reads that were once optional.
 *
 * This set was written as a belt-and-braces backstop to a migration that makes
 * all three required, on the assumption it would soon be redundant. It was not
 * redundant, and was not for a long time: that migration carried a duplicate
 * 0022 prefix, was never applied, and all three questions stayed optional in
 * the database while this comment claimed otherwise. It is now 0024. Verify
 * with:
 *
 *   select key, is_required from application_questions
 *    where key in ('prequal_asset_type','prequal_prior_defaults',
 *                  'prequal_deposit_trend');
 *
 * Keep this set regardless of what that returns. Marking one of these optional
 * again is a one-line update anyone could make for a good reason, and the only
 * symptom would be a narrower result that still looks right.
 *
 * What each one costs when it goes unanswered:
 *
 *   prequal_asset_type      -> has_real_estate_asset, one of three conditions on
 *                              ucs_real_estate_secured. Blank means commercial
 *                              real estate never matches — the applicant who
 *                              came in through a property goal is shown a result
 *                              missing the product they came for.
 *   prequal_prior_defaults  -> prior_default_status, which raises
 *                              risk_active_default and forces manual review.
 *   prequal_deposit_trend   -> risk_declining_deposits. A risk signal, never a
 *                              sole disqualifier, which is why it is optional.
 *
 * Deliberately NOT here: asset value and asset debt. They are collected beside
 * the asset type but no rule reads either, so they cost a specialist nothing to
 * receive late.
 *
 * If a rule starts reading another optional field, add its key here in the same
 * commit. The engine reading a field the form hides is not a failure anything
 * catches — the result is simply narrower, and looks correct.
 */
const SCORED_BUT_OPTIONAL = new Set([
  "prequal_asset_type",
  "prequal_prior_defaults",
  "prequal_deposit_trend",
]);

export interface PrequalLayout {
  /** Asked up front. Drives the result the applicant is about to see. */
  essential: Question[];
  /** Folded into a disclosure. Improves the match; never blocks it. */
  details: Question[];
}

export function splitPrequal(questions: Question[]): PrequalLayout {
  const essential: Question[] = [];
  const details: Question[] = [];

  for (const question of questions) {
    if (question.isRequired || SCORED_BUT_OPTIONAL.has(question.key)) {
      essential.push(question);
    } else {
      details.push(question);
    }
  }

  return { essential, details };
}

/**
 * Whether a question should sit half-width in the grid.
 *
 * Long free text needs the room; a select, a score, or an amount does not, and
 * a full-width control beside a short label reads as though more is expected
 * than a number.
 */
export function isNarrow(question: Question): boolean {
  return (
    question.type === "select" ||
    question.type === "boolean" ||
    question.type === "number" ||
    question.type === "currency" ||
    question.type === "percent" ||
    question.type === "date"
  );
}
