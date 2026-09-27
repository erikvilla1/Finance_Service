import type { FieldDef, FieldOption, ObjectiveId } from "./types";

/**
 * The questionnaire, as data: the universal profile every objective starts
 * with (spec §4), then one conditional branch per objective (spec §5-6).
 *
 * NEVER ASKED TWICE (spec §4). Where a branch in the spec repeats something
 * the universal profile already asked, the branch question is left out and the
 * engine derives it instead (see facts.ts):
 *   startup_stage        <- time_in_business
 *   bankruptcy_reporting <- credit_events
 *   startup_equipment_flag <- startup_use includes "equipment"
 *   ar_industry          <- industry
 *
 * ONE ADDITION. acq_deal_type is not in the spec's §6.5 field list, but Ready
 * Capital's appetite (v1.1 addendum) differs by acquisition vs partner buyout
 * vs franchise, and the objective's own description names all three. Without
 * it the engine could not tell which of Ready's rules applies.
 *
 * Option values are stable identifiers and are what gets stored; labels can
 * change freely.
 */

const opt = (value: string, label: string): FieldOption => ({ value, label });

// -----------------------------------------------------------------------------
// Universal profile (spec §4)
// -----------------------------------------------------------------------------

export const AMOUNT_RANGES: FieldOption[] = [
  opt("1_10k", "$1K–$10K"),
  opt("10k_25k", "$10K–$25K"),
  opt("25k_50k", "$25K–$50K"),
  opt("50k_100k", "$50K–$100K"),
  opt("100k_250k", "$100K–$250K"),
  opt("250k_500k", "$250K–$500K"),
  opt("500k_1m", "$500K–$1MM"),
  opt("1m_5m", "$1MM–$5MM"),
  opt("5m_plus", "$5MM+"),
];

export const TIME_IN_BUSINESS: FieldOption[] = [
  opt("startup_pre_revenue", "Startup / pre-revenue"),
  opt("lt_3m", "Less than 3 months"),
  opt("3_6m", "3–6 months"),
  opt("6_12m", "6–12 months"),
  opt("1_2y", "1–2 years"),
  opt("2_5y", "2–5 years"),
  opt("5y_plus", "5+ years"),
];

export const CREDIT_RANGES: FieldOption[] = [
  opt("lt_500", "Below 500"),
  opt("500_549", "500–549"),
  opt("550_599", "550–599"),
  opt("600_619", "600–619"),
  opt("620_649", "620–649"),
  opt("650_679", "650–679"),
  opt("680_699", "680–699"),
  opt("700_719", "700–719"),
  opt("720_739", "720–739"),
  opt("740_plus", "740+"),
  opt("not_sure", "Not sure"),
];

/** The existing taxonomy (migration 0028), plus Other, as the spec asks. */
export const INDUSTRIES: FieldOption[] = [
  "Construction",
  "Trucking & Transportation",
  "Healthcare & Medical",
  "Professional Services",
  "Retail",
  "Restaurants & Food Service",
  "Manufacturing",
  "Wholesale & Distribution",
  "Real Estate",
  "Automotive",
  "Technology & Software",
  "Agriculture",
  "Personal & Consumer Services",
  "Hospitality & Lodging",
  "Staffing & Employment",
  "Other",
].map((label) => opt(label, label));

/**
 * Split on purpose (spec §4, "Important UX change"): current and historical
 * events mean different things to different lenders, so bankruptcy and default
 * are separate choices, and active is separate from resolved.
 */
export const CREDIT_EVENTS: FieldOption[] = [
  opt("none", "None"),
  opt("bk_discharged", "Discharged or resolved bankruptcy"),
  opt("bk_active", "Active bankruptcy"),
  opt("prior_business_default", "Prior business-financing default"),
  opt("current_financing_default", "Current financing default"),
  opt("foreclosure_short_sale", "Foreclosure or short sale"),
  opt("other_not_sure", "Other / not sure"),
];

