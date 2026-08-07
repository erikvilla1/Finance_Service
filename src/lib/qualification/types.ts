import type {
  CreditBand,
  DepositTrend,
  PriorDefaultStatus,
  ProductTrack,
  QualificationOutcome,
  RevenueBand,
  TimeInBusinessBand,
} from "@/types/database";

/**
 * Prequalification engine — types.
 *
 * Platform spec §26: version 1 is rules-based and auditable. No ML, no AI
 * decisioning. BUSINESS_CONTEXT §7: soft and indicative, never a firm approval.
 */

/**
 * The facts the engine reads.
 *
 * Mostly banded, with two exact figures. `creditScore` is exact because the v2
 * ruleset gates on thresholds (500/550/600/620/650) that do not align to band
 * boundaries; `avgMonthlyRevenue` is exact because every estimated range is a
 * multiple of it. `creditBand` is retained for consumers that still read it.
 */
export interface QualificationInput {
  track?: ProductTrack | null;
  productSlug?: string | null;
  financingGoal?: string | null;
  requestedAmount?: number | null;
  revenueBand?: RevenueBand | null;
  creditBand?: CreditBand | null;
  /** Exact self-reported score. Authoritative for eligibility. */
  creditScore?: number | null;
  timeInBusiness?: TimeInBusinessBand | null;
  industry?: string | null;
  /** Sizes every estimated range the engine produces. */
  avgMonthlyRevenue?: number | null;
  depositTrend?: DepositTrend | null;
  priorDefaultStatus?: PriorDefaultStatus | null;
  /** Whether real property was offered. Gates secured products. */
  hasRealEstateAsset?: boolean | null;
  /** Free-form extras from application_answers, keyed by question key. */
  answers?: Record<string, unknown>;
}

export type ComparisonOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "is_present"
  | "is_absent";

export interface Condition {
  field: string;
  op: ComparisonOperator;
  value?: unknown;
}

export interface ConditionGroup {
  all?: Condition[];
  any?: Condition[];
}

export interface Rule {
  id: string;
  description: string;
  when: ConditionGroup;
  then: RuleEffect;
}

/**
 * Sizes a product's estimated range as a multiple of average monthly revenue.
 *
 * These multiples are modelled, not quoted — see migration 0017. They are
 * deliberately kept apart from the `indicative*` fields, which remain reserved
 * for figures taken from a product whose terms have actually been verified.
 */
export interface RevenueMultipleSizing {
  minMultiple: number;
  maxMultiple: number;
}

export interface RuleEffect {
  /** Product slugs this rule supports as a potential match. */
  matchProducts?: string[];
  /** Product slugs this rule rules out. Disqualification wins over match. */
  excludeProducts?: string[];
  /** Information the applicant still needs to supply. */
  requireInformation?: string[];
  /** Flags for the specialist, never shown to the customer. */
  riskFlags?: string[];
  /** Forces human review regardless of other outcomes. */
  forceReview?: boolean;
  /** Applies to the products named in matchProducts on this same rule. */
  sizeFromMonthlyRevenue?: RevenueMultipleSizing;
}

export interface Ruleset {
  /** True while the thresholds are still invented. Forces manual review. */
  placeholder?: boolean;
  rules: Rule[];
  notes?: string;
}

/** One line of the audit trail. Spec §26: store the rules used. */
export interface EvaluatedRule {
  ruleId: string;
  description: string;
  matched: boolean;
  /** Why it matched or didn't — enough to reconstruct the decision later. */
  detail: string;
}

export interface ProductMatch {
  productSlug: string;
  productName: string;
  /**
   * "potential_match"  → rules support it
   * "requires_review"  → rules are inconclusive or absent
   * "not_eligible"     → a rule that should have matched did not
   */
  confidence: "potential_match" | "requires_review" | "not_eligible";
  reasons: string[];
  /** Why this product did not qualify. Empty unless confidence is not_eligible. */
  blockers: string[];
  /** True when the product's track matches the goal the applicant chose. */
  alignsWithGoal: boolean;
  /** Only populated when the product's terms are verified. */
  indicativeAmountMin: number | null;
  indicativeAmountMax: number | null;
  /**
   * Modelled from average monthly revenue. ILLUSTRATIVE ONLY — never render
   * without saying so. Null when revenue is unknown or no sizing rule fired.
   */
  estimatedAmountMin: number | null;
  estimatedAmountMax: number | null;
  /** How the estimate was produced, for the audit trail and the UI caveat. */
  estimateBasis: "monthly_revenue_multiple" | null;
  /** True when the raw estimate was reduced to the catalog's stated maximum. */
  estimateCappedByCatalog: boolean;
}

export interface QualificationOutput {
  outcome: QualificationOutcome;
  productMatches: ProductMatch[];
  indicativeAmountMin: number | null;
  indicativeAmountMax: number | null;
  /** Largest estimated maximum across qualifying products. Illustrative only. */
  maxEstimatedAmount: number | null;
  missingInformation: string[];
  riskFlags: string[];
  reviewRequired: boolean;
  rulesEvaluated: EvaluatedRule[];
  rulesetVersion: number | null;
  engineVersion: string;
}

/** Minimal product shape the engine needs. */
export interface CandidateProduct {
  slug: string;
  name: string;
  track: ProductTrack;
  amountMin: number | null;
  amountMax: number | null;
  minFico: number | null;
  termsVerified: boolean;
}
