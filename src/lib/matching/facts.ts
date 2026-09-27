import type { Answers, CalculatedMetrics, Facts, ObjectiveId } from "./types";
import { BRANCHES, UNIVERSAL_PROFILE } from "./questions";

/**
 * Answers in, facts out.
 *
 * Rules never read raw option values. Every banded answer becomes a numeric
 * range (`credit_low` / `credit_high`, `tib_months_low` / `tib_months_high`,
 * `amount_low` / `amount_high`), so a rule like "credit ≥ 680" can be true, false,
 * or honestly unknown when the applicant picked a band that straddles 680 (see
 * the range handling in conditions.ts).
 *
 * Derived facts are computed only from inputs that exist. Nothing here fills a
 * gap with an assumption: a missing rent roll leaves DSCR absent rather than
 * estimated (spec §6.3, §7).
 */

type Range = [number, number];

const CREDIT: Record<string, Range> = {
  lt_500: [300, 499],
  "500_549": [500, 549],
  "550_599": [550, 599],
  "600_619": [600, 619],
  "620_649": [620, 649],
  "650_679": [650, 679],
  "680_699": [680, 699],
  "700_719": [700, 719],
  "720_739": [720, 739],
  "740_plus": [740, 850],
};

const TIB_MONTHS: Record<string, Range> = {
  startup_pre_revenue: [0, 0],
  lt_3m: [0, 2.99],
  "3_6m": [3, 5.99],
  "6_12m": [6, 11.99],
  "1_2y": [12, 23.99],
  "2_5y": [24, 59.99],
  "5y_plus": [60, 1200],
};

const AMOUNT: Record<string, Range> = {
  "1_10k": [1_000, 10_000],
  "10k_25k": [10_000, 25_000],
  "25k_50k": [25_000, 50_000],
  "50k_100k": [50_000, 100_000],
  "100k_250k": [100_000, 250_000],
  "250k_500k": [250_000, 500_000],
  "500k_1m": [500_000, 1_000_000],
  "1m_5m": [1_000_000, 5_000_000],
  "5m_plus": [5_000_000, 100_000_000],
};

const PERSONAL_INCOME: Record<string, Range> = {
  under_50k: [0, 49_999],
  "50k_100k": [50_000, 100_000],
  "100k_150k": [100_000, 150_000],
  "150k_250k": [150_000, 250_000],
  "250k_plus": [250_000, 10_000_000],
};

const UTILIZATION: Record<string, Range> = {
  under_30: [0, 29],
  "30_50": [30, 49],
  over_50: [51, 100],
};

const COUNT: Record<string, Range> = {
  "0": [0, 0],
  "1": [1, 1],
  "2": [2, 2],
  "3": [3, 3],
  "4_plus": [4, 50],
  "1_2": [1, 2],
  "3_5": [3, 5],
  "6_plus": [6, 500],
};

const ACQ_TIB_MONTHS: Record<string, Range> = {
  lt_1y: [0, 11.99],
  "1_2y": [12, 23.99],
  "2_5y": [24, 59.99],
  "5y_plus": [60, 1200],
};

/**
 * Fields the questionnaire declares numeric. Only these are parsed as numbers:
 * option values such as "0" or "4_plus" look numeric but are identifiers, and
 * rules compare them as strings.
 */
const NUMERIC_FIELDS = new Set(
  [...UNIVERSAL_PROFILE, ...Object.values(BRANCHES).flat()]
    .filter((field) => field.type === "currency" || field.type === "number" || field.type === "percent")
    .map((field) => field.id),
);

// -----------------------------------------------------------------------------

function str(value: Answers[string]): string | null {
  if (typeof value === "string") return value.trim() || null;
  return null;
}

function list(value: Answers[string]): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "string" && value) return [value];
  return [];
}

function num(value: Answers[string]): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function setRange(facts: Facts, name: string, band: string | null, table: Record<string, Range>) {
  const range = band ? table[band] : undefined;
  facts[`${name}_low`] = range ? range[0] : null;
  facts[`${name}_high`] = range ? range[1] : null;
}

const ratio = (a: number | null, b: number | null) =>
  a != null && b != null && b > 0 ? a / b : null;

/**
 * Every select and number answer is copied through under its own id first, so
 * a rule can always read a branch field directly (e.g. `equipment_titled`).
 * The derived facts below are the ones worth naming.
 */