export const UNIVERSAL_PROFILE: FieldDef[] = [
  {
    id: "requested_amount_range",
    label: "How much financing are you looking for?",
    type: "single_select",
    options: AMOUNT_RANGES,
    required: true,
  },
  {
    id: "time_in_business",
    label: "How long has the business been operating?",
    type: "single_select",
    options: TIME_IN_BUSINESS,
    required: true,
  },
  {
    id: "owner_credit_range",
    label: "Estimated owner credit score",
    help: "Your best estimate is fine. This doesn't pull your credit.",
    type: "single_select",
    options: CREDIT_RANGES,
    required: true,
  },
  {
    id: "industry",
    label: "What industry are you in?",
    type: "single_select",
    options: INDUSTRIES,
    required: true,
  },
  {
    id: "credit_events",
    label: "Any major credit events?",
    help: "Select all that apply.",
    type: "multi_select",
    options: CREDIT_EVENTS,
    required: true,
  },
];

/**
 * Objectives where a universal question is secondary. Pure property branches
 * may treat time in business as secondary (spec §4): an investor buying a
 * flip is underwritten on the deal, not on how long an operating company has
 * existed.
 */
export const OPTIONAL_UNIVERSAL: Partial<Record<ObjectiveId, string[]>> = {
  investment_real_estate: ["time_in_business"],
};

// -----------------------------------------------------------------------------
// Branches (spec §6)
// -----------------------------------------------------------------------------

const YES_NO = [opt("yes", "Yes"), opt("no", "No")];
const YES_NO_UNSURE = [...YES_NO, opt("not_sure", "Not sure")];

const workingCapital: FieldDef[] = [
  { id: "avg_monthly_revenue", label: "Average monthly business revenue", type: "currency", required: true },
  { id: "avg_monthly_deposits", label: "Average monthly business deposits", type: "currency", required: true },
  {
    id: "deposit_trend",
    label: "How have your deposits been trending?",
    type: "single_select",
    options: [
      opt("growing", "Growing"),
      opt("consistent", "Consistent"),
      opt("seasonal", "Seasonal"),
      opt("declining", "Declining"),
    ],
    required: true,
  },
  {
    id: "open_positions_count",
    label: "How many business financing positions do you currently have?",
    type: "single_select",
    options: [opt("0", "None"), opt("1", "1"), opt("2", "2"), opt("3", "3"), opt("4_plus", "4 or more")],
    required: true,
  },
  {
    id: "current_financing_balance",
    label: "Approximate current business financing balance",
    type: "currency",
    required: true,
    showIf: { fact: "open_positions_count", op: "neq", value: "0" },
  },
  {
    id: "monthly_debt_payments",
    label: "Approximate monthly business debt payments",
    type: "currency",
    required: true,
    showIf: { fact: "open_positions_count", op: "neq", value: "0" },
  },
  {
    id: "use_of_funds",
    label: "What will the funds be used for?",
    type: "single_select",
    options: [
      opt("payroll", "Payroll"),
      opt("inventory", "Inventory"),
      opt("expansion", "Expansion"),
      opt("marketing", "Marketing"),
      opt("contract", "A specific contract or project"),
      opt("refinance", "Refinancing existing debt"),
      opt("other", "Other"),
    ],
    required: true,
  },
];

const equipment: FieldDef[] = [
  { id: "equipment_cost", label: "Equipment purchase price or amount to finance", type: "currency", required: true },
  {
    id: "equipment_category",
    label: "What type of equipment is it?",
    type: "single_select",
    options: [
      opt("construction", "Construction / heavy equipment"),
      opt("trucks_trailers", "Trucks & trailers"),
      opt("vehicles", "Other vehicles"),
      opt("medical", "Medical"),
      opt("manufacturing", "Manufacturing / industrial"),
      opt("restaurant", "Restaurant & food service"),
      opt("technology", "Technology & IT"),
      opt("agriculture", "Agriculture"),
      opt("other", "Other"),
    ],
    required: true,
  },
  {
    id: "equipment_condition",
    label: "New or used?",
    type: "single_select",
    options: [opt("new", "New"), opt("used", "Used")],
    required: true,
  },
  { id: "equipment_titled", label: "Is the equipment titled (like a truck or trailer)?", type: "single_select", options: YES_NO_UNSURE, required: true },
  {
    id: "seller_type",
    label: "Who are you buying it from?",
    type: "single_select",
    options: [opt("dealer", "A dealer or vendor"), opt("private_party", "A private party")],
    required: true,
  },
  {
    id: "equipment_year",
    label: "What year is the equipment, approximately?",
    type: "number",
    required: false,
    showIf: { fact: "equipment_condition", op: "eq", value: "used" },
  },
  { id: "equipment_state", label: "Which state is the business (and equipment) in?", type: "state", required: true },
  { id: "equipment_down_payment", label: "Down payment available, if any", type: "currency", required: false },
  { id: "equipment_monthly_deposits", label: "Average monthly business deposits", type: "currency", required: true },
];

