/**
 * Types for the qualification engine described in "FLS Qualification Engine
 * Implementation Spec v1.1" (Robert, September 2026). Section numbers in the
 * comments across src/lib/matching refer to that document.
 *
 * The engine is configuration-driven (spec §3): objectives, questions and
 * lender programs are data, and the engine is a pure function over them. The
 * UI never encodes a threshold, and changing a program never means touching
 * the questionnaire.
 */

// -----------------------------------------------------------------------------
// OBJECTIVES (spec §2)
// -----------------------------------------------------------------------------

/** The nine customer objectives. Reused site-wide, in analytics and backend. */
export type ObjectiveId =
  | "working_capital"
  | "equipment"
  | "commercial_real_estate"
  | "investment_real_estate"
  | "business_acquisition"
  | "accounts_receivable"
  | "debt_refinance"
  | "startup"
  | "unsure";

export interface Objective {
  id: ObjectiveId;
  label: string;
  description: string;
}

// -----------------------------------------------------------------------------
// QUESTIONS (spec §4 universal profile, §6 branches)
// -----------------------------------------------------------------------------

export type FieldType =
  | "single_select"
  | "multi_select"
  | "currency"
  | "number"
  | "percent"
  | "state";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  /** Stable id from the spec (e.g. "equipment_cost"). Stored as the answer key. */
  id: string;
  label: string;
  help?: string;
  type: FieldType;
  options?: FieldOption[];
  /** Example value shown in an empty typed field (currency, number). */
  placeholder?: string;
  required: boolean;
  /** Only asked when this condition holds (e.g. purchase price on a purchase). */
  showIf?: Condition;
}

/** Raw answers keyed by field id, as submitted. */
export type Answers = Record<string, string | string[] | number | null | undefined>;

// -----------------------------------------------------------------------------
// FACTS: answers normalised into what rules read
// -----------------------------------------------------------------------------

/**
 * Numbers, ranges and flags derived from the answers (see facts.ts). Rules are
 * written against facts, never against raw option values, so a relabelled
 * option cannot silently change a result.
 */
export type FactValue = number | string | boolean | string[] | null;
export type Facts = Record<string, FactValue>;

// -----------------------------------------------------------------------------
// RULES (spec §3 rule types)
// -----------------------------------------------------------------------------

export type Operator =
  | "eq"
  | "neq"
  | "in"
  | "not_in"
  | "gte"
  | "lte"
  | "gt"
  | "lt"
  | "includes"
  | "excludes"
  | "exists";

export interface Comparison {
  fact: string;
  op: Operator;
  value?: FactValue;
}

export type Condition =
  | Comparison
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

/** true / false, or unknown when a fact the rule needs was not provided. */
export type Tri = true | false | "unknown";

export interface Rule {
  id: string;
  /** Plain-language description, shown to staff on the internal route. */
  description: string;
  /**
   * The test. Omit when the source documents the rule but FLS has not yet
   * received the number: the rule then
   * evaluates as "pending", which caps the program at Potential Match and
   * tells staff exactly what is outstanding.
   */
  test?: Condition;
  /**
   * For limits a single comparison can't express: arithmetic across facts
   * ("90% of purchase plus 100% of rehab") or a lender's grid by credit tier
   * and loan size. Same three-valued contract as `test`; takes precedence.
   */
  check?: (facts: Facts) => Tri;
  /** Only evaluated when this holds (e.g. an equipment-age rule for used kit). */
  appliesIf?: Condition;
  /** Hard rules only: route a failure to Specialist Review instead of excluding. */
  onFail?: "exclude" | "manual_review";
}

/** Controls an estimated range. Only present when a formula is documented (§7). */
export interface SizingRule {
  description: string;
  compute: (facts: Facts) => { min: number; max: number } | null;
}

// -----------------------------------------------------------------------------
// PROGRAMS (spec §3)
// -----------------------------------------------------------------------------

/**
 * How far a program's rules can be trusted (spec §11):
 *  documented       – current underwriting/program guide; may reach Strong.
 *  confirmed_legacy – older material FLS has reconfirmed; capped at Potential.
 *  provisional      – broker/marketing material or incomplete; capped at Potential.
 *  manual_only      – too nuanced or stale to automate; always Specialist Review.
 */
export type RuleConfidence =
  | "documented"
  | "confirmed_legacy"
  | "provisional"
  | "manual_only";

