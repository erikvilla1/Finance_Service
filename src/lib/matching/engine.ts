import type {
  Answers,
  Facts,
  InternalRoute,
  MatchResult,
  MatchState,
  NextAction,
  ObjectiveId,
  ProductFamily,
  ProductMatch,
  Program,
  Rule,
  RuleConfidence,
  Tri,
} from "./types";
import { buildFacts, metricsFrom } from "./facts";
import { evaluate as evaluateCondition } from "./conditions";
import { familiesFor, type FamilySlot } from "./families";
import { PROGRAMS } from "./programs";
import { BRANCHES, UNIVERSAL_PROFILE } from "./questions";

/**
 * The qualification engine (spec §8-10, v1.1 developer rule).
 *
 * "Lender priority is a ranking input, not an override. The engine should
 * first eliminate programs that fail documented hard rules, then rank
 * surviving programs using objective fit, documented lender appetite,
 * execution probability, FLS preference, economics, and rule
 * confidence/source freshness." That sentence is the algorithm:
 *
 *   1. Answers become facts (facts.ts).
 *   2. The objective decides which product families may appear at all
 *      (families.ts), so unrelated products are suppressed however their
 *      generic thresholds come out.
 *   3. Each program serving one of those families is evaluated: amount limits
 *      and hard rules can exclude it, unknowns and soft failures hold it at
 *      Potential, and its source confidence caps it (programs.ts).
 *   4. Objective policies from the spec adjust the result (refinance rules).
 *   5. Families take the best state of their programs, for the customer;
 *      programs are ranked, with lender identities, for staff.
 *
 * Pure: same answers and library in, same result out. No I/O, no clock
 * beyond the equipment-age calculation in facts.ts.
 */

export const ENGINE_VERSION = "3.0.0-spec-v1.1";

const STATE_RANK: Record<MatchState, number> = {
  strong: 0,
  potential: 1,
  specialist_review: 2,
  no_current_match: 3,
};

const CONFIDENCE_RANK: Record<RuleConfidence, number> = {
  documented: 0,
  confirmed_legacy: 1,
  provisional: 2,
  manual_only: 3,
};

const better = (a: MatchState, b: MatchState) => (STATE_RANK[a] <= STATE_RANK[b] ? a : b);
const capAt = (state: MatchState, cap: MatchState) => (STATE_RANK[state] < STATE_RANK[cap] ? cap : state);

// -----------------------------------------------------------------------------
// Program evaluation
// -----------------------------------------------------------------------------

type RuleOutcome = Tri | "pending" | "skip";

function runRule(rule: Rule, facts: Facts): RuleOutcome {
  if (rule.appliesIf) {
    const applies = evaluateCondition(rule.appliesIf, facts);
    if (applies === false) return "skip";
    if (applies === "unknown") {
      // Can't tell whether it applies: it only counts if it would fail.
      const result = rule.check ? rule.check(facts) : rule.test ? evaluateCondition(rule.test, facts) : "pending";
      return result === true ? true : "unknown";
    }
  }
  if (rule.check) return rule.check(facts);
  if (!rule.test) return "pending";
  return evaluateCondition(rule.test, facts);
}

const money = (n: number) =>
  n >= 1_000_000 ? `$${n / 1_000_000}M` : n >= 1_000 ? `$${n / 1_000}K` : `$${n}`;

function amountFit(program: Program, facts: Facts): Tri {
  if (program.amountMin == null && program.amountMax == null) return true;
  const exact = typeof facts.request_amount === "number" ? facts.request_amount : null;
  const low = exact ?? (typeof facts.amount_low === "number" ? facts.amount_low : null);
  const high = exact ?? (typeof facts.amount_high === "number" ? facts.amount_high : null);
  if (low == null || high == null) return "unknown";
  const min = program.amountMin ?? 0;
  const max = program.amountMax ?? Number.POSITIVE_INFINITY;
  if (high < min || low > max) return false;
  return low >= min && high <= max ? true : "unknown";
}

function amountLabel(program: Program) {
  const { amountMin: min, amountMax: max } = program;
  if (min != null && max != null) return `${money(min)}–${money(max)}`;
  if (min != null) return `${money(min)}+`;
  return `up to ${money(max as number)}`;
}

