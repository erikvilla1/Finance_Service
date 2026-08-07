import type {
  CandidateProduct,
  Condition,
  ConditionGroup,
  EvaluatedRule,
  ProductMatch,
  QualificationInput,
  QualificationOutput,
  RevenueMultipleSizing,
  Rule,
  Ruleset,
} from "./types";
import { CREDIT_BAND_ORDER, TIME_IN_BUSINESS_ORDER } from "./bands";

export const ENGINE_VERSION = "2.0.0-rules";

/**
 * Prequalification engine.
 *
 * Design commitments, in priority order:
 *
 *  1. HONEST BY DEFAULT. Absent or placeholder rules produce "requires_review",
 *     never a match. A shortlist we can't justify is worse than no shortlist.
 *  2. AUDITABLE. Every rule considered is recorded with the reason it did or
 *     did not fire (spec §26).
 *  3. NEVER AN APPROVAL. The outcome vocabulary has no "approved" (spec §26),
 *     and reviewRequired is unconditionally true.
 *  4. TWO KINDS OF NUMBER, NEVER CONFLATED.
 *       indicative*  → taken from a product whose terms are VERIFIED. Absent
 *                      today, because nothing in the catalog is verified yet.
 *       estimated*   → MODELLED from average monthly revenue using multiples
 *                      reverse-engineered from a competitor's tool (migration
 *                      0017). Illustrative only; the UI must say so.
 *     Keeping these in separate fields means a future reader cannot mistake a
 *     modelled figure for a quoted one.
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
  const blockersBySlug = new Map<string, string[]>();
  const sizingBySlug = new Map<string, RevenueMultipleSizing>();

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

      const effect = rule.then;

      // A rule that did not fire still tells the applicant something useful:
      // it is the reason a product they might expect to see is missing. Record
      // it against that product so the UI can explain the absence instead of
      // silently omitting it.
      if (!matched) {
        effect.matchProducts?.forEach((slug) => {
          const blockers = blockersBySlug.get(slug) ?? [];
          blockers.push(rule.description);
          blockersBySlug.set(slug, blockers);
        });
        continue;
      }

      effect.matchProducts?.forEach((slug) => {
        matchedSlugs.add(slug);
        const reasons = reasonsBySlug.get(slug) ?? [];
        reasons.push(rule.description);
        reasonsBySlug.set(slug, reasons);

        if (effect.sizeFromMonthlyRevenue) {
          sizingBySlug.set(slug, effect.sizeFromMonthlyRevenue);
        }
      });
      effect.excludeProducts?.forEach((slug) => excludedSlugs.add(slug));
      effect.requireInformation?.forEach((info) => missingInformation.add(info));
      effect.riskFlags?.forEach((flag) => riskFlags.add(flag));
      if (effect.forceReview) forceReview = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Which products to report on.
  //
  // With a usable ruleset, the answer is "every product the rules have an
  // opinion about" — matched or blocked — regardless of the track the applicant
  // chose. Someone who came in asking about equipment should still be told a
  // line of credit may be open to them; narrowing to the goal's track was
  // hiding exactly the cross-sell the prequal exists to surface.
  //
  // Without a usable ruleset there are no opinions to report, so the old
  // behaviour stands: show the goal's track and send all of it to review.
  // ---------------------------------------------------------------------------
  const consideredCandidates = hasUsableRules
    ? candidates.filter(
        (c) => matchedSlugs.has(c.slug) || blockersBySlug.has(c.slug),
      )
    : input.track
      ? candidates.filter((c) => c.track === input.track)
      : candidates;

  const productMatches: ProductMatch[] = [];

  for (const candidate of consideredCandidates) {
    if (excludedSlugs.has(candidate.slug)) continue;

    const reasons = reasonsBySlug.get(candidate.slug) ?? [];
    const blockers = blockersBySlug.get(candidate.slug) ?? [];
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

    const matchedThis = matchedSlugs.has(candidate.slug);

    // Three states, not two. A product the rules explicitly ruled out is not
    // the same as one they were inconclusive about, and telling the applicant
    // *why* something is closed to them is the difference between a useful
    // result and a list they can't act on.
    const confidence: ProductMatch["confidence"] = matchedThis
      ? forceReview
        ? "requires_review"
        : "potential_match"
      : blockers.length > 0
        ? "not_eligible"
        : "requires_review";

    const sizing = sizingBySlug.get(candidate.slug) ?? null;
    const estimate =
      matchedThis && sizing
        ? sizeFromRevenue(sizing, input.avgMonthlyRevenue, candidate)
        : null;

    if (estimate?.cappedByCatalog) {
      rulesEvaluated.push({
        ruleId: `__estimate_capped__${candidate.slug}`,
        description: `Estimated maximum for ${candidate.name} reduced to the catalog maximum`,
        matched: true,
        detail: `Modelled ${estimate.rawMax} exceeded catalog maximum ${candidate.amountMax}; reported the lower figure.`,
      });
    }

    productMatches.push({
      productSlug: candidate.slug,
      productName: candidate.name,
      confidence,
      reasons,
      blockers,
      alignsWithGoal: input.track != null && candidate.track === input.track,
      // Never surface a number that hasn't been confirmed.
      indicativeAmountMin: candidate.termsVerified ? candidate.amountMin : null,
      indicativeAmountMax: candidate.termsVerified ? candidate.amountMax : null,
      // Modelled, not quoted. Kept separate from the indicative fields above.
      estimatedAmountMin: estimate?.min ?? null,
      estimatedAmountMax: estimate?.max ?? null,
      estimateBasis: estimate ? "monthly_revenue_multiple" : null,
      estimateCappedByCatalog: estimate?.cappedByCatalog ?? false,
    });
  }

  // Products the applicant can act on come first; within each group, the ones
  // matching the goal they actually chose lead.
  const CONFIDENCE_RANK = {
    potential_match: 0,
    requires_review: 1,
    not_eligible: 2,
  } as const;

  productMatches.sort((a, b) => {
    const byConfidence =
      CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence];
    if (byConfidence !== 0) return byConfidence;
    if (a.alignsWithGoal !== b.alignsWithGoal) return a.alignsWithGoal ? -1 : 1;
    return (b.estimatedAmountMax ?? 0) - (a.estimatedAmountMax ?? 0);
  });

  // ---------------------------------------------------------------------------
  // Missing information the engine can detect on its own.
  // ---------------------------------------------------------------------------
  if (!input.requestedAmount) missingInformation.add("requested_amount");
  if (!input.timeInBusiness) missingInformation.add("time_in_business");
  if (input.creditScore == null) missingInformation.add("credit_score");
  if (input.avgMonthlyRevenue == null) {
    missingInformation.add("avg_monthly_revenue");
  }

  // ---------------------------------------------------------------------------
  // Outcome.
  // ---------------------------------------------------------------------------
  const confirmedMatches = productMatches.filter(
    (m) => m.confidence === "potential_match",
  );

  const actionable = productMatches.filter((m) => m.confidence !== "not_eligible");

  // Without these two we cannot gate eligibility or size a range, so nothing the
  // engine produced means anything. This is checked BEFORE the empty-shortlist
  // case: an applicant who withheld their credit score has not been declined,
  // and "no match identified" would read as though they had been.
  const missingEssential =
    input.creditScore == null || input.avgMonthlyRevenue == null;

  let outcome: QualificationOutput["outcome"];
  if (missingEssential) {
    outcome = "insufficient_information";
  } else if (confirmedMatches.length > 0) {
    outcome = "potential_match";
  } else if (actionable.length === 0) {
    outcome = "no_match_identified";
  } else if (missingInformation.size > 2) {
    outcome = "insufficient_information";
  } else {
    outcome = "requires_review";
  }

  // A specialist reviews everything in v1. This stays true until the rules are
  // real and have been observed against actual outcomes. It is not conditional
  // and must not become conditional without Robert and a compliance review.
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
    // Headline figure. Drawn only from products the rules actually supported,
    // so a "not eligible" product can never inflate it.
    maxEstimatedAmount: maxOrNull(
      confirmedMatches.map((m) => m.estimatedAmountMax),
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
// Range sizing
// -----------------------------------------------------------------------------

/**
 * Turns a revenue multiple into a dollar range.
 *
 * Capped at the catalog maximum where one exists. The catalog figures are
 * themselves unverified, but a result that offers more than the product's own
 * stated ceiling is incoherent on its face, and erring low is the safer
 * direction to err in when the number is going in front of a borrower.
 *
 * Rounded to the nearest hundred so the output reads as an estimate rather than
 * a computation — $69,000, not $68,999.97.
 */