export type LenderId =
  // Named in the spec's routing hierarchy (§10, v1.1 addendum)
  | "ucs"
  | "three_sixty"
  | "finance_factory"
  | "rcn"
  | "ready_capital"
  | "celtic_bank"
  | "qualifi"
  | "national"
  // Specialty programs from the lender breakdown folder
  | "ibusiness"
  | "value_capital"
  | "arf"
  | "global_mca"
  | "founders_first"
  | "american_business_credit"
  | "four_hour_funding"
  | "bsb"
  | "slim_capital"
  | "maxim"
  | "bankers_capital"
  | "lima_one"
  | "sky_equity"
  | "silver_hill"
  | "stronghill"
  | "easy_street"
  | "harbour"
  | "alleon"
  | "orange_commercial"
  | "us_financial"
  | "hedaya"
  | "global_church"
  | "griffin"
  | "ab_nicholas";

export interface Lender {
  id: LenderId;
  name: string;
  notes?: string;
}

/** What the customer sees. Never a lender (spec §9, §17). */
export type ProductFamily =
  | "term_loan"
  | "line_of_credit"
  | "unsecured_term_loan"
  | "revenue_based"
  | "sba_loan"
  | "asset_based"
  | "inventory_financing"
  | "equipment_financing"
  | "owner_user_cre"
  | "investment_cre"
  | "commercial_mortgage"
  | "bridge_loan"
  | "fix_and_flip"
  | "ground_up_construction"
  | "rental_dscr"
  | "multifamily"
  | "invoice_factoring"
  | "ar_line"
  | "medical_receivables"
  | "po_financing"
  | "debt_refinance"
  | "debt_restructuring"
  | "startup_credit_line"
  | "startup_term_loan"
  | "retirement_rollover"
  | "securities_based"
  | "heloc";

export interface ProgramSource {
  name: string;
  /** Date on the source document, when it has one. */
  versionDate: string | null;
  /** When FLS last confirmed the program is current. */
  lastVerified: string | null;
}

export interface Program {
  id: string;
  lenderId: LenderId;
  productFamily: ProductFamily;
  displayNameInternal: string;
  active: boolean;
  /** Default order within a deal family; lower routes first (spec §10). */
  routingPriority: number;
  objectiveAffinity: ObjectiveId[];
  source: ProgramSource;
  ruleConfidence: RuleConfidence;
  amountMin?: number;
  amountMax?: number;
  /** Failure normally excludes the program (or routes to review; see onFail). */
  hardRules: Rule[];
  /** Failure moves Strong to Potential and adds a flag for staff. */
  softRules: Rule[];
  sizing?: SizingRule;
  /** Facts that must be present to evaluate the program at all. */
  requiredInputs: string[];
  requiredDocuments?: string[];
  notes?: string;
  /**
   * False for routes FLS should see but a customer card shouldn't claim (a
   * personal HELOC, a retirement rollover, a niche lender that only a
   * specialist would raise). Default true.
   */
  customerVisible?: boolean;
  /**
   * The family a program presents as under a particular objective. A term
   * loan that refinances existing positions is shown to someone consolidating
   * debt as "Business Debt Refinance", not as a new term loan.
   */
  familyOverride?: Partial<Record<ObjectiveId, ProductFamily>>;
}

// -----------------------------------------------------------------------------
// OUTPUT (spec §8 match states, §13 lead record)
// -----------------------------------------------------------------------------

export type MatchState =
  | "strong"
  | "potential"
  | "specialist_review"
  | "no_current_match";

export interface ProductMatch {
  productFamily: ProductFamily;
  state: MatchState;
  /** Whether the family serves the objective directly or is complementary. */
  primary: boolean;
  /** Only when a documented sizing formula produced it (spec §7). */
  estimatedRange: { min: number; max: number } | null;
}

export interface InternalRoute {
  programId: string;
  lenderId: LenderId;
  productFamily: ProductFamily;
  state: MatchState;
  routeRank: number;
  confidence: RuleConfidence;
  /** Hard rules that failed (why the route was excluded or sent to review). */
  failedRules: string[];
  /** Soft rules that failed, or hard rules we could not evaluate. */
  softFlags: string[];
  /** Documented rules whose thresholds FLS has not received yet. */
  pendingRules: string[];
  missingInputs: string[];
}

export interface CalculatedMetrics {
  ltv?: number;
  ltc?: number;
  arvLeverage?: number;
  dscr?: number;
  depositToCost?: number;
}

export type NextAction =
  | "start_application"
  | "specialist_review"
  | "request_manual_review";

export interface MatchResult {
  engineVersion: string;
  objectiveId: ObjectiveId;
  /** For "I'm not sure": the objectives inferred from the answers (spec §6.9). */
  evaluatedObjectives: ObjectiveId[];
  overallState: MatchState;
  /** Customer-facing, best first. Objective-relevant families only. */
  productMatches: ProductMatch[];
  /** Staff-only, best first. Lender identities stay here. */
  internalRoutes: InternalRoute[];
  calculatedMetrics: CalculatedMetrics;
  missingItems: string[];
  nextAction: NextAction;
}