interface Evaluation {
  program: Program;
  family: ProductFamily;
  slotIndex: number;
  objective: ObjectiveId;
  state: MatchState;
  failedRules: string[];
  softFlags: string[];
  pendingRules: string[];
  missingInputs: string[];
}

function isPresent(facts: Facts, key: string) {
  const value = facts[key];
  if (value === undefined || value === null) {
    // A range fact counts as present when its bounds are.
    return typeof facts[`${key}_low`] === "number";
  }
  return !(Array.isArray(value) && value.length === 0);
}

export function evaluateProgram(program: Program, facts: Facts): Omit<Evaluation, "family" | "slotIndex" | "objective"> {
  const failed: string[] = [];
  const review: string[] = [];
  const unconfirmed: string[] = [];
  const soft: string[] = [];
  const pendingRules: string[] = [];

  const amount = amountFit(program, facts);
  if (amount === false) failed.push(`Amount outside the program's range (${amountLabel(program)})`);
  if (amount === "unknown") unconfirmed.push(`Amount may fall outside the program's range (${amountLabel(program)})`);

  for (const rule of program.hardRules) {
    const outcome = runRule(rule, facts);
    if (outcome === false) (rule.onFail === "manual_review" ? review : failed).push(rule.description);
    else if (outcome === "unknown") unconfirmed.push(rule.description);
    else if (outcome === "pending") pendingRules.push(rule.description);
  }
  for (const rule of program.softRules) {
    const outcome = runRule(rule, facts);
    if (outcome === false) soft.push(rule.description);
    else if (outcome === "pending") pendingRules.push(rule.description);
    // An unknown soft rule is a preference we couldn't check; it neither
    // blocks Strong nor clutters the staff view.
  }

  const missingInputs = program.requiredInputs.filter((key) => !isPresent(facts, key));

  let state: MatchState;
  if (failed.length > 0) state = "no_current_match";
  else if (program.ruleConfidence === "manual_only" || review.length > 0 || missingInputs.length > 0) {
    state = "specialist_review";
  } else {
    state = unconfirmed.length || soft.length || pendingRules.length ? "potential" : "strong";
    // Older and marketing sources never produce Strong (spec §11).
    if (program.ruleConfidence !== "documented") state = capAt(state, "potential");
  }

  return {
    program,
    state,
    failedRules: [...failed, ...review.map((r) => `${r} (needs specialist review)`)],
    softFlags: [...soft, ...unconfirmed.map((r) => `Unconfirmed: ${r}`)],
    pendingRules,
    missingInputs,
  };
}

// -----------------------------------------------------------------------------
// Objective policies (spec §6.7)
// -----------------------------------------------------------------------------

const GOALS_MCA_WONT_SERVE = new Set(["lower_payment", "longer_term", "stop_daily_drafts"]);

function applyPolicies(objective: ObjectiveId, facts: Facts, evaluation: Evaluation) {
  if (objective !== "debt_refinance" && !(objective === "working_capital" && facts.use_of_funds === "refinance")) return;

  // More high-cost capital does not meet a goal of a lower or less frequent
  // payment: only offer it "when it improves the stated objective".
  if (evaluation.family === "revenue_based" && GOALS_MCA_WONT_SERVE.has(String(facts.debt_goal))) {
    evaluation.state = "no_current_match";
    evaluation.failedRules.push("Would add high-cost debt rather than meet the stated goal");
    return;
  }

  // SBA refinance only as Specialist Review until eligibility is documented.
  if (evaluation.family === "sba_loan") {
    evaluation.state = capAt(evaluation.state, "specialist_review");
  }

  // A current default or heavy stacking usually rules out new credit; route to
  // restructuring and a specialist rather than declining.
  const heavy =
    facts.current_default === true || (typeof facts.positions_low === "number" && facts.positions_low >= 4);
  if (heavy && evaluation.family !== "debt_restructuring" && evaluation.state !== "no_current_match") {
    evaluation.state = capAt(evaluation.state, "specialist_review");
    evaluation.softFlags.push("Current default or 4+ positions: restructuring first, new credit unlikely");
  }
}

// -----------------------------------------------------------------------------
// "I'm not sure" (spec §6.9)
// -----------------------------------------------------------------------------

