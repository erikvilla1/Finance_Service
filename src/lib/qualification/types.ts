import type {
  CreditBand,
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

/** The facts the engine reads. Deliberately banded, not exact. */
export interface QualificationInput {
  track?: ProductTrack | null;
  productSlug?: string | null;
  financingGoal?: string | null;
  requestedAmount?: number | null;
  revenueBand?: RevenueBand | null;
  creditBand?: CreditBand | null;
  timeInBusiness?: TimeInBusinessBand | null;
  industry?: string | null;
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
   */
  confidence: "potential_match" | "requires_review";
  reasons: string[];
  /** Only populated when the product's terms are verified. */
  indicativeAmountMin: number | null;
  indicativeAmountMax: number | null;
}

export interface QualificationOutput {
  outcome: QualificationOutcome;
  productMatches: ProductMatch[];
  indicativeAmountMin: number | null;
  indicativeAmountMax: number | null;
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