function sizeFromRevenue(
  sizing: RevenueMultipleSizing,
  avgMonthlyRevenue: number | null | undefined,
  candidate: CandidateProduct,
): {
  min: number;
  max: number;
  rawMax: number;
  cappedByCatalog: boolean;
} | null {
  if (
    avgMonthlyRevenue == null ||
    !Number.isFinite(avgMonthlyRevenue) ||
    avgMonthlyRevenue <= 0
  ) {
    return null;
  }

  const round = (n: number) => Math.round(n / 100) * 100;

  const rawMin = avgMonthlyRevenue * sizing.minMultiple;
  const rawMax = avgMonthlyRevenue * sizing.maxMultiple;

  const cappedByCatalog =
    candidate.amountMax != null && rawMax > candidate.amountMax;

  const cappedMax = cappedByCatalog ? candidate.amountMax! : rawMax;

  // The cap can pull the maximum below the minimum. When it does, the range has
  // collapsed and reporting it would be misleading, so report the cap alone.
  const min = round(Math.min(rawMin, cappedMax));

  return {
    min,
    max: round(cappedMax),
    rawMax: round(rawMax),
    cappedByCatalog,
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
    case "credit_score":
      return input.creditScore ?? null;
    case "time_in_business":
      return input.timeInBusiness ?? null;
    case "industry":
      return input.industry ?? null;
    case "avg_monthly_revenue":
      return input.avgMonthlyRevenue ?? null;
    case "deposit_trend":
      return input.depositTrend ?? null;
    case "prior_default_status":
      return input.priorDefaultStatus ?? null;
    case "has_real_estate_asset":
      return input.hasRealEstateAsset ?? false;
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