const USE_TO_OBJECTIVE: Record<string, ObjectiveId> = {
  operations: "working_capital",
  inventory: "working_capital",
  equipment: "equipment",
  buy_property: "commercial_real_estate",
  refinance_property: "commercial_real_estate",
  investment_property: "investment_real_estate",
  buy_business: "business_acquisition",
  waiting_on_invoices: "accounts_receivable",
  pay_off_debt: "debt_refinance",
  start_business: "startup",
  other: "working_capital",
};

/** One to three likely objectives from the "not sure" answers. */
export function inferObjectives(facts: Facts): Exclude<ObjectiveId, "unsure">[] {
  const inferred: Exclude<ObjectiveId, "unsure">[] = [];
  const add = (objective: ObjectiveId | undefined) => {
    if (objective && objective !== "unsure" && !inferred.includes(objective)) inferred.push(objective);
  };
  add(USE_TO_OBJECTIVE[String(facts.unsure_use)] ?? "working_capital");
  const assets = Array.isArray(facts.unsure_assets) ? facts.unsure_assets : [];
  if (assets.includes("ar")) add("accounts_receivable");
  // A business under three months old is underwritten on the owner's credit
  // first, whatever the money is for.
  if (typeof facts.tib_months_high === "number" && facts.tib_months_high < 3) add("startup");
  if (assets.includes("equipment") && facts.unsure_use === "operations") add("equipment");
  return inferred.slice(0, 3);
}

// -----------------------------------------------------------------------------
// Missing information, for staff and for the "not sure" follow-up
// -----------------------------------------------------------------------------

const FIELD_LABELS = new Map(
  [...UNIVERSAL_PROFILE, ...Object.values(BRANCHES).flat()].map((field) => [field.id, field.label]),
);

const DERIVED_LABELS: Record<string, string> = {
  deposit_to_cost: "Equipment cost and monthly business deposits",
  re_purchase: "Purchase price",
  owns_titled_vehicle: "Whether the business owns a titled vehicle free and clear",
  ownership_diversity: "Ownership details (for diverse-owned business programs)",
  has_real_estate_asset: "Whether the business owns real estate with equity",
  no_recent_lates: "Late payments in the last 12 months",
  no_collections: "Unpaid collections or recent charge-offs",
  established_credit: "Credit history depth (mortgage, major bank card)",
};

export const labelForInput = (key: string) => DERIVED_LABELS[key] ?? FIELD_LABELS.get(key) ?? key;

/** Required branch questions for an objective that haven't been answered. */
export function unansweredBranchFields(objective: Exclude<ObjectiveId, "unsure">, answers: Answers): string[] {
  return BRANCHES[objective]
    .filter((field) => field.required && !field.showIf)
    .filter((field) => {
      const value = answers[field.id];
      return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
    })
    .map((field) => field.id);
}

// -----------------------------------------------------------------------------
// The match
// -----------------------------------------------------------------------------

function nextActionFor(state: MatchState): NextAction {
  if (state === "strong" || state === "potential") return "start_application";
  if (state === "specialist_review") return "specialist_review";
  return "request_manual_review";
}