const commercialRealEstate: FieldDef[] = [
  {
    id: "cre_occupancy_type",
    label: "How will the property be used?",
    type: "single_select",
    options: [
      opt("owner_occupied", "My business occupies it"),
      opt("investment", "Investment / tenants"),
      opt("mixed", "Both"),
    ],
    required: true,
  },
  {
    id: "cre_transaction_type",
    label: "What kind of transaction is it?",
    type: "single_select",
    options: [
      opt("purchase", "Purchase"),
      opt("rate_term_refi", "Rate/term refinance"),
      opt("cash_out", "Cash-out refinance"),
    ],
    required: true,
  },
  {
    id: "cre_property_type",
    label: "Property type",
    type: "single_select",
    options: [
      opt("office", "Office"),
      opt("retail", "Retail"),
      opt("industrial", "Industrial"),
      opt("multifamily", "Multifamily"),
      opt("mixed_use", "Mixed-use"),
      opt("hospitality", "Hospitality"),
      opt("self_storage", "Self-storage"),
      opt("special_use", "Special-use"),
      opt("other", "Other"),
    ],
    required: true,
  },
  { id: "cre_state", label: "Which state is the property in?", type: "state", required: true },
  {
    id: "cre_purchase_price",
    label: "Purchase price",
    type: "currency",
    required: true,
    showIf: { fact: "cre_transaction_type", op: "eq", value: "purchase" },
  },
  { id: "cre_current_value", label: "Current (as-is) value", type: "currency", required: true },
  { id: "cre_requested_loan", label: "Requested loan amount", type: "currency", required: true },
  {
    id: "cre_existing_debt",
    label: "Existing mortgage or debt on the property",
    type: "currency",
    required: true,
    showIf: { fact: "cre_transaction_type", op: "neq", value: "purchase" },
  },
  {
    id: "cre_occupancy",
    label: "How occupied is the property?",
    type: "single_select",
    options: [
      opt("90_100", "90–100%"),
      opt("75_89", "75–89%"),
      opt("50_74", "50–74%"),
      opt("under_50", "Under 50%"),
      opt("vacant", "Vacant"),
    ],
    required: false,
  },
  { id: "cre_noi", label: "Annual net operating income (NOI), if known", type: "currency", required: false },
  { id: "cre_gross_income", label: "Annual gross rents or revenue, if known", type: "currency", required: false },
];

const RE_FLIP_OR_BUILD = { fact: "re_subobjective", op: "in" as const, value: ["fix_and_flip", "ground_up"] };
const RE_INCOME = { fact: "re_subobjective", op: "in" as const, value: ["rental", "multifamily", "cash_out_refi"] };

