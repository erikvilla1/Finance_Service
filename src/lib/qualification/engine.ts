import type {
  CandidateProduct,
  Condition,
  ConditionGroup,
  EvaluatedRule,
  ProductMatch,
  QualificationInput,
  QualificationOutput,
  Rule,
  Ruleset,
} from "./types";
import { CREDIT_BAND_ORDER, TIME_IN_BUSINESS_ORDER } from "./bands";

export const ENGINE_VERSION = "1.0.0-rules";

/**
 * Prequalification engine.
 *
 * Design commitments, in priority order:
 *
 *  1. HONEST BY DEFAULT. Absent or placeholder rules produce "requires_review",
 *     never a match. A shortlist we can't justify is worse than no shortlist.
 *  2. AUDITABLE. Every rule considered is recorded with the reason it did or
 *     did not fire (spec §26).
 *  3. NEVER AN APPROVAL. The outcome vocabulary has no "approved" (spec §26).
 *  4. NO UNVERIFIED NUMBERS. Indicative amounts appear only for products whose
 *     terms have been confirmed (BUSINESS_CONTEXT §5 critical notice).
 *
 * The engine is pure: same inputs, same output, no I/O. That makes it testable
 * and makes the audit trail trustworthy.
 */
export function evaluate(
  input: QualificationInput,
  candidates: CandidateProduct[],
  ruleset: Ruleset | null,
  rulesetVersion: number | null,
): QualificationOutput {
  const rulesEvaluated: EvaluatedRule[] = [];
  const matchedSlugs = new Set<string>();
  const excludedSlugs = new Set<string>();
  const missingInformation = new Set<string>();
  const riskFlags = new Set<string>();
  const reasonsBySlug = new Map<string, string[]>();

  let forceReview = false;

  // ---------------------------------------------------------------------------
  // No usable ruleset. This is the expected state until Robert supplies real
  // thresholds, so it is handled as a first-class path rather than an error.
  // ---------------------------------------------------------------------------
  const hasUsableRules =
    ruleset != null && ruleset.placeholder !== true && ruleset.rules.length > 0;

  if (!hasUsableRules) {
    rulesEvaluated.push({
      ruleId: "__no_active_ruleset__",
      description: "No active qualification ruleset for this track",
      matched: false,
      detail:
        ruleset?.placeholder === true
          ? "Ruleset is marked placeholder; thresholds are not yet confirmed."
          : "No ruleset configured for this track.",
    });
    forceReview = true;
  } else {
    for (const rule of ruleset.rules) {
      const { matched, detail } = evaluateRule(rule, input);

      rulesEvaluated.push({
        ruleId: rule.id,
        description: rule.description,
        matched,
        detail,
      });

      if (!matched) continue;

      const effect = rule.then;
      effect.matchProducts?.forEach((slug) => {
        matchedSlugs.add(slug);
        const reasons = reasonsBySlug.get(slug) ?? [];
        reasons.push(rule.description);
        reasonsBySlug.set(slug, reasons);
      });
      effect.excludeProducts?.forEach((slug) => excludedSlugs.add(slug));
      effect.requireInformation?.forEach((info) => missingInformation.add(info));
      effect.riskFlags?.forEach((flag) => riskFlags.add(flag));
      if (effect.forceReview) forceReview = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Structural checks that hold regardless of the ruleset.
  // These are facts about the catalog, not invented thresholds, so they are safe
  // to apply today.
  // ---------------------------------------------------------------------------
  const trackCandidates = input.track
    ? candidates.filter((c) => c.track === input.track)
    : candidates;

  const productMatches: ProductMatch[] = [];

  for (const candidate of trackCandidates) {
    if (excludedSlugs.has(candidate.slug)) continue;

    const reasons = reasonsBySlug.get(candidate.slug) ?? [];
    let disqualified = false;

    // Requested amount outside a *verified* program range is a real signal.
    // Unverified ranges are ignored entirely — acting on them would be acting
    // on a number nobody has confirmed.
    if (
      candidate.termsVerified &&
      typeof input.requestedAmount === "number" &&
      input.requestedAmount > 0
    ) {
      if (candidate.amountMin != null && input.requestedAmount < candidate.amountMin) {
        rulesEvaluated.push({
          ruleId: `__amount_below_min__${candidate.slug}`,
          description: `Requested amount below the verified minimum for ${candidate.name}`,
          matched: true,
          detail: `Requested ${input.requestedAmount} < minimum ${candidate.amountMin}.`,
        });
        disqualified = true;
      }
      if (candidate.amountMax != null && input.requestedAmount > candidate.amountMax) {
        rulesEvaluated.push({
          ruleId: `__amount_above_max__${candidate.slug}`,
          description: `Requested amount above the verified maximum for ${candidate.name}`,
          matched: true,
          detail: `Requested ${input.requestedAmount} > maximum ${candidate.amountMax}.`,
        });
        disqualified = true;
      }
    }

    if (disqualified) continue;

    const confidence: ProductMatch["confidence"] =
      matchedSlugs.has(candidate.slug) && !forceReview
        ? "potential_match"
        : "requires_review";

    productMatches.push({
      productSlug: candidate.slug,
      productName: candidate.name,
      confidence,
      reasons,
      // Never surface a number that hasn't been confirmed.
      indicativeAmountMin: candidate.termsVerified ? candidate.amountMin : null,
      indicativeAmountMax: candidate.termsVerified ? candidate.amountMax : null,
    });
  }

  // ---------------------------------------------------------------------------
  // Missing information the engine can detect on its own.
  // ---------------------------------------------------------------------------
  if (!input.requestedAmount) missingInformation.add("requested_amount");
  if (!input.timeInBusiness) missingInformation.add("time_in_business");
  if (!input.revenueBand) missingInformation.add("revenue_band");
  if (!input.creditBand || input.creditBand === "unknown") {
    missingInformation.add("credit_band");
  }

  // ---------------------------------------------------------------------------
  // Outcome.
  // ---------------------------------------------------------------------------
  const confirmedMatches = productMatches.filter(
    (m) => m.confidence === "potential_match",
  );

  let outcome: QualificationOutput["outcome"];
  if (productMatches.length === 0) {
    outcome = "no_match_identified";
  } else if (confirmedMatches.length > 0) {
    outcome = "potential_match";
  } else if (missingInformation.size > 2) {
    outcome = "insufficient_information";
  } else {
    outcome = "requires_review";
  }

  // A specialist reviews everything in v1. This stays true until the rules are
  // real and have been observed against actual outcomes.
  const reviewRequired = true;

  const verifiedMatches = productMatches.filter(
    (m) => m.indicativeAmountMin != null || m.indicativeAmountMax != null,
  );

  return {
    outcome,
    productMatches,
    indicativeAmountMin: minOrNull(
      verifiedMatches.map((m) => m.indicativeAmountMin),
    ),
    indicativeAmountMax: maxOrNull(
      verifiedMatches.map((m) => m.indicativeAmountMax),
    ),
    missingInformation: [...missingInformation],
    riskFlags: [...riskFlags],
    reviewRequired,
    rulesEvaluated,
    rulesetVersion,
    engineVersion: ENGINE_VERSION,
  };
}

// -----------------------------------------------------------------------------
// Rule evaluation
// -----------------------------------------------------------------------------

function evaluateRule(
  rule: Rule,
  input: QualificationInput,
): { matched: boolean; detail: string } {
  return evaluateGroup(rule.when, input);
}

function evaluateGroup(
  group: ConditionGroup,
  input: QualificationInput,
): { matched: boolean; detail: string } {
  const details: string[] = [];

  if (group.all?.length) {
    for (const condition of group.all) {
      const result = evaluateCondition(condition, input);
      details.push(result.detail);
      if (!result.matched) {
        return { matched: false, detail: details.join("; ") };
      }
    }
  }

  if (group.any?.length) {
    let anyMatched = false;
    for (const condition of group.any) {
      const result = evaluateCondition(condition, input);
      details.push(result.detail);
      if (result.matched) {
        anyMatched = true;
        break;
      }
    }
    if (!anyMatched) {
      return { matched: false, detail: details.join("; ") };
    }
  }

  if (!group.all?.length && !group.any?.length) {
    return { matched: false, detail: "Rule has no conditions; treated as no match." };
  }

  return { matched: true, detail: details.join("; ") };
}

function evaluateCondition(
  condition: Condition,
  input: QualificationInput,
): { matched: boolean; detail: string } {
  const actual = resolveField(condition.field, input);
  const expected = condition.value;
  const label = `${condition.field} ${condition.op}`;

  const describe = (matched: boolean) =>
    `${label} ${JSON.stringify(expected ?? null)} → actual ${JSON.stringify(
      actual ?? null,
    )} (${matched ? "match" : "no match"})`;

  switch (condition.op) {
    case "is_present": {
      const matched = actual !== null && actual !== undefined && actual !== "";
      return { matched, detail: describe(matched) };
    }
    case "is_absent": {
      const matched = actual === null || actual === undefined || actual === "";
      return { matched, detail: describe(matched) };
    }
    case "eq": {
      const matched = actual === expected;
      return { matched, detail: describe(matched) };
    }
    case "neq": {
      const matched = actual !== expected;
      return { matched, detail: describe(matched) };
    }
    case "in": {
      const matched = Array.isArray(expected) && expected.includes(actual as never);
      return { matched, detail: describe(matched) };
    }
    case "not_in": {
      const matched =
        Array.isArray(expected) && !expected.includes(actual as never);
      return { matched, detail: describe(matched) };
    }
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const a = toComparable(condition.field, actual);
      const b = toComparable(condition.field, expected);
      if (a === null || b === null) {
        return {
          matched: false,
          detail: `${label} → not comparable (actual ${JSON.stringify(
            actual ?? null,
          )})`,
        };
      }
      const matched =
        condition.op === "gt"
          ? a > b
          : condition.op === "gte"
            ? a >= b
            : condition.op === "lt"
              ? a < b
              : a <= b;
      return { matched, detail: describe(matched) };
    }
    default:
      return { matched: false, detail: `${label} → unknown operator` };
  }
}

function resolveField(field: string, input: QualificationInput): unknown {
  switch (field) {
    case "track":
      return input.track ?? null;
    case "product_slug":
      return input.productSlug ?? null;
    case "financing_goal":
      return input.financingGoal ?? null;
    case "requested_amount":
      return input.requestedAmount ?? null;
    case "revenue_band":
      return input.revenueBand ?? null;
    case "credit_band":
      return input.creditBand ?? null;
    case "time_in_business":
      return input.timeInBusiness ?? null;
    case "industry":
      return input.industry ?? null;
    default:
      return input.answers?.[field] ?? null;
  }
}

/**
 * Bands are ordinal, so ">= 680_719" has to mean something. Maps band values to
 * their rank; passes numbers through untouched.
 */
function toComparable(field: string, value: unknown): number | null {
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    if (field === "credit_band") {
      const rank = CREDIT_BAND_ORDER[value as keyof typeof CREDIT_BAND_ORDER];
      return rank ?? null;
    }
    if (field === "time_in_business") {
      const rank =
        TIME_IN_BUSINESS_ORDER[value as keyof typeof TIME_IN_BUSINESS_ORDER];
      return rank ?? null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function minOrNull(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v != null);
  return present.length ? Math.min(...present) : null;
}

function maxOrNull(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v != null);
  return present.length ? Math.max(...present) : null;
}