export function match(
  objective: ObjectiveId,
  answers: Answers,
  programs: Program[] = PROGRAMS,
): MatchResult {
  const baseFacts = buildFacts(objective, answers);
  const objectives: Exclude<ObjectiveId, "unsure">[] =
    objective === "unsure" ? inferObjectives(baseFacts) : [objective];

  const evaluations: (Evaluation & { order: number })[] = [];
  const slotsByObjective: { objective: ObjectiveId; slots: FamilySlot[]; facts: Facts }[] = [];

  objectives.forEach((current, objectiveIndex) => {
    const facts: Facts = objective === "unsure" ? { ...buildFacts(current, answers), objective: current } : baseFacts;
    const slots = familiesFor(current, facts);
    slotsByObjective.push({ objective: current, slots, facts });

    const slotIndex = new Map(slots.map((slot, index) => [slot.family, index]));
    for (const program of programs) {
      if (!program.active || !program.objectiveAffinity.includes(current)) continue;
      const family = program.familyOverride?.[current] ?? program.productFamily;
      const index = slotIndex.get(family);
      if (index === undefined) continue;

      const evaluation: Evaluation & { order: number } = {
        ...evaluateProgram(program, facts),
        family,
        slotIndex: index,
        objective: current,
        order: objectiveIndex * 100 + index,
      };
      applyPolicies(current, facts, evaluation);
      evaluations.push(evaluation);
    }
  });

  // --- Customer view: families ------------------------------------------------
  const families = new Map<ProductFamily, ProductMatch & { order: number }>();
  slotsByObjective.forEach(({ objective: current, slots, facts }, objectiveIndex) => {
    slots.forEach((slot, index) => {
      const own = evaluations.filter(
        (e) => e.objective === current && e.family === slot.family && e.program.customerVisible !== false,
      );
      if (own.length === 0) return;
      const viable = own.filter((e) => e.state !== "no_current_match");
      // A complementary family with nothing viable is simply not mentioned; a
      // primary one is listed as "may not fit" so the customer isn't left
      // wondering whether the obvious product was considered (spec §9).
      if (viable.length === 0 && !slot.primary) return;

      const state = viable.reduce<MatchState>((best, e) => better(best, e.state), "no_current_match");
      const order = objectiveIndex * 100 + index;
      const existing = families.get(slot.family);
      if (existing) {
        existing.state = better(existing.state, state);
        existing.primary ||= slot.primary;
        return;
      }
      families.set(slot.family, {
        productFamily: slot.family,
        state,
        primary: slot.primary,
        estimatedRange: estimateRange(viable, facts),
        order,
      });
    });
  });

  const productMatches: ProductMatch[] = [...families.values()]
    .sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || a.order - b.order)
    .map(({ order: _order, ...rest }) => rest);

  // --- Staff view: routes ------------------------------------------------------
  const internalRoutes: InternalRoute[] = [...evaluations]
    .sort(
      (a, b) =>
        STATE_RANK[a.state] - STATE_RANK[b.state] ||
        a.order - b.order ||
        a.program.routingPriority - b.program.routingPriority ||
        CONFIDENCE_RANK[a.program.ruleConfidence] - CONFIDENCE_RANK[b.program.ruleConfidence] ||
        a.program.id.localeCompare(b.program.id),
    )
    .map((e, index) => ({
      programId: e.program.id,
      lenderId: e.program.lenderId,
      productFamily: e.family,
      state: e.state,
      routeRank: index + 1,
      confidence: e.program.ruleConfidence,
      failedRules: e.failedRules,
      softFlags: e.softFlags,
      pendingRules: e.pendingRules,
      missingInputs: e.missingInputs,
    }));

  const overallState = productMatches.reduce<MatchState>(
    (best, m) => better(best, m.state),
    "no_current_match",
  );

  // --- What's missing ------------------------------------------------------------
  const missing = new Set<string>();
  for (const route of internalRoutes) {
    if (route.state === "no_current_match") continue;
    for (const key of route.missingInputs) missing.add(labelForInput(key));
  }
  if (objective === "unsure") {
    for (const current of objectives) {
      for (const key of unansweredBranchFields(current, answers)) missing.add(labelForInput(key));
    }
  }
  if (
    objectives.some((o) => o === "commercial_real_estate" || o === "investment_real_estate") &&
    baseFacts.dscr == null
  ) {
    missing.add("Debt service terms, to calculate DSCR (not estimated)");
  }

  return {
    engineVersion: ENGINE_VERSION,
    objectiveId: objective,
    evaluatedObjectives: objectives,
    overallState,
    productMatches,
    internalRoutes,
    calculatedMetrics: metricsFrom(baseFacts),
    missingItems: [...missing],
    nextAction: nextActionFor(overallState),
  };
}

/**
 * An estimated range only from documented programs with a sizing formula and
 * the inputs it needs (spec §7: "Remove fake precision"). Across the viable
 * programs in a family, the widest documented span.
 */
function estimateRange(viable: Evaluation[], facts: Facts): { min: number; max: number } | null {
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  for (const e of viable) {
    if (e.program.ruleConfidence !== "documented" || !e.program.sizing) continue;
    if (e.state !== "strong" && e.state !== "potential") continue;
    const range = e.program.sizing.compute(facts);
    if (!range) continue;
    min = Math.min(min, range.min);
    max = Math.max(max, range.max);
  }
  return max > 0 && Number.isFinite(min) ? { min, max } : null;
}