const investmentRealEstate: FieldDef[] = [
  {
    id: "re_subobjective",
    label: "What kind of project is it?",
    type: "single_select",
    options: [
      opt("fix_and_flip", "Fix & flip"),
      opt("rental", "Rental"),
      opt("ground_up", "Ground-up construction"),
      opt("multifamily", "Multifamily"),
      opt("bridge", "Bridge"),
      opt("cash_out_refi", "Cash-out refinance"),
    ],
    required: true,
  },
  { id: "re_state", label: "Which state is the property in?", type: "state", required: true },
  {
    id: "re_property_type",
    label: "Property type",
    type: "single_select",
    options: [
      opt("sfr", "Single-family"),
      opt("condo", "Condo"),
      opt("2_4_unit", "2–4 units"),
      opt("5_plus_multifamily", "5+ unit multifamily"),
      opt("mixed_use", "Mixed-use"),
      opt("other", "Other"),
    ],
    required: true,
  },
  {
    id: "re_units",
    label: "How many units?",
    type: "number",
    required: false,
    showIf: { fact: "re_property_type", op: "in", value: ["2_4_unit", "5_plus_multifamily", "mixed_use"] },
  },
  {
    id: "re_purchase_price",
    label: "Purchase price",
    type: "currency",
    required: true,
    showIf: { fact: "re_subobjective", op: "in", value: ["fix_and_flip", "ground_up", "bridge", "rental", "multifamily"] },
  },
  {
    id: "re_as_is_value",
    label: "As-is value",
    type: "currency",
    required: true,
    showIf: { fact: "re_subobjective", op: "in", value: ["cash_out_refi", "bridge", "rental", "multifamily"] },
  },
  { id: "re_rehab_budget", label: "Rehab or construction budget", type: "currency", required: true, showIf: RE_FLIP_OR_BUILD },
  { id: "re_arv", label: "Projected after-repair (completed) value", type: "currency", required: true, showIf: RE_FLIP_OR_BUILD },
  { id: "re_requested_loan", label: "Requested financing", type: "currency", required: true },
  {
    id: "re_experience",
    label: "How many flips, rentals or construction projects have you completed in the last 3 years?",
    type: "single_select",
    options: [opt("0", "None yet"), opt("1_2", "1–2"), opt("3_5", "3–5"), opt("6_plus", "6 or more")],
    required: true,
  },
  { id: "re_liquidity", label: "Estimated available liquidity (cash and reserves)", type: "currency", required: true },
  { id: "re_monthly_rent", label: "Monthly rent (actual or projected)", type: "currency", required: true, showIf: RE_INCOME },
  {
    id: "re_taxes_insurance",
    label: "Monthly taxes, insurance and HOA",
    type: "currency",
    required: true,
    showIf: RE_INCOME,
  },
];

const businessAcquisition: FieldDef[] = [
  {
    id: "acq_deal_type",
    label: "What kind of purchase is it?",
    type: "single_select",
    options: [
      opt("acquisition", "Buying a business"),
      opt("franchise", "Buying a franchise"),
      opt("partner_buyout", "Buying out a partner"),
    ],
    required: true,
  },
  { id: "acq_purchase_price", label: "Business purchase price", type: "currency", required: true },
  { id: "acq_requested_financing", label: "Requested financing", type: "currency", required: true },
  { id: "acq_equity", label: "Cash or equity you can put in", type: "currency", required: true },
  {
    id: "acq_target_tib",
    label: "How long has the business you're buying been operating?",
    type: "single_select",
    options: [opt("lt_1y", "Less than 1 year"), opt("1_2y", "1–2 years"), opt("2_5y", "2–5 years"), opt("5y_plus", "5+ years")],
    required: true,
  },
  { id: "acq_target_revenue", label: "Its annual revenue", type: "currency", required: true },
  { id: "acq_target_cashflow", label: "Its annual cash flow (EBITDA or SDE), if known", type: "currency", required: false },
  {
    id: "acq_industry_experience",
    label: "Your experience in this industry or in managing a business like it",
    type: "single_select",
    options: [
      opt("none", "None yet"),
      opt("related", "Related experience"),
      opt("direct_1_3y", "1–3 years direct"),
      opt("direct_3y_plus", "3+ years direct"),
    ],
    required: true,
  },
  { id: "acq_real_estate_included", label: "Is real estate included in the purchase?", type: "single_select", options: YES_NO, required: true },
  { id: "acq_seller_note", label: "Is the seller offering financing?", type: "single_select", options: YES_NO_UNSURE, required: true },
];