export function buildFacts(objective: ObjectiveId, answers: Answers): Facts {
  const facts: Facts = {};

  for (const [key, value] of Object.entries(answers)) {
    if (Array.isArray(value)) facts[key] = list(value);
    else if (NUMERIC_FIELDS.has(key)) facts[key] = num(value);
    else if (typeof value === "string") facts[key] = value.trim() || null;
    else if (typeof value === "number") facts[key] = value;
  }

  facts.objective = objective;

  // --- Universal profile -----------------------------------------------------
  const creditBand = str(answers.owner_credit_range);
  setRange(facts, "credit", creditBand === "not_sure" ? null : creditBand, CREDIT);
  setRange(facts, "tib_months", str(answers.time_in_business), TIB_MONTHS);
  setRange(facts, "amount", str(answers.requested_amount_range), AMOUNT);

  const events = list(answers.credit_events);
  facts.credit_events = events;
  facts.bk_active = events.includes("bk_active");
  facts.bk_any = events.includes("bk_active") || events.includes("bk_discharged");
  facts.prior_business_default = events.includes("prior_business_default");
  facts.foreclosure = events.includes("foreclosure_short_sale");
  facts.current_default =
    events.includes("current_financing_default") || str(answers.debt_current_default) === "yes";
  // "Other / not sure" alongside nothing else: we genuinely don't know.
  facts.credit_events_clean =
    events.length === 0 ? null : events.length === 1 && events[0] === "none";

  // --- Objective-specific requested amount -----------------------------------
  // The exact figure where the branch asks for one; otherwise the range from
  // the universal profile carries the amount (see engine amount checks).
  const downPayment = num(answers.equipment_down_payment) ?? 0;
  const equipmentCost = num(answers.equipment_cost);
  const requested =
    objective === "equipment" && equipmentCost != null
      ? Math.max(equipmentCost - downPayment, 0)
      : objective === "commercial_real_estate"
        ? num(answers.cre_requested_loan)
        : objective === "investment_real_estate"
          ? num(answers.re_requested_loan)
          : objective === "business_acquisition"
            ? num(answers.acq_requested_financing)
            : objective === "accounts_receivable"
              ? num(answers.ar_amount_requested)
              : objective === "debt_refinance"
                ? num(answers.debt_total_balance)
                : null;
  facts.request_amount = requested;

  // --- Cash flow -------------------------------------------------------------
  const monthlyRevenue =
    num(answers.avg_monthly_revenue) ?? num(answers.ar_monthly_sales) ?? null;
  const monthlyDeposits =
    num(answers.avg_monthly_deposits) ?? num(answers.equipment_monthly_deposits) ?? null;
  facts.monthly_revenue = monthlyRevenue;
  facts.monthly_deposits = monthlyDeposits;
  // For an acquisition, the revenue a credit box reads is the target's.
  facts.annual_revenue =
    monthlyRevenue != null
      ? monthlyRevenue * 12
      : objective === "business_acquisition"
        ? num(answers.acq_target_revenue)
        : null;
  // Many credit boxes accept either measure ("$500K annual sales OR $40K a
  // month deposited"); this is the stronger of the two the applicant gave.
  facts.monthly_cash_flow_best =
    monthlyRevenue != null || monthlyDeposits != null
      ? Math.max(monthlyRevenue ?? 0, monthlyDeposits ?? 0)
      : null;

  // --- Existing obligations --------------------------------------------------
  setRange(facts, "positions", str(answers.open_positions_count) ?? str(answers.debt_position_count), COUNT);
  const frequency = str(answers.debt_payment_frequency);
  facts.daily_or_weekly_payments = frequency ? frequency === "daily" || frequency === "weekly" || frequency === "mixed" : null;
  const debtTypes = list(answers.debt_types);
  facts.has_high_cost_debt =
    debtTypes.length === 0 && frequency == null
      ? null
      : debtTypes.includes("mca") || frequency === "daily" || frequency === "weekly";

  // --- Equipment --------------------------------------------------------------
  const deposits = num(answers.equipment_monthly_deposits) ?? num(answers.avg_monthly_deposits);
  facts.deposit_to_cost = ratio(deposits, equipmentCost);
  const year = num(answers.equipment_year);
  const thisYear = new Date().getFullYear();
  facts.equipment_age_years =
    str(answers.equipment_condition) === "new" ? 0 : year != null && year > 1900 ? thisYear - year : null;
  facts.state =
    str(answers.equipment_state) ?? str(answers.cre_state) ?? str(answers.re_state) ?? null;

  // --- Real estate -------------------------------------------------------------
  const creLoan = num(answers.cre_requested_loan);
  const crePurchase = num(answers.cre_purchase_price);
  const creValue = num(answers.cre_current_value);
  const creBasis =
    str(answers.cre_transaction_type) === "purchase" && crePurchase != null
      ? creValue != null
        ? Math.min(crePurchase, creValue)
        : crePurchase
      : creValue;

  const reLoan = num(answers.re_requested_loan);
  const rePurchase = num(answers.re_purchase_price);
  const reAsIs = num(answers.re_as_is_value);
  const reRehab = num(answers.re_rehab_budget);
  const reArv = num(answers.re_arv);

  if (objective === "commercial_real_estate") {
    facts.ltv = ratio(creLoan, creBasis);
  } else if (objective === "investment_real_estate") {
    facts.ltv = ratio(reLoan, reAsIs ?? rePurchase);
    facts.ltc = reRehab != null && rePurchase != null ? ratio(reLoan, rePurchase + reRehab) : null;
    facts.arv_leverage = ratio(reLoan, reArv);
    // The flip/construction leverage the RCN-style programs describe: a share
    // of the purchase plus the rehab budget. Kept as the two parts so each
    // program can apply its own advance rate.
    facts.re_purchase = rePurchase;
    facts.re_rehab = reRehab;
  }
  facts.dscr = null; // Needs debt-service terms we never ask for (spec §6.3, §7).

  setRange(facts, "re_experience", str(answers.re_experience), COUNT);
  const reUnits = num(answers.re_units);
  facts.re_units = reUnits;

  // --- Acquisition -------------------------------------------------------------
  const acqPrice = num(answers.acq_purchase_price);
  facts.acq_injection_pct = ratio(num(answers.acq_equity), acqPrice);
  facts.acq_financing_pct = ratio(num(answers.acq_requested_financing), acqPrice);
  setRange(facts, "acq_target_tib_months", str(answers.acq_target_tib), ACQ_TIB_MONTHS);
  const experience = str(answers.acq_industry_experience);
  facts.acq_direct_experience = experience ? experience === "direct_1_3y" || experience === "direct_3y_plus" : null;
  const reIncluded = str(answers.acq_real_estate_included);
  facts.acq_real_estate_included = reIncluded ? reIncluded === "yes" : null;

  // --- Receivables -------------------------------------------------------------
  const debtor = str(answers.ar_debtor_type);
  facts.ar_b2b = debtor ? debtor === "businesses" || debtor === "government" || debtor === "mixed" : null;
  facts.ar_medical = debtor ? debtor === "insurance" || str(answers.industry) === "Healthcare & Medical" : null;
  facts.ar_annual_sales = num(answers.ar_monthly_sales) != null ? (num(answers.ar_monthly_sales) as number) * 12 : null;
  facts.ar_total = num(answers.ar_total);

  // --- Startup / personal credit -----------------------------------------------
  setRange(facts, "personal_income", str(answers.personal_income), PERSONAL_INCOME);
  const incomeType = str(answers.personal_income_type);
  facts.verifiable_income = incomeType ? incomeType !== "none" : null;
  const utilization = str(answers.credit_utilization);
  setRange(facts, "utilization", utilization === "not_sure" ? null : utilization, UTILIZATION);
  const depth = list(answers.credit_depth);
  facts.established_credit =
    depth.length === 0 ? null : depth.includes("mortgage") || depth.includes("major_bank_card");
  facts.no_recent_lates = str(answers.recent_lates) ? str(answers.recent_lates) === "no" : null;
  facts.no_collections = str(answers.collections_chargeoffs) ? str(answers.collections_chargeoffs) === "no" : null;
  const startupUse = list(answers.startup_use);
  facts.startup_equipment = objective === "startup" ? startupUse.includes("equipment") : null;

  // --- Assets (unsure branch, debt collateral) -----------------------------------
  const assets = [...list(answers.unsure_assets), ...list(answers.debt_collateral)];
  facts.has_real_estate_asset = assets.length ? assets.includes("real_estate") : null;
  facts.has_receivables_asset = assets.length ? assets.includes("ar") : null;

  return facts;
}

/** The ratios worth showing staff, from facts already computed (spec §7). */
export function metricsFrom(facts: Facts): CalculatedMetrics {
  const metrics: CalculatedMetrics = {};
  const put = (key: keyof CalculatedMetrics, value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      metrics[key] = Math.round(value * 1000) / 1000;
    }
  };
  put("ltv", facts.ltv);
  put("ltc", facts.ltc);
  put("arvLeverage", facts.arv_leverage);
  put("dscr", facts.dscr);
  put("depositToCost", facts.deposit_to_cost);
  return metrics;
}