const accountsReceivable: FieldDef[] = [
  {
    id: "ar_debtor_type",
    label: "Who owes you the receivables?",
    type: "single_select",
    options: [
      opt("businesses", "Businesses"),
      opt("government", "Government"),
      opt("insurance", "Insurance companies"),
      opt("consumers", "Consumers"),
      opt("mixed", "A mix"),
    ],
    required: true,
  },
  { id: "ar_monthly_sales", label: "Average monthly sales", type: "currency", required: true },
  { id: "ar_total", label: "Current eligible accounts receivable", type: "currency", required: true },
  { id: "ar_amount_requested", label: "Amount of receivables you want to finance", type: "currency", required: true },
  {
    id: "ar_terms",
    label: "Typical invoice terms",
    type: "single_select",
    options: [
      opt("net_15", "Net 15"),
      opt("net_30", "Net 30"),
      opt("net_45", "Net 45"),
      opt("net_60", "Net 60"),
      opt("net_90_plus", "Net 90+"),
      opt("mixed", "It varies"),
    ],
    required: true,
  },
  {
    id: "ar_days_to_pay",
    label: "How long do customers take to pay, on average?",
    type: "single_select",
    options: [
      opt("under_30", "Under 30 days"),
      opt("30_45", "30–45 days"),
      opt("46_60", "46–60 days"),
      opt("61_90", "61–90 days"),
      opt("over_90", "Over 90 days"),
    ],
    required: true,
  },
  {
    id: "ar_concentration",
    label: "How much of your receivables does your largest customer make up?",
    type: "single_select",
    options: [opt("under_25", "Under 25%"), opt("25_50", "25–50%"), opt("over_50", "Over 50%"), opt("not_sure", "Not sure")],
    required: false,
  },
];

const debtRefinance: FieldDef[] = [
  { id: "debt_total_balance", label: "Total balance to refinance or restructure", type: "currency", required: true },
  {
    id: "debt_position_count",
    label: "How many open positions?",
    type: "single_select",
    options: [opt("1", "1"), opt("2", "2"), opt("3", "3"), opt("4_plus", "4 or more")],
    required: true,
  },
  {
    id: "debt_types",
    label: "What kinds of debt?",
    help: "Select all that apply.",
    type: "multi_select",
    options: [
      opt("mca", "Merchant cash advance"),
      opt("loc", "Line of credit"),
      opt("term", "Term loan"),
      opt("credit_card", "Credit cards"),
      opt("other", "Other"),
    ],
    required: true,
  },
  {
    id: "debt_payment_frequency",
    label: "How often are payments taken?",
    type: "single_select",
    options: [opt("daily", "Daily"), opt("weekly", "Weekly"), opt("monthly", "Monthly"), opt("mixed", "A mix")],
    required: true,
  },
  { id: "debt_total_monthly_payment", label: "Approximate total monthly payment (all positions)", type: "currency", required: true },
  {
    id: "debt_remaining_term",
    label: "Remaining term, if known",
    type: "single_select",
    options: [
      opt("under_6m", "Under 6 months"),
      opt("6_12m", "6–12 months"),
      opt("12_24m", "12–24 months"),
      opt("over_24m", "Over 24 months"),
      opt("not_sure", "Not sure"),
    ],
    required: false,
  },
  { id: "debt_current_default", label: "Are any positions currently in default?", type: "single_select", options: YES_NO, required: true },
  {
    id: "debt_collateral",
    label: "What collateral is available?",
    help: "Select all that apply.",
    type: "multi_select",
    options: [
      opt("real_estate", "Real estate"),
      opt("equipment", "Equipment"),
      opt("ar", "Accounts receivable"),
      opt("other", "Other"),
      opt("none", "None"),
    ],
    required: true,
  },
  {
    id: "debt_goal",
    label: "What matters most in the refinance?",
    type: "single_select",
    options: [
      opt("lower_payment", "A lower payment"),
      opt("longer_term", "A longer term"),
      opt("consolidate", "Consolidating into one payment"),
      opt("stop_daily_drafts", "Stopping daily drafts"),
      opt("other", "Other"),
    ],
    required: true,
  },
];

const startup: FieldDef[] = [
  {
    id: "startup_use",
    label: "What do you need the funds for?",
    help: "Select all that apply.",
    type: "multi_select",
    options: [
      opt("startup_costs", "Startup costs"),
      opt("equipment", "Equipment"),
      opt("acquisition", "Buying a business"),
      opt("working_capital", "Working capital"),
      opt("marketing", "Marketing"),
      opt("other", "Other"),
    ],
    required: true,
  },
  {
    id: "personal_income_type",
    label: "Your main source of personal income",
    type: "single_select",
    options: [
      opt("w2", "W-2 employment"),
      opt("self_employed", "Self-employed"),
      opt("investment_other", "Investments or other"),
      opt("none", "None right now"),
    ],
    required: true,
  },
  {
    id: "personal_income",
    label: "Approximate annual personal income",
    type: "single_select",
    options: [
      opt("under_50k", "Under $50K"),
      opt("50k_100k", "$50K–$100K"),
      opt("100k_150k", "$100K–$150K"),
      opt("150k_250k", "$150K–$250K"),
      opt("250k_plus", "$250K+"),
    ],
    required: true,
    showIf: { fact: "personal_income_type", op: "neq", value: "none" },
  },
  {
    id: "credit_utilization",
    label: "Roughly how much of your available revolving credit are you using?",
    type: "single_select",
    options: [opt("under_30", "Under 30%"), opt("30_50", "30–50%"), opt("over_50", "Over 50%"), opt("not_sure", "Not sure")],
    required: true,
  },
  { id: "recent_lates", label: "Any late payments in the last 12 months?", type: "single_select", options: YES_NO, required: true },
  { id: "collections_chargeoffs", label: "Any unpaid collections or recent charge-offs?", type: "single_select", options: YES_NO, required: true },
  {
    id: "credit_depth",
    label: "Which of these are on your credit history?",
    help: "Select all that apply.",
    type: "multi_select",
    options: [
      opt("mortgage", "A mortgage"),
      opt("major_bank_card", "A major bank credit card"),
      opt("other_tradelines", "Other established accounts (auto, student loans)"),
      opt("none", "None of these"),
    ],
    required: true,
  },
];

const unsure: FieldDef[] = [
  {
    id: "unsure_use",
    label: "What will the money mainly be used for?",
    type: "single_select",
    options: [
      opt("operations", "Day-to-day operations or payroll"),
      opt("inventory", "Inventory"),
      opt("equipment", "Equipment or vehicles"),
      opt("buy_property", "Buying commercial property"),
      opt("refinance_property", "Refinancing property I own"),
      opt("investment_property", "An investment property or flip"),
      opt("buy_business", "Buying a business"),
      opt("waiting_on_invoices", "Covering the wait on unpaid invoices"),
      opt("pay_off_debt", "Paying off or consolidating debt"),
      opt("start_business", "Starting a business"),
      opt("other", "Something else"),
    ],
    required: true,
  },
  {
    id: "unsure_assets",
    label: "Which assets does the business have?",
    help: "Select all that apply.",
    type: "multi_select",
    options: [
      opt("real_estate", "Real estate"),
      opt("equipment", "Equipment"),
      opt("inventory", "Inventory"),
      opt("ar", "Accounts receivable"),
      opt("other", "Other"),
      opt("none", "None"),
    ],
    required: true,
  },
  {
    id: "unsure_priority",
    label: "What matters most to you?",
    type: "single_select",
    options: [
      opt("lowest_payment", "The lowest payment"),
      opt("speed", "Speed"),
      opt("largest_amount", "The largest amount"),
      opt("long_term", "A long term"),
      opt("flexible_access", "Flexible access to funds"),
      opt("not_sure", "Not sure"),
    ],
    required: true,
  },
];

export const BRANCHES: Record<ObjectiveId, FieldDef[]> = {
  working_capital: workingCapital,
  equipment,
  commercial_real_estate: commercialRealEstate,
  investment_real_estate: investmentRealEstate,
  business_acquisition: businessAcquisition,
  accounts_receivable: accountsReceivable,
  debt_refinance: debtRefinance,
  startup,
  unsure,
};

/**
 * The full question list for an objective: universal profile first, then the
 * branch, with the universal questions that objective treats as secondary made
 * optional. `showIf` is left on each field for the UI to evaluate as answers
 * come in.
 */
export function questionsFor(objective: ObjectiveId): FieldDef[] {
  const optional = new Set(OPTIONAL_UNIVERSAL[objective] ?? []);
  const universal = UNIVERSAL_PROFILE.map((field) =>
    optional.has(field.id) ? { ...field, required: false } : field,
  );
  return [...universal, ...BRANCHES[objective]];
}
