import type { Condition, Facts, Lender, Program, ProgramSource, Rule, Tri } from "./types";

/**
 * The lender program library (spec §3, §10, §11, v1.1 addendum).
 *
 * WHERE THE NUMBERS COME FROM. Every threshold below is quoted from a document
 * in Robert's lender breakdown folder (sent Aug 13, 2026) or from the spec
 * itself, and each program names its source and that source's date. Nothing
 * is inferred. Where a source says a requirement exists but we don't have the
 * number (360's PayNet review, QualiFi's credit box), the rule is left
 * without a test, which the engine treats as "pending": it holds the program
 * at Potential and tells staff what is outstanding.
 *
 * CONFIDENCE (spec §11). `documented` is reserved for the current-use anchors
 * the spec names (360's broker book, Finance Factory's sheets). Older or
 * marketing material is `provisional` or, for Ready Capital's 2020 appetite
 * sheet, `confirmed_legacy`; both cap a result at Potential Match.
 * `manual_only` programs (UCS until its 2026 guide arrives, Celtic's full
 * 7(a) box, niche lenders) always surface as Specialist Review.
 *
 * ROUTING PRIORITY is the default order within a deal family (spec §10 and
 * the v1.1 hierarchy): lower routes first. It is a ranking input, never an
 * override: the engine ranks by match state first.
 *
 * WHAT'S MISSING, AND WHY SOME PROGRAMS ARE THIN. The spec's §11 anchors for
 * UCS (2026 Product Guide and Referral Checklist), QualiFi (anything beyond
 * the addendum's product list) and RCN's white-label matrix were not in the
 * folder. Those programs run on what we have and are marked accordingly.
 */

// -----------------------------------------------------------------------------
// Building blocks
// -----------------------------------------------------------------------------

const source = (name: string, versionDate: string | null): ProgramSource => ({
  name,
  versionDate,
  lastVerified: null,
});

const money = (n: number) =>
  n >= 1_000_000 ? `$${n / 1_000_000}M` : n >= 1_000 ? `$${n / 1_000}K` : `$${n}`;

const minCredit = (score: number): Rule => ({
  id: `credit_${score}`,
  description: `Owner credit score ${score}+`,
  test: { fact: "credit", op: "gte", value: score },
});

const minTib = (months: number): Rule => ({
  id: `tib_${months}m`,
  description:
    months >= 12
      ? `${months / 12} year${months === 12 ? "" : "s"}+ in business`
      : `${months} month${months === 1 ? "" : "s"}+ in business`,
  test: { fact: "tib_months", op: "gte", value: months },
});

const NO_ACTIVE_BK: Rule = {
  id: "no_active_bankruptcy",
  description: "No current bankruptcy",
  test: { fact: "bk_active", op: "eq", value: false },
};

const NO_BK_ON_FILE: Rule = {
  id: "no_bankruptcy_on_file",
  description: "No bankruptcy on the credit report, of any age",
  test: { fact: "bk_any", op: "eq", value: false },
};

const notInStates = (states: string[]): Rule => ({
  id: "state_eligible",
  description: `Not available in ${states.join(", ")}`,
  test: { fact: "state", op: "not_in", value: states },
});

// Worded by the lender as "annual sales OR a month deposited"; both read the
// one revenue figure the prequal collects (facts.ts, Cash flow).
const salesOrDeposits = (annual: number, monthly: number): Rule => ({
  id: "sales_or_deposits",
  description: `${money(annual)} annual sales or ${money(monthly)} a month deposited`,
  test: {
    any: [
      { fact: "annual_revenue", op: "gte", value: annual },
      { fact: "monthly_revenue", op: "gte", value: monthly },
    ],
  },
});

const minAnnualSales = (annual: number): Rule => ({
  id: `annual_sales_${annual}`,
  description: `${money(annual)}+ annual sales`,
  test: { fact: "annual_revenue", op: "gte", value: annual },
});

const excludeIndustries = (industries: string[]): Rule => ({
  id: "industry_eligible",
  description: `Industry not excluded (${industries.join(", ")})`,
  test: { fact: "industry", op: "not_in", value: industries },
});

/** A documented requirement whose number FLS doesn't have yet. */
const pending = (id: string, description: string): Rule => ({ id, description });

const is = (fact: string, value: unknown): Condition => ({ fact, op: "eq", value: value as never });

/** request_amount <= a limit computed from other facts. */
const loanWithin =
  (limit: (facts: Facts) => number | null) =>
  (facts: Facts): Tri => {
    const cap = limit(facts);
    const loan = facts.request_amount;
    if (cap == null || typeof loan !== "number") return "unknown";
    return loan <= cap;
  };

const ratioAtMost = (fact: string, max: number): Rule["check"] => (facts) => {
  const value = facts[fact];
  return typeof value === "number" ? value <= max : "unknown";
};

const n = (value: unknown) => (typeof value === "number" ? value : null);

const HEALTHCARE = "Healthcare & Medical";

// -----------------------------------------------------------------------------
// Lenders
// -----------------------------------------------------------------------------

export const LENDERS: Lender[] = [
  { id: "ucs", name: "United Capital Source", notes: "Broker network. Robert also refers to it as United Capital Funding." },
  { id: "three_sixty", name: "360 Equipment Finance" },
  { id: "finance_factory", name: "Finance Factory" },
  { id: "rcn", name: "RCN Capital" },
  { id: "ready_capital", name: "Ready Capital" },
  { id: "celtic_bank", name: "Celtic Bank" },
  { id: "qualifi", name: "QualiFi" },
  { id: "national", name: "National Business Capital", notes: "Broker platform (75+ lending partners)." },
  { id: "ibusiness", name: "iBusiness Funding", notes: "Ready Capital subsidiary." },
  { id: "value_capital", name: "Value Capital Funding" },
  { id: "arf", name: "ARF Financial" },
  { id: "global_mca", name: "Global Financial Services" },
  { id: "founders_first", name: "Founders First Capital Partners" },
  { id: "american_business_credit", name: "American Business Credit" },
  { id: "four_hour_funding", name: "4 Hour Funding" },
  { id: "bsb", name: "BSB" },
  { id: "slim_capital", name: "Slim Capital" },
  { id: "maxim", name: "Maxim Commercial Capital" },
  { id: "bankers_capital", name: "Bankers Capital" },
  { id: "lima_one", name: "Lima One Capital" },
  { id: "sky_equity", name: "Sky Equity" },
  { id: "silver_hill", name: "Silver Hill Funding" },
  { id: "stronghill", name: "Stronghill Capital" },
  { id: "easy_street", name: "Easy Street Capital" },
  { id: "harbour", name: "Harbour Group Capital" },
  { id: "alleon", name: "Alleon Healthcare Capital" },
  { id: "orange_commercial", name: "Orange Commercial Credit" },
  { id: "us_financial", name: "U.S. Financial" },
  { id: "hedaya", name: "Hedaya Capital Group" },
  { id: "global_church", name: "Global Church Financing" },
  { id: "griffin", name: "Griffin Capital Funding" },
  { id: "ab_nicholas", name: "A.B. Nicholas Securities Finance" },
];

// -----------------------------------------------------------------------------
// Sources
// -----------------------------------------------------------------------------

const SRC = {
  ucs: source("UCS 2026 Referral Submission Checklist and 2026 Product Guide (cited in spec v1.1 §11; not yet supplied)", "2026"),
  qualifi: source("QualiFi product summary (spec v1.1 addendum)", "2026-09"),
  threeSixty: source("360 Equipment Finance Broker Book (file: NEW 2024 QUICK REFERENCE GUIDE.pdf); $150K ceiling per spec v1.1 §11", "2023"),
  financeFactory: source("Finance Factory broker presentation and PreQual Questioning sheet", null),
  rcn: source("RCN Capital broker training (July 2024); white-label matrix cited in spec §11 not yet supplied", "2024-07"),
  ready: source("Ready Capital Current Deal Appetite (updated 6/8/20) and broker presentation", "2020-06-08"),
  celticExpress: source("Celtic Bank Express Loan Guidelines (docx)", "2021"),
  celtic: source("Celtic Bank SBA application package and sales deck", null),
  ibusiness: source("iBusiness Funding training deck", null),
  national: source("National Business Capital Partner Cheat Sheet", null),
  vcf: source("Value Capital Funding Working Capital & Debt Restructuring deck (9-23)", "2023-09"),
  arf: source("ARF Financial Lending Criteria and broker training (7/23/2024)", "2024-07-23"),
  globalMca: source("Global Financial Services ISO sheet", null),
  foundersFirst: source("Founders First RBF and term loan one-pagers (updated 08.22.23)", "2023-08-22"),
  abc: source("American Business Credit product detail and broker deck", null),
  fourHour: source("4 Hour Funding Broker Kit V34", null),
  bsb: source("BSB broker presentation (2.16.24)", "2024-02-16"),
  slim: source("Slim Capital Q3 broker programs and presentation", null),
  maxim: source("Maxim Broker Guidelines (1.1.2024)", "2024-01-01"),
  bankers: source("Bankers Capital funding parameters", null),
  limaOne: source("Lima One All-in-One product sheet (2024 broker packet)", "2024"),
  skyEquity: source("Sky Equity Loan Programs and Bridge Program Matrix (Aug 10, 2022)", "2022-08-10"),
  silverHill: source("Silver Hill DSCR and Small-Balance Commercial product sheets (2024)", "2024"),
  stronghill: source("Stronghill DSCR and Multifamily grids (as of 2/01/2024)", "2024-02-01"),
  easyStreet: source("Easy Street Capital broker tear sheet (02.08.23)", "2023-02-08"),
  harbour: source("Harbour Group Capital submission package", null),
  alleon: source("Alleon Healthcare Capital one-pager and 2024 brochure", "2024"),
  orange: source("Orange Commercial Credit company profile", null),
  usFinancial: source("U.S. Financial factoring presentation", null),
  hedaya: source("Hedaya Capital broker presentation (9-12-2024)", "2024-09-12"),
  church: source("Church financing flyers (Global Church, Griffin)", null),
  abNicholas: source("A.B. Nicholas securities-based lending deck (4.25.23)", "2023-04-25"),
};

// -----------------------------------------------------------------------------
// Programs
// -----------------------------------------------------------------------------

const UCS_NOTE =
  "Primary general-business route (spec §10). Automated rules wait for the UCS 2026 Product Guide; the earlier portal-modelled thresholds are deliberately not reused (spec §17).";

const QUALIFI_PENDING = pending(
  "qualifi_credit_box",
  "Credit, time-in-business and revenue minimums pending a current QualiFi underwriting matrix (spec v1.1)",
);

const REFI = { debt_refinance: "debt_refinance" } as const;

export const PROGRAMS: Program[] = [
  // ===========================================================================
  // UNITED CAPITAL SOURCE: manual until the 2026 guide arrives
  // ===========================================================================
  ...(
    [
      ["ucs_term_loan", "term_loan", ["working_capital", "debt_refinance"], 1, REFI],
      ["ucs_line_of_credit", "line_of_credit", ["working_capital"], 1, undefined],
      ["ucs_revenue_based", "revenue_based", ["working_capital", "debt_refinance"], 1, undefined],
      ["ucs_equipment", "equipment_financing", ["equipment", "startup"], 2, undefined],
      ["ucs_factoring", "invoice_factoring", ["accounts_receivable"], 2, undefined],
      ["ucs_sba", "sba_loan", ["working_capital", "business_acquisition", "commercial_real_estate", "debt_refinance"], 3, { commercial_real_estate: "owner_user_cre" }],
      ["ucs_asset_based", "asset_based", ["working_capital", "debt_refinance"], 2, undefined],
    ] as const
  ).map(
    ([id, family, affinity, priority, override]): Program => ({
      id,
      lenderId: "ucs",
      productFamily: family,
      displayNameInternal: `UCS ${family.replaceAll("_", " ")}`,
      active: true,
      routingPriority: priority,
      objectiveAffinity: [...affinity],
      source: SRC.ucs,
      ruleConfidence: "manual_only",
      hardRules: [],
      softRules: [],
      requiredInputs: [],
      notes: UCS_NOTE,
      familyOverride: override,
    }),
  ),

  // ===========================================================================
  // QUALIFI: high-priority broad-product route (v1.1 addendum)
  // ===========================================================================
  {
    id: "qualifi_term_loan",
    lenderId: "qualifi",
    productFamily: "term_loan",
    displayNameInternal: "QualiFi term loan (5–10 yr)",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["working_capital", "debt_refinance", "business_acquisition"],
    source: SRC.qualifi,
    ruleConfidence: "provisional",
    amountMax: 500_000,
    hardRules: [],
    softRules: [QUALIFI_PENDING],
    requiredInputs: [],
    notes: "5–10 year terms up to $500K. Advertised rates and turnaround are not eligibility rules.",
    familyOverride: REFI,
  },
  {
    id: "qualifi_line_of_credit",
    lenderId: "qualifi",
    productFamily: "line_of_credit",
    displayNameInternal: "QualiFi line of credit",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["working_capital"],
    source: SRC.qualifi,
    ruleConfidence: "provisional",
    amountMax: 250_000,
    hardRules: [],
    softRules: [QUALIFI_PENDING],
    requiredInputs: [],
  },
  {
    id: "qualifi_equipment",
    lenderId: "qualifi",
    productFamily: "equipment_financing",
    displayNameInternal: "QualiFi equipment financing",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["equipment", "startup"],
    source: SRC.qualifi,
    ruleConfidence: "provisional",
    hardRules: [],
    softRules: [QUALIFI_PENDING],
    requiredInputs: [],
    notes: "Up to 100% financing, terms up to 7 years.",
  },
  {
    id: "qualifi_factoring",
    lenderId: "qualifi",
    productFamily: "invoice_factoring",
    displayNameInternal: "QualiFi invoice factoring",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["accounts_receivable"],
    source: SRC.qualifi,
    ruleConfidence: "provisional",
    hardRules: [],
    softRules: [QUALIFI_PENDING],
    requiredInputs: [],
  },
  {
    id: "qualifi_po_financing",
    lenderId: "qualifi",
    productFamily: "po_financing",
    displayNameInternal: "QualiFi purchase-order financing",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["accounts_receivable"],
    source: SRC.qualifi,
    ruleConfidence: "provisional",
    hardRules: [],
    softRules: [QUALIFI_PENDING],
    requiredInputs: [],
  },
  {
    id: "qualifi_commercial_mortgage",
    lenderId: "qualifi",
    productFamily: "commercial_mortgage",
    displayNameInternal: "QualiFi commercial mortgage",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["commercial_real_estate"],
    source: SRC.qualifi,
    ruleConfidence: "provisional",
    hardRules: [],
    softRules: [QUALIFI_PENDING],
    requiredInputs: [],
  },
  {
    id: "qualifi_bridge",
    lenderId: "qualifi",
    productFamily: "bridge_loan",
    displayNameInternal: "QualiFi bridge loan (3–24 mo)",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["commercial_real_estate", "investment_real_estate"],
    source: SRC.qualifi,
    ruleConfidence: "provisional",
    hardRules: [],
    softRules: [QUALIFI_PENDING],
    requiredInputs: [],
  },
  {
    id: "qualifi_heloc",
    lenderId: "qualifi",
    productFamily: "heloc",
    displayNameInternal: "QualiFi HELOC",
    active: true,
    routingPriority: 3,
    // Not auto-surfaced: the questionnaire doesn't ask about home equity, and
    // a personal residence is not something to suggest unprompted. Staff can
    // raise it on review.
    objectiveAffinity: [],
    source: SRC.qualifi,
    ruleConfidence: "provisional",
    amountMin: 15_000,
    amountMax: 750_000,
    hardRules: [minCredit(640)],
    softRules: [],
    requiredInputs: [],
    customerVisible: false,
    notes: "640+ primary residence, 680+ investment/second home; max CLTV 85%, max DTI 50%; SFR, condo, townhome; 10/15/20/30-yr terms.",
  },

  // ===========================================================================
  // 360 EQUIPMENT FINANCE: first equipment route (spec §6.2)
  // Cash-flow lender, no minimum FICO. Current bankruptcy, tax liens over $25K
  // and late child support are automatic declines (the last two aren't asked;
  // they're in the documents).
  // ===========================================================================
  {
    id: "three_sixty_small_ticket",
    lenderId: "three_sixty",
    productFamily: "equipment_financing",
    displayNameInternal: "360 Small Ticket ($5K–$25K)",
    active: true,
    routingPriority: 1,
    objectiveAffinity: ["equipment", "startup"],
    source: SRC.threeSixty,
    ruleConfidence: "documented",
    amountMin: 5_000,
    amountMax: 25_000,
    hardRules: [
      notInStates(["AK", "HI", "LA"]),
      NO_ACTIVE_BK,
      {
        id: "deposits_40pct_of_cost",
        description: "Organic monthly deposits (monthly revenue) at least 40% of the equipment cost",
        test: { fact: "deposit_to_cost", op: "gte", value: 0.4 },
      },
    ],
    softRules: [
      {
        id: "equipment_age_20y",
        description: "Equipment 20 years old or newer (preferred)",
        appliesIf: { fact: "equipment_condition", op: "eq", value: "used" },
        test: { fact: "equipment_age_years", op: "lte", value: 20 },
      },
    ],
    requiredInputs: ["deposit_to_cost"],
    requiredDocuments: ["Credit application (all owners)", "Credit report", "3 months business bank statements"],
    notes: "Terms up to 36 months; true lease, 10% purchase option; minimum 10% security deposit.",
  },
  {
    id: "three_sixty_pennybacker",
    lenderId: "three_sixty",
    productFamily: "equipment_financing",
    displayNameInternal: "360 Pennybacker ($5K–$50K)",
    active: true,
    routingPriority: 1,
    objectiveAffinity: ["equipment", "startup"],
    source: SRC.threeSixty,
    ruleConfidence: "documented",
    amountMin: 5_000,
    amountMax: 50_000,
    hardRules: [notInStates(["AK", "HI", "LA"]), NO_ACTIVE_BK],
    softRules: [
      {
        id: "deposits_85pct_of_cost",
        description: "Monthly deposits (monthly revenue) roughly 85–100% of the equipment cost (underwriting guideline)",
        test: { fact: "deposit_to_cost", op: "gte", value: 0.85 },
      },
      {
        id: "equipment_age_20y",
        description: "Equipment 20 years old or newer (preferred)",
        appliesIf: { fact: "equipment_condition", op: "eq", value: "used" },
        test: { fact: "equipment_age_years", op: "lte", value: 20 },
      },
      {
        id: "established_cash_flow",
        description: "Established business with steady cash flow (startups rarely meet the revenue requirement)",
        test: { fact: "tib_months", op: "gte", value: 6 },
      },
    ],
    requiredInputs: ["deposit_to_cost"],
    notes: "Terms up to 48 months; soft collateral (tools, fitness, restaurant) capped at $50K.",
  },
  {
    id: "three_sixty_heavy_metal",
    lenderId: "three_sixty",
    productFamily: "equipment_financing",
    displayNameInternal: "360 Heavy Metal ($50K+)",
    active: true,
    routingPriority: 1,
    objectiveAffinity: ["equipment"],
    source: SRC.threeSixty,
    ruleConfidence: "documented",
    amountMin: 50_000,
    // The 2023 broker book caps Heavy Metal at $100K; spec v1.1 §11 gives the
    // current range as $5K–$150K. Following the spec pending a newer book.
    amountMax: 150_000,
    hardRules: [
      notInStates(["AK", "HI", "LA"]),
      NO_ACTIVE_BK,
      {
        id: "heavy_equipment_only",
        description: "Yellow iron or heavy trucks",
        test: { fact: "equipment_category", op: "in", value: ["construction", "trucks_trailers"] },
      },
      {
        id: "equipment_age_20y",
        description: "Equipment 20 years old or newer",
        appliesIf: { fact: "equipment_condition", op: "eq", value: "used" },
        test: { fact: "equipment_age_years", op: "lte", value: 20 },
      },
      {
        id: "no_startups",
        description: "Owner-operators and start-ups do not qualify",
        test: { fact: "tib_months", op: "gte", value: 12 },
      },
      {
        id: "deposits_85pct_of_request",
        description: "Organic monthly deposits (monthly revenue) at least 85% of the requested amount",
        test: { fact: "deposit_to_cost", op: "gte", value: 0.85 },
      },
    ],
    softRules: [pending("paynet_comparable_credit", "PayNet/business credit review; comparable borrowing credit preferred")],
    requiredInputs: ["deposit_to_cost"],
    notes: "All equipment valued by 360. Terms up to 60 months.",
  },
  {
    id: "three_sixty_sale_leaseback",
    lenderId: "three_sixty",
    productFamily: "asset_based",
    displayNameInternal: "360 Sale Leaseback (vehicle-backed working capital)",
    active: true,
    routingPriority: 3,
    objectiveAffinity: ["working_capital"],
    source: SRC.threeSixty,
    ruleConfidence: "documented",
    amountMin: 5_000,
    amountMax: 50_000,
    hardRules: [notInStates(["AK", "HI", "LA"]), NO_ACTIVE_BK],
    softRules: [],
    // Needs a titled vehicle owned free and clear, which the working-capital
    // branch doesn't ask about: always a specialist conversation.
    requiredInputs: ["owns_titled_vehicle"],
    notes: "Titled vehicles/trailers only, owned free and clear, 10 years or newer (box trucks 5); 2:1 collateral to funding.",
  },

  // ===========================================================================
  // FINANCE FACTORY: first startup route (spec §6.8)
  // Credit-line and term-loan rules kept distinct, as the spec asks.
  // ===========================================================================
  {
    id: "finance_factory_credit_lines",
    lenderId: "finance_factory",
    productFamily: "startup_credit_line",
    displayNameInternal: "Finance Factory unsecured credit lines",
    active: true,
    routingPriority: 1,
    objectiveAffinity: ["startup", "business_acquisition"],
    source: SRC.financeFactory,
    ruleConfidence: "documented",
    amountMax: 150_000,
    hardRules: [
      minCredit(680),
      NO_BK_ON_FILE,
      { id: "no_recent_lates", description: "No late payments in the last 12 months", test: is("no_recent_lates", true) },
      { id: "no_collections", description: "No unpaid collections or charge-offs in the last 5 years", test: is("no_collections", true) },
      {
        id: "utilization_under_50",
        description: "Revolving balances under 50% of limits",
        test: { fact: "utilization", op: "lt", value: 50 },
      },
      {
        id: "established_credit",
        description: "A mortgage with 3 years' history or a major bank card ($3K+ limit, 3 years)",
        test: is("established_credit", true),
      },
    ],
    softRules: [
      {
        id: "utilization_under_35",
        description: "Utilization under 35% (best case)",
        test: { fact: "utilization", op: "lt", value: 35 },
      },
    ],
    requiredInputs: ["no_recent_lates", "no_collections", "established_credit"],
    notes: "Stated income up to $150K. No more than 5 inquiries in 6 months. Fee typically 9.9% of the amount obtained.",
    familyOverride: { business_acquisition: "unsecured_term_loan" },
  },
  {
    id: "finance_factory_term_loans",
    lenderId: "finance_factory",
    productFamily: "startup_term_loan",
    displayNameInternal: "Finance Factory unsecured term loans",
    active: true,
    routingPriority: 1,
    objectiveAffinity: ["startup", "business_acquisition"],
    source: SRC.financeFactory,
    ruleConfidence: "documented",
    hardRules: [
      minCredit(680),
      NO_BK_ON_FILE,
      { id: "no_recent_lates", description: "No late payments in the last 12 months", test: is("no_recent_lates", true) },
      { id: "no_collections", description: "No unpaid collections or charge-offs in the last 5 years", test: is("no_collections", true) },
      {
        id: "established_credit",
        description: "Established credit history (more than one card account)",
        test: is("established_credit", true),
      },
    ],
    softRules: [
      {
        id: "verifiable_income",
        description: "Verifiable income (pay stubs, W-2, tax returns or award letters; not bank statements). Without it, roughly $25–50K stated income.",
        test: is("verifiable_income", true),
      },
    ],
    requiredInputs: ["no_recent_lates", "no_collections", "established_credit"],
    notes: "3, 5 or 7-year terms; no prepayment penalty.",
    familyOverride: { business_acquisition: "unsecured_term_loan" },
  },
  {
    id: "finance_factory_bdra",
    lenderId: "finance_factory",
    productFamily: "retirement_rollover",
    displayNameInternal: "Finance Factory BDRA (retirement rollover)",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["startup", "business_acquisition"],
    source: SRC.financeFactory,
    ruleConfidence: "manual_only",
    hardRules: [],
    softRules: [],
    requiredInputs: [],
    customerVisible: false,
    notes: "Not a loan: $50K+ in a retirement account with a previous employer, buying or starting a business; requires a C-corp.",
  },

  // ===========================================================================
  // AMERICAN BUSINESS CREDIT: personal-credit unsecured
  // ===========================================================================
  {
    id: "abc_unsecured",
    lenderId: "american_business_credit",
    productFamily: "unsecured_term_loan",
    displayNameInternal: "American Business Credit unsecured term loans",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["startup", "working_capital", "business_acquisition"],
    source: SRC.abc,
    ruleConfidence: "provisional",
    amountMin: 10_000,
    amountMax: 350_000,
    hardRules: [
      {
        id: "credit_700_or_680_medical",
        description: "Credit 700+ (680+ for medical professionals)",
        test: {
          any: [
            { fact: "credit", op: "gte", value: 700 },
            { all: [is("industry", HEALTHCARE), { fact: "credit", op: "gte", value: 680 }] },
          ],
        },
      },
      NO_ACTIVE_BK,
      { id: "no_foreclosure", description: "No foreclosure or short sale", test: is("foreclosure", false) },
      { id: "no_recent_lates", description: "No late payments in the last year", test: is("no_recent_lates", true) },
      { id: "no_collections", description: "No collections or charge-offs", test: is("no_collections", true) },
      {
        id: "income_30k",
        description: "Verifiable income of $30K+ (max funding is 2x income)",
        test: { fact: "personal_income", op: "gte", value: 30_000 },
      },
    ],
    softRules: [
      { id: "no_bk_10y", description: "No bankruptcy in the last 10 years (age not collected)", test: is("bk_any", false) },
      { id: "established_credit", description: "4-year credit history with 3 years of revolving accounts", test: is("established_credit", true) },
    ],
    requiredInputs: ["no_recent_lates", "no_collections"],
    notes: "Not an SBA lender. No-income card program up to $75–150K.",
    familyOverride: { business_acquisition: "unsecured_term_loan" },
  },

  // ===========================================================================
  // RCN CAPITAL: first fix & flip / ground-up route (spec §6.4)
  // ===========================================================================
  {
    id: "rcn_fix_and_flip",
    lenderId: "rcn",
    productFamily: "fix_and_flip",
    displayNameInternal: "RCN purchase & rehab (12 mo)",
    active: true,
    routingPriority: 1,
    objectiveAffinity: ["investment_real_estate"],
    source: SRC.rcn,
    ruleConfidence: "provisional",
    amountMin: 50_000,
    amountMax: 3_000_000,
    hardRules: [
      notInStates(["AK", "NV", "ND", "SD", "VT"]),
      {
        id: "residential_only",
        description: "1–4 units, condos, townhomes or 5+ unit residential (no commercial property or land)",
        test: { fact: "re_property_type", op: "in", value: ["sfr", "condo", "2_4_unit", "5_plus_multifamily"] },
      },
      {
        id: "five_plus_minimum",
        description: "5+ unit loans start at $250K",
        appliesIf: is("re_property_type", "5_plus_multifamily"),
        test: { fact: "request_amount", op: "gte", value: 250_000 },
      },
      NO_ACTIVE_BK,
      {
        id: "no_bk_foreclosure_2y",
        description: "No foreclosure or bankruptcy in the last 2 years",
        check: (f) => (f.bk_active === true ? false : f.bk_any === true || f.foreclosure === true ? "unknown" : f.bk_any === false ? true : "unknown"),
      },
    ],
    softRules: [
      minCredit(660),
      {
        id: "leverage_90_purchase_100_rehab",
        description: "Loan within 90% of purchase plus 100% of rehab",
        check: loanWithin((f) => (n(f.re_purchase) != null ? 0.9 * (n(f.re_purchase) as number) + (n(f.re_rehab) ?? 0) : null)),
      },
    ],
    requiredInputs: ["re_purchase"],
    notes: "Experience affects pricing, not eligibility. Non-owner occupied only.",
  },
  {
    id: "rcn_ground_up",
    lenderId: "rcn",
    productFamily: "ground_up_construction",
    displayNameInternal: "RCN ground-up construction (up to 24 mo)",
    active: true,
    routingPriority: 1,
    objectiveAffinity: ["investment_real_estate"],
    source: SRC.rcn,
    ruleConfidence: "provisional",
    amountMin: 100_000,
    hardRules: [
      notInStates(["AK", "NV", "ND", "SD", "VT"]),
      minCredit(650),
      {
        id: "construction_experience",
        description: "At least one completed new-construction project",
        test: { fact: "re_experience", op: "gte", value: 1 },
      },
      {
        id: "after_construction_value_150k",
        description: "After-construction value of $150K+",
        test: { fact: "re_arv", op: "gte", value: 150_000 },
      },
      {
        id: "residential_1_9_units",
        description: "1–4 units, condos, townhomes; 5–9 units with prior experience",
        test: { fact: "re_property_type", op: "in", value: ["sfr", "condo", "2_4_unit", "5_plus_multifamily"] },
      },
      NO_ACTIVE_BK,
    ],
    softRules: [
      pending("guc_experience_is_construction", "Experience counted must be new construction specifically (the questionnaire asks for projects of any kind)"),
      pending("per_unit_value", "Minimum $100K value per unit on 2–4 unit and multifamily"),
    ],
    requiredInputs: ["re_arv"],
  },
  {
    id: "rcn_rental",
    lenderId: "rcn",
    productFamily: "rental_dscr",
    displayNameInternal: "RCN 30-yr rental",
    active: true,
    routingPriority: 1,
    objectiveAffinity: ["investment_real_estate"],
    source: SRC.rcn,
    ruleConfidence: "provisional",
    amountMin: 50_000,
    amountMax: 3_000_000,
    hardRules: [
      notInStates(["AK", "NV", "ND", "SD", "VT"]),
      minCredit(660),
      {
        id: "residential_1_9_units",
        description: "1–4 units, condos, townhomes or 5–9 units",
        test: { fact: "re_property_type", op: "in", value: ["sfr", "condo", "2_4_unit", "5_plus_multifamily"] },
      },
      NO_ACTIVE_BK,
    ],
    softRules: [{ id: "ltv_80", description: "Up to 80% LTV", check: ratioAtMost("ltv", 0.8) }],
    requiredInputs: [],
  },

  // ===========================================================================
  // SPECIALTY REAL ESTATE: secondary to RCN (spec §6.4, §10)
  // ===========================================================================
  {
    id: "lima_one_fix_and_flip",
    lenderId: "lima_one",
    productFamily: "fix_and_flip",
    displayNameInternal: "Lima One Fix N Flip / Bridge Plus",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["investment_real_estate"],
    source: SRC.limaOne,
    ruleConfidence: "provisional",
    amountMax: 3_000_000,
    hardRules: [notInStates(["AK", "ND", "SD", "VT"])],
    softRules: [
      { id: "ltc_92_5", description: "Up to 92.5% LTC", check: ratioAtMost("ltc", 0.925) },
      { id: "arv_75", description: "Up to 75% of after-repair value", check: ratioAtMost("arv_leverage", 0.75) },
    ],
    requiredInputs: [],
    notes: "13, 19 or 24-month terms; non-recourse available.",
  },
  {
    id: "lima_one_rental",
    lenderId: "lima_one",
    productFamily: "rental_dscr",
    displayNameInternal: "Lima One rental (single and portfolio)",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["investment_real_estate"],
    source: SRC.limaOne,
    ruleConfidence: "provisional",
    amountMin: 75_000,
    hardRules: [notInStates(["AK", "ND", "SD", "VT"])],
    softRules: [
      {
        id: "ltv_80_purchase_75_cash_out",
        description: "Up to 80% LTV on purchases, 75% cash-out",
        check: (f) => {
          const ltv = n(f.ltv);
          if (ltv == null) return "unknown";
          return ltv <= (f.re_subobjective === "cash_out_refi" ? 0.75 : 0.8);
        },
      },
    ],
    requiredInputs: [],
  },
  {
    id: "lima_one_construction",
    lenderId: "lima_one",
    productFamily: "ground_up_construction",
    displayNameInternal: "Lima One new construction",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["investment_real_estate"],
    source: SRC.limaOne,
    ruleConfidence: "provisional",
    amountMax: 3_000_000,
    hardRules: [notInStates(["AK", "ND", "SD", "VT"])],
    softRules: [
      { id: "ltc_85", description: "Up to 85% LTC", check: ratioAtMost("ltc", 0.85) },
      { id: "arv_70", description: "Up to 70% of completed value", check: ratioAtMost("arv_leverage", 0.7) },
    ],
    requiredInputs: [],
  },
  {
    id: "lima_one_multifamily",
    lenderId: "lima_one",
    productFamily: "multifamily",
    displayNameInternal: "Lima One multifamily bridge",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["investment_real_estate", "commercial_real_estate"],
    source: SRC.limaOne,
    ruleConfidence: "provisional",
    amountMax: 10_000_000,
    hardRules: [notInStates(["AK", "ND", "SD", "VT"])],
    softRules: [{ id: "ltc_85", description: "Up to 85% LTC", check: ratioAtMost("ltc", 0.85) }],
    requiredInputs: [],
    notes: "Value-add and stabilized; non-recourse.",
  },
  {
    id: "sky_equity_fix_and_flip",
    lenderId: "sky_equity",
    productFamily: "fix_and_flip",
    displayNameInternal: "Sky Equity fix & flip bridge",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["investment_real_estate"],
    source: SRC.skyEquity,
    ruleConfidence: "provisional",
    amountMin: 100_000,
    amountMax: 3_500_000,
    hardRules: [
      minCredit(620),
      {
        id: "no_experience_box",
        description: "Without bridge experience: 700+ credit and loans up to $1.5M",
        appliesIf: { fact: "re_experience", op: "lte", value: 0 },
        test: { all: [{ fact: "credit", op: "gte", value: 700 }, { fact: "request_amount", op: "lte", value: 1_500_000 }] },
      },
    ],
    softRules: [
      { id: "ltc_90", description: "Up to 90% LTC", check: ratioAtMost("ltc", 0.9) },
      { id: "arv_75", description: "Up to 75% of after-repair value", check: ratioAtMost("arv_leverage", 0.75) },
      pending("state_list", "Lends in 42 states (list in the eligibility map)"),
    ],
    requiredInputs: [],
  },
  {
    id: "sky_equity_rental",
    lenderId: "sky_equity",
    productFamily: "rental_dscr",
    displayNameInternal: "Sky Equity 30-yr DSCR rental",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["investment_real_estate"],
    source: SRC.skyEquity,
    ruleConfidence: "provisional",
    amountMin: 100_000,
    amountMax: 3_500_000,
    hardRules: [minCredit(620)],
    softRules: [
      {
        id: "ltv_80_purchase_75_cash_out",
        description: "Up to 80% LTV, 75% cash-out or refinance",
        check: (f) => {
          const ltv = n(f.ltv);
          if (ltv == null) return "unknown";
          return ltv <= (f.re_subobjective === "cash_out_refi" ? 0.75 : 0.8);
        },
      },
      pending("state_list", "Lends in 42 states (list in the eligibility map)"),
    ],
    requiredInputs: [],
  },
  {
    id: "sky_equity_ground_up",
    lenderId: "sky_equity",
    productFamily: "ground_up_construction",
    displayNameInternal: "Sky Equity ground-up construction",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["investment_real_estate"],
    source: SRC.skyEquity,
    ruleConfidence: "provisional",
    amountMin: 100_000,
    amountMax: 10_000_000,
    hardRules: [minCredit(660)],
    softRules: [
      { id: "ltc_85", description: "Up to 85% LTC", check: ratioAtMost("ltc", 0.85) },
      { id: "arv_70", description: "Up to 70% of completed value", check: ratioAtMost("arv_leverage", 0.7) },
    ],
    requiredInputs: [],
  },
  {
    id: "sky_equity_multifamily",
    lenderId: "sky_equity",
    productFamily: "multifamily",
    displayNameInternal: "Sky Equity multifamily bridge",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["investment_real_estate", "commercial_real_estate"],
    source: SRC.skyEquity,
    ruleConfidence: "provisional",
    amountMin: 250_000,
    amountMax: 20_000_000,
    hardRules: [minCredit(660)],
    softRules: [{ id: "ltv_80", description: "Up to 80% purchase LTV", check: ratioAtMost("ltv", 0.8) }],
    requiredInputs: [],
  },
  {
    id: "sky_equity_commercial_bridge",
    lenderId: "sky_equity",
    productFamily: "bridge_loan",
    displayNameInternal: "Sky Equity commercial / mixed-use bridge",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["commercial_real_estate", "investment_real_estate"],
    source: SRC.skyEquity,
    ruleConfidence: "provisional",
    amountMin: 200_000,
    amountMax: 20_000_000,
    hardRules: [
      minCredit(620),
      {
        id: "non_owner_occupied",
        description: "Non-owner occupied only",
        test: { fact: "cre_occupancy_type", op: "neq", value: "owner_occupied" },
      },
    ],
    softRules: [{ id: "ltv_75", description: "Up to 75% LTV", check: ratioAtMost("ltv", 0.75) }],
    requiredInputs: [],
    notes: "12-month bridge; stabilized commercial term loans $3M–$75M at 65% LTV.",
  },
  {
    id: "silver_hill_dscr",
    lenderId: "silver_hill",
    productFamily: "rental_dscr",
    displayNameInternal: "Silver Hill DSCR (1–4 units)",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["investment_real_estate"],
    source: SRC.silverHill,
    ruleConfidence: "provisional",
    amountMin: 100_000,
    amountMax: 2_000_000,
    hardRules: [minCredit(620)],
    softRules: [
      { id: "ltv_80", description: "Up to 80% LTV", check: ratioAtMost("ltv", 0.8) },
      { id: "dscr_1_0", description: "DSCR 1.0x+", test: { fact: "dscr", op: "gte", value: 1 } },
    ],
    requiredInputs: [],
    notes: "No tax returns; income from property cash flow; foreign nationals eligible.",
  },
  {
    id: "silver_hill_sbc_investor",
    lenderId: "silver_hill",
    productFamily: "investment_cre",
    displayNameInternal: "Silver Hill small-balance commercial (investor)",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["commercial_real_estate"],
    source: SRC.silverHill,
    ruleConfidence: "provisional",
    amountMin: 100_000,
    amountMax: 2_000_000,
    hardRules: [
      minCredit(650),
      {
        id: "investor_property",
        description: "Investor-owned property",
        test: { fact: "cre_occupancy_type", op: "in", value: ["investment", "mixed"] },
      },
    ],
    softRules: [
      {
        id: "ltv_80_purchase_75_refi",
        description: "Up to 80% LTV on purchases, 75% on refinances",
        check: (f) => {
          const ltv = n(f.ltv);
          if (ltv == null) return "unknown";
          return ltv <= (f.cre_transaction_type === "purchase" ? 0.8 : 0.75);
        },
      },
      { id: "dscr_1_15", description: "DSCR 1.15x+", test: { fact: "dscr", op: "gte", value: 1.15 } },
    ],
    requiredInputs: [],
  },
  {
    id: "silver_hill_sbc_owner_occupied",
    lenderId: "silver_hill",
    productFamily: "owner_user_cre",
    displayNameInternal: "Silver Hill small-balance commercial (owner-occupied)",
    active: true,
    routingPriority: 3,
    objectiveAffinity: ["commercial_real_estate"],
    source: SRC.silverHill,
    ruleConfidence: "provisional",
    amountMin: 100_000,
    amountMax: 2_000_000,
    hardRules: [
      minCredit(650),
      {
        id: "owner_occupied",
        description: "Owner-occupied property",
        test: { fact: "cre_occupancy_type", op: "in", value: ["owner_occupied", "mixed"] },
      },
    ],
    softRules: [
      {
        id: "ltv_80_purchase_75_refi",
        description: "Up to 80% LTV on purchases, 75% on refinances",
        check: (f) => {
          const ltv = n(f.ltv);
          if (ltv == null) return "unknown";
          return ltv <= (f.cre_transaction_type === "purchase" ? 0.8 : 0.75);
        },
      },
      pending("global_dscr_1_2", "Global DSCR 1.2x (business and personal cash flow)"),
    ],
    requiredInputs: [],
  },
  {
    id: "stronghill_dscr",
    lenderId: "stronghill",
    productFamily: "rental_dscr",
    displayNameInternal: "Stronghill Investment Achiever DSCR",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["investment_real_estate"],
    source: SRC.stronghill,
    ruleConfidence: "provisional",
    amountMin: 100_000,
    amountMax: 3_000_000,
    hardRules: [minCredit(640)],
    softRules: [
      {
        id: "ltv_grid",
        description: "Within the LTV grid for the credit tier and loan size (DSCR ≥ 1.00)",
        check: (f) => {
          const ltv = n(f.ltv);
          const loan = n(f.request_amount);
          const low = n(f.credit_low);
          if (ltv == null || loan == null || low == null) return "unknown";
          const cashOut = f.re_subobjective === "cash_out_refi";
          const tier = low >= 720 ? 720 : low >= 680 ? 680 : low >= 640 ? 640 : 0;
          const grid: Record<number, [number, number, number][]> = {
            // [max loan, purchase LTV, cash-out LTV]
            720: [[1_500_000, 0.8, 0.75], [2_000_000, 0.75, 0.7], [3_000_000, 0.7, 0.65]],
            680: [[1_500_000, 0.75, 0.7], [2_000_000, 0.7, 0.65], [3_000_000, 0.65, 0]],
            640: [[1_000_000, 0.75, 0.7], [1_500_000, 0.65, 0.65], [2_000_000, 0.65, 0], [3_000_000, 0.6, 0]],
          };
          const row = (grid[tier] ?? []).find(([max]) => loan <= max);
          if (!row) return false;
          const cap = cashOut ? row[2] : row[1];
          return cap > 0 && ltv <= cap;
        },
      },
    ],
    requiredInputs: [],
  },
  {
    id: "stronghill_multifamily",
    lenderId: "stronghill",
    productFamily: "multifamily",
    displayNameInternal: "Stronghill multifamily / mixed-use DSCR",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["investment_real_estate"],
    source: SRC.stronghill,
    ruleConfidence: "provisional",
    amountMin: 350_000,
    amountMax: 2_000_000,
    hardRules: [
      minCredit(660),
      {
        id: "five_to_eight_units",
        description: "5–8 residential units or 2–8 unit mixed use",
        test: { fact: "re_property_type", op: "in", value: ["5_plus_multifamily", "mixed_use"] },
      },
    ],
    softRules: [
      { id: "dscr_1_0", description: "DSCR 1.00x+ (1.10x and 9% debt yield at $1.5M+)", test: { fact: "dscr", op: "gte", value: 1 } },
      {
        id: "experienced_investor",
        description: "Owned and managed investment property for 1+ year in the last 3",
        test: { fact: "re_experience", op: "gte", value: 1 },
      },
    ],
    requiredInputs: [],
  },
  {
    id: "easy_street_dscr",
    lenderId: "easy_street",
    productFamily: "rental_dscr",
    displayNameInternal: "Easy Street long-term rental DSCR",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["investment_real_estate"],
    source: SRC.easyStreet,
    ruleConfidence: "provisional",
    amountMin: 100_000,
    amountMax: 4_000_000,
    hardRules: [notInStates(["ND", "SD"]), minCredit(620)],
    softRules: [
      {
        id: "ltv_by_purpose_and_credit",
        description: "Up to 80% LTV (75% cash-out; 70% with credit 620–659)",
        check: (f) => {
          const ltv = n(f.ltv);
          if (ltv == null) return "unknown";
          const low = n(f.credit_low);
          const cap = low != null && low < 660 ? 0.7 : f.re_subobjective === "cash_out_refi" ? 0.75 : 0.8;
          return ltv <= cap;
        },
      },
      { id: "dscr_min", description: "DSCR 0.75x at 70% LTV or less, 1.00x above 75% LTV or on cash-out", test: { fact: "dscr", op: "gte", value: 0.75 } },
    ],
    requiredInputs: [],
  },
  {
    id: "harbour_fix_flip_hold",
    lenderId: "harbour",
    productFamily: "fix_and_flip",
    displayNameInternal: "Harbour Group Capital fix, flip & hold",
    active: true,
    routingPriority: 3,
    objectiveAffinity: ["investment_real_estate"],
    source: SRC.harbour,
    ruleConfidence: "manual_only",
    hardRules: [],
    softRules: [],
    requiredInputs: [],
    customerVisible: false,
    notes: "Guidelines in the folder aren't legible; submission package only.",
  },

  // ===========================================================================
  // SBA: Ready Capital -> Celtic Bank (manual/secondary) -> other (v1.1)
  // ===========================================================================
  {
    id: "ready_acquisition",
    lenderId: "ready_capital",
    productFamily: "sba_loan",
    displayNameInternal: "Ready Capital SBA 7(a) acquisition / partner buyout",
    active: true,
    routingPriority: 1,
    objectiveAffinity: ["business_acquisition"],
    source: SRC.ready,
    ruleConfidence: "confirmed_legacy",
    amountMin: 500_000,
    amountMax: 7_000_000,
    hardRules: [
      {
        id: "credit_700_acquisition",
        description: "700+ credit for acquisitions",
        appliesIf: { fact: "acq_deal_type", op: "neq", value: "partner_buyout" },
        test: { fact: "credit", op: "gte", value: 700 },
      },
      {
        id: "credit_680_buyout",
        description: "680+ credit for partner buyouts",
        appliesIf: is("acq_deal_type", "partner_buyout"),
        test: { fact: "credit", op: "gte", value: 680 },
      },
      {
        id: "target_2y_history",
        description: "2 years plus interim of sufficient debt service coverage",
        appliesIf: { fact: "acq_deal_type", op: "neq", value: "partner_buyout" },
        test: { fact: "acq_target_tib_months", op: "gte", value: 24 },
      },
      {
        id: "buyout_1y_history",
        description: "1 full year plus interim of sufficient debt service coverage",
        appliesIf: is("acq_deal_type", "partner_buyout"),
        test: { fact: "acq_target_tib_months", op: "gte", value: 12 },
      },
      {
        id: "experience_or_real_estate",
        description: "Direct industry experience, or well secured by real estate",
        test: { any: [is("acq_direct_experience", true), is("acq_real_estate_included", true)] },
        onFail: "manual_review",
      },
    ],
    softRules: [
      {
        id: "financing_80_85",
        description: "Up to 85% financing for specialty industries (medical, dental, veterinary, pharmacy, insurance, FedEx routes), 80% otherwise",
        check: (f) => {
          const pct = n(f.acq_financing_pct);
          if (pct == null) return "unknown";
          return pct <= (f.industry === HEALTHCARE ? 0.85 : 0.8);
        },
      },
      pending("stable_revenue", "Stable revenue trends"),
    ],
    requiredInputs: ["acq_deal_type"],
    notes: "Appetite sheet dated 2020: thresholds are confirmed legacy pending Ready's updated SBA credit box (spec §20). Partial seller financing encouraged.",
  },
  {
    id: "ready_owner_occupied_cre",
    lenderId: "ready_capital",
    productFamily: "owner_user_cre",
    displayNameInternal: "Ready Capital SBA owner-occupied CRE",
    active: true,
    routingPriority: 1,
    objectiveAffinity: ["commercial_real_estate"],
    source: SRC.ready,
    ruleConfidence: "confirmed_legacy",
    amountMin: 500_000,
    amountMax: 7_000_000,
    hardRules: [
      {
        id: "owner_occupied_51",
        description: "Owner-occupied (51%+)",
        check: (f) =>
          f.cre_occupancy_type === "owner_occupied" ? true : f.cre_occupancy_type === "mixed" ? "unknown" : f.cre_occupancy_type == null ? "unknown" : false,
      },
      {
        id: "no_startups",
        description: "No start-ups unless fully secured by real estate",
        test: { fact: "tib_months", op: "gte", value: 12 },
        onFail: "manual_review",
      },
    ],
    softRules: [
      { id: "dscr_1_15", description: "Minimum DSCR 1.15x", test: { fact: "dscr", op: "gte", value: 1.15 } },
      {
        id: "special_use_ltv_90",
        description: "Up to 90% LTV on special-use property (100% multi-use)",
        appliesIf: is("cre_property_type", "special_use"),
        check: ratioAtMost("ltv", 0.9),
      },
    ],
    requiredInputs: [],
    notes: "Real estate terms 25 years. Special-purpose: hotel, car wash, gas station, assisted living, daycare, self storage, restaurant and more.",
  },
  {
    id: "ready_expansion",
    lenderId: "ready_capital",
    productFamily: "sba_loan",
    displayNameInternal: "Ready Capital SBA expansion",
    active: true,
    routingPriority: 1,
    objectiveAffinity: ["working_capital"],
    source: SRC.ready,
    ruleConfidence: "confirmed_legacy",
    amountMin: 500_000,
    amountMax: 7_000_000,
    hardRules: [
      {
        id: "expansion_only",
        description: "Expansion (a new location); no standalone working capital",
        test: is("use_of_funds", "expansion"),
      },
    ],
    softRules: [pending("existing_cash_flow", "Existing locations' cash flow must support the new location's debt")],
    requiredInputs: [],
    notes: "Up to 90% financing.",
  },
  {
    id: "celtic_express",
    lenderId: "celtic_bank",
    productFamily: "sba_loan",
    displayNameInternal: "Celtic Bank SBA Express ($50K–$150K)",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["working_capital", "debt_refinance"],
    source: SRC.celticExpress,
    ruleConfidence: "provisional",
    amountMin: 50_000,
    amountMax: 150_000,
    hardRules: [
      minCredit(680),
      { ...minTib(12), description: "Reported revenue for at least 1 year (no start-ups)" },
      excludeIndustries(["Construction", "Trucking & Transportation", "Hospitality & Lodging", "Restaurants & Food Service"]),
    ],
    softRules: [
      {
        id: "refinance_half_of_proceeds",
        description: "No more than 50% of proceeds for debt refinance, with 1.5x debt service coverage",
        test: { fact: "objective", op: "neq", value: "debt_refinance" },
      },
      pending("bank_statement_review", "12 months of statements: revenue every month, not down more than 20%"),
    ],
    requiredInputs: [],
    notes: "Guidelines reference 2020–21 financials; treated as provisional. Franchises need a FUND score of 550+.",
  },
  {
    id: "celtic_sba_7a",
    lenderId: "celtic_bank",
    productFamily: "sba_loan",
    displayNameInternal: "Celtic Bank SBA 7(a)",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["business_acquisition", "commercial_real_estate", "working_capital", "debt_refinance", "startup"],
    source: SRC.celtic,
    ruleConfidence: "manual_only",
    hardRules: [],
    softRules: [],
    requiredInputs: [],
    notes: "Secondary SBA route. The application package confirms uses of proceeds but no credit box; no automated thresholds (v1.1 addendum).",
    familyOverride: { commercial_real_estate: "owner_user_cre" },
  },
  {
    id: "ibusiness_sba",
    lenderId: "ibusiness",
    productFamily: "sba_loan",
    displayNameInternal: "iBusiness Funding SBA",
    active: true,
    routingPriority: 3,
    objectiveAffinity: ["working_capital", "business_acquisition", "debt_refinance", "commercial_real_estate", "startup"],
    source: SRC.ibusiness,
    ruleConfidence: "manual_only",
    hardRules: [
      {
        id: "owner_operated",
        description: "Owner-operated businesses only; passive investment property is ineligible",
        appliesIf: is("objective", "commercial_real_estate"),
        test: { fact: "cre_occupancy_type", op: "neq", value: "investment" },
      },
    ],
    softRules: [],
    requiredInputs: [],
    notes: "Ready Capital subsidiary, PLP lender. 10% injection for start-ups, acquisitions and CRE; DSCR 1.15x.",
    familyOverride: { commercial_real_estate: "owner_user_cre" },
  },

  // ===========================================================================
  // NATIONAL BUSINESS CAPITAL: secondary working capital, A/R line (spec §6.1, §6.6)
  // ===========================================================================
  {
    id: "national_sba",
    lenderId: "national",
    productFamily: "sba_loan",
    displayNameInternal: "National SBA 7(a) / 504",
    active: true,
    routingPriority: 3,
    objectiveAffinity: ["working_capital", "business_acquisition", "debt_refinance", "commercial_real_estate"],
    source: SRC.national,
    ruleConfidence: "provisional",
    amountMax: 5_000_000,
    hardRules: [minTib(24), minCredit(660), salesOrDeposits(500_000, 40_000), NO_ACTIVE_BK],
    softRules: [
      {
        id: "no_bk_foreclosure_3y",
        description: "No bankruptcies, liens or foreclosures in the last 3 years (age not collected)",
        test: { all: [is("bk_any", false), is("foreclosure", false)] },
      },
    ],
    requiredInputs: [],
    familyOverride: { commercial_real_estate: "owner_user_cre" },
  },
  {
    id: "national_term_loan",
    lenderId: "national",
    productFamily: "term_loan",
    displayNameInternal: "National business term loan",
    active: true,
    routingPriority: 3,
    objectiveAffinity: ["working_capital", "debt_refinance"],
    source: SRC.national,
    ruleConfidence: "provisional",
    amountMax: 10_000_000,
    hardRules: [minTib(24), minCredit(600), salesOrDeposits(500_000, 40_000)],
    softRules: [
      {
        id: "refinance_up_to_2",
        description: "Refinances up to 2 existing loans",
        appliesIf: is("objective", "debt_refinance"),
        test: { fact: "positions", op: "lte", value: 2 },
      },
    ],
    requiredInputs: [],
    notes: "1–2 year terms, weekly or monthly payments.",
    familyOverride: REFI,
  },
  {
    id: "national_line_of_credit",
    lenderId: "national",
    productFamily: "line_of_credit",
    displayNameInternal: "National business line of credit",
    active: true,
    routingPriority: 3,
    objectiveAffinity: ["working_capital"],
    source: SRC.national,
    ruleConfidence: "provisional",
    amountMax: 750_000,
    hardRules: [minTib(12), minCredit(600), salesOrDeposits(500_000, 40_000)],
    softRules: [],
    requiredInputs: [],
  },
  {
    id: "national_business_advance",
    lenderId: "national",
    productFamily: "revenue_based",
    displayNameInternal: "National business advance",
    active: true,
    routingPriority: 3,
    objectiveAffinity: ["working_capital", "debt_refinance"],
    source: SRC.national,
    ruleConfidence: "provisional",
    amountMax: 10_000_000,
    hardRules: [minTib(12), salesOrDeposits(500_000, 40_000)],
    softRules: [],
    requiredInputs: [],
    notes: "No minimum FICO; 6–24 month terms; daily, weekly or monthly payments.",
  },
  {
    id: "national_sub_debt",
    lenderId: "national",
    productFamily: "term_loan",
    displayNameInternal: "National subordinated debt",
    active: true,
    routingPriority: 4,
    objectiveAffinity: ["working_capital"],
    source: SRC.national,
    ruleConfidence: "provisional",
    amountMax: 10_000_000,
    hardRules: [minTib(12), minCredit(600), minAnnualSales(1_000_000)],
    softRules: [],
    requiredInputs: [],
    notes: "2nd lien behind a senior lender; rates from 15%.",
  },
  {
    id: "national_ar_line",
    lenderId: "national",
    productFamily: "ar_line",
    displayNameInternal: "National accounts receivable line",
    active: true,
    routingPriority: 1,
    objectiveAffinity: ["accounts_receivable"],
    source: SRC.national,
    ruleConfidence: "provisional",
    amountMin: 100_000,
    amountMax: 100_000_000,
    hardRules: [
      minTib(12),
      { id: "annual_sales_1m", description: "$1M+ annual sales", test: { fact: "ar_annual_sales", op: "gte", value: 1_000_000 } },
      { id: "ar_100k", description: "$100K+ in receivables", test: { fact: "ar_total", op: "gte", value: 100_000 } },
    ],
    softRules: [
      {
        id: "short_terms",
        description: "Receivables on short terms",
        test: { fact: "ar_terms", op: "in", value: ["net_15", "net_30", "net_45"] },
      },
    ],
    requiredInputs: [],
    notes: "No minimum FICO; up to 95% of current A/R.",
  },
  {
    id: "national_equipment",
    lenderId: "national",
    productFamily: "equipment_financing",
    displayNameInternal: "National equipment financing",
    active: true,
    routingPriority: 3,
    objectiveAffinity: ["equipment"],
    source: SRC.national,
    ruleConfidence: "provisional",
    amountMax: 5_000_000,
    hardRules: [minTib(12), minCredit(550)],
    softRules: [pending("invoice_required", "Equipment invoice required")],
    requiredInputs: [],
    notes: "Up to 100% financing; vendor and private sales.",
  },
  {
    id: "national_inventory_line",
    lenderId: "national",
    productFamily: "inventory_financing",
    displayNameInternal: "National inventory line",
    active: true,
    routingPriority: 1,
    objectiveAffinity: ["working_capital"],
    source: SRC.national,
    ruleConfidence: "provisional",
    amountMin: 100_000,
    amountMax: 10_000_000,
    hardRules: [minTib(12), minAnnualSales(1_000_000)],
    softRules: [pending("inventory_1m", "$1M+ current inventory")],
    requiredInputs: [],
  },

  // ===========================================================================
  // OTHER WORKING CAPITAL, REFINANCE AND RESTRUCTURING
  // ===========================================================================
  {
    id: "vcf_working_capital",
    lenderId: "value_capital",
    productFamily: "term_loan",
    displayNameInternal: "Value Capital Funding monthly-pay working capital",
    active: true,
    routingPriority: 4,
    objectiveAffinity: ["working_capital", "debt_refinance"],
    source: SRC.vcf,
    ruleConfidence: "provisional",
    amountMin: 100_000,
    amountMax: 5_000_000,
    hardRules: [],
    softRules: [pending("credit_review", "Credit review (most declines are credit); send the Experian report first")],
    requiredInputs: [],
    notes: "Monthly payments, 2–10 year terms, no restriction on use of funds.",
    familyOverride: REFI,
  },
  {
    id: "vcf_debt_restructuring",
    lenderId: "value_capital",
    productFamily: "debt_restructuring",
    displayNameInternal: "Value Capital Funding debt restructuring",
    active: true,
    routingPriority: 1,
    objectiveAffinity: ["debt_refinance", "working_capital"],
    source: SRC.vcf,
    ruleConfidence: "provisional",
    hardRules: [
      {
        id: "high_cost_debt",
        description: "Existing high-cost debt to restructure (MCAs or daily/weekly-pay lines)",
        test: is("has_high_cost_debt", true),
      },
    ],
    softRules: [],
    requiredInputs: [],
    notes: "No new loan, no minimum FICO, no upfront fee, no collateral. Attorney-led renegotiation; average 50–75% payment reduction.",
  },
  {
    id: "arf_term_loan",
    lenderId: "arf",
    productFamily: "term_loan",
    displayNameInternal: "ARF Financial term loan",
    active: true,
    routingPriority: 4,
    objectiveAffinity: ["working_capital", "debt_refinance"],
    source: SRC.arf,
    ruleConfidence: "provisional",
    amountMin: 5_000,
    amountMax: 500_000,
    hardRules: [
      minCredit(551),
      minTib(1),
      {
        id: "monthly_sales_17k",
        description: "$17K+ monthly sales",
        test: { fact: "monthly_revenue", op: "gte", value: 17_000 },
      },
      {
        id: "max_2_advances",
        description: "At most 2 outstanding short-term loans (ARF can pay both off)",
        test: { fact: "positions", op: "lte", value: 2 },
      },
    ],
    softRules: [pending("b2b_box", "Business-to-business industries need 601+ credit and 2 years in business")],
    requiredInputs: [],
    notes: "12–36 month terms; up to $750K for multiple entities; licensed California lender.",
    familyOverride: REFI,
  },
  {
    id: "arf_bankroll_line",
    lenderId: "arf",
    productFamily: "line_of_credit",
    displayNameInternal: "ARF Bankroll revolving line",
    active: true,
    routingPriority: 4,
    objectiveAffinity: ["working_capital"],
    source: SRC.arf,
    ruleConfidence: "provisional",
    amountMax: 1_000_000,
    hardRules: [
      minCredit(551),
      minTib(1),
      {
        id: "monthly_sales_17k",
        description: "$17K+ monthly sales",
        test: { fact: "monthly_revenue", op: "gte", value: 17_000 },
      },
    ],
    softRules: [],
    requiredInputs: [],
    notes: "Revolving for up to a year, amortizing up to 36 months.",
  },
  {
    id: "global_mca",
    lenderId: "global_mca",
    productFamily: "revenue_based",
    displayNameInternal: "Global Financial Services merchant cash advance",
    active: true,
    routingPriority: 6,
    objectiveAffinity: ["working_capital"],
    source: SRC.globalMca,
    ruleConfidence: "provisional",
    amountMin: 7_500,
    amountMax: 500_000,
    hardRules: [
      minTib(3),
      { id: "deposits_15k", description: "$15K+ a month deposited (read as monthly revenue)", test: { fact: "monthly_revenue", op: "gte", value: 15_000 } },
      {
        id: "no_advance_defaults",
        description: "No defaults on previous advances",
        test: { all: [is("prior_business_default", false), is("current_default", false)] },
      },
    ],
    softRules: [{ id: "not_california", description: "All states except California", test: { fact: "state", op: "neq", value: "CA" } }],
    requiredInputs: [],
    notes: "Up to 12 months; daily, twice-weekly or weekly. Max 5 negative days, 7 NSF days a month; $750+ average balance.",
  },
  {
    id: "founders_first_rbf",
    lenderId: "founders_first",
    productFamily: "revenue_based",
    displayNameInternal: "Founders First revenue-based financing",
    active: true,
    routingPriority: 5,
    objectiveAffinity: ["working_capital"],
    source: SRC.foundersFirst,
    ruleConfidence: "provisional",
    amountMin: 50_000,
    amountMax: 2_000_000,
    hardRules: [minAnnualSales(1_000_000), minTib(24)],
    softRules: [],
    // Eligibility turns on diverse ownership (or a low-to-moderate income area
    // or inclusive hiring), which the questionnaire doesn't ask.
    requiredInputs: ["ownership_diversity"],
    notes: "Woman, person of color, veteran or LGBTQIA+ owned, or LMI area / inclusive hiring. 3–9% of monthly receipts over 2–5 years.",
  },
  {
    id: "founders_first_term",
    lenderId: "founders_first",
    productFamily: "term_loan",
    displayNameInternal: "Founders First term loan",
    active: true,
    routingPriority: 5,
    objectiveAffinity: ["working_capital", "debt_refinance"],
    source: SRC.foundersFirst,
    ruleConfidence: "provisional",
    amountMin: 50_000,
    amountMax: 2_000_000,
    hardRules: [minAnnualSales(1_000_000), minTib(24)],
    softRules: [],
    requiredInputs: ["ownership_diversity"],
    familyOverride: REFI,
  },
  {
    id: "maxim_real_estate_secured",
    lenderId: "maxim",
    productFamily: "asset_based",
    displayNameInternal: "Maxim real-estate-secured term loan",
    active: true,
    routingPriority: 3,
    objectiveAffinity: ["working_capital", "debt_refinance", "startup"],
    source: SRC.maxim,
    ruleConfidence: "provisional",
    hardRules: [{ id: "owns_real_estate", description: "Equity in owned real estate", test: is("has_real_estate_asset", true) }],
    softRules: [],
    requiredInputs: ["has_real_estate_asset"],
    notes: "No minimum FICO; start-ups OK; up to 70% LTV/LTC; 12–60 month terms.",
  },

  // ===========================================================================
  // SECONDARY EQUIPMENT (spec §6.2 route 3)
  // ===========================================================================
  {
    id: "four_hour_funding",
    lenderId: "four_hour_funding",
    productFamily: "equipment_financing",
    displayNameInternal: "4 Hour Funding",
    active: true,
    routingPriority: 4,
    objectiveAffinity: ["equipment"],
    source: SRC.fourHour,
    ruleConfidence: "provisional",
    amountMin: 5_000,
    amountMax: 250_000,
    hardRules: [minTib(24), minCredit(590)],
    softRules: [pending("state_restrictions", "State restriction list in the broker kit")],
    requiredInputs: [],
    notes: "24–60 month terms; bank statements over $50K; titled vehicle program.",
  },
  {
    id: "bsb_app_only",
    lenderId: "bsb",
    productFamily: "equipment_financing",
    displayNameInternal: "BSB application-only",
    active: true,
    routingPriority: 4,
    objectiveAffinity: ["equipment"],
    source: SRC.bsb,
    ruleConfidence: "provisional",
    amountMax: 350_000,
    hardRules: [minTib(24), minCredit(620)],
    softRules: [pending("comparable_debt_60", "Comparable debt of at least 60% of the request (PayNet)")],
    requiredInputs: [],
    notes: "Up to $1MM with 5+ years and PayNet 680+; up to 20% soft costs.",
  },
  {
    id: "slim_capital",
    lenderId: "slim_capital",
    productFamily: "equipment_financing",
    displayNameInternal: "Slim Capital application-only",
    active: true,
    routingPriority: 4,
    objectiveAffinity: ["equipment"],
    source: SRC.slim,
    ruleConfidence: "provisional",
    amountMax: 300_000,
    hardRules: [minCredit(600), minTib(24)],
    softRules: [
      {
        id: "tier_for_amount",
        description: "Over $150K needs 680+ credit and 5+ years; up to $150K needs 620+ and 2+ years",
        check: (f) => {
          const loan = n(f.request_amount);
          const low = n(f.credit_low);
          const tib = n(f.tib_months_low);
          if (loan == null || low == null || tib == null) return "unknown";
          return loan > 150_000 ? low >= 680 && tib >= 60 : low >= 620;
        },
      },
    ],
    requiredInputs: [],
    notes: "No start-ups. Prior bankruptcy OK. Some programs restrict restaurant, medical and transportation.",
  },
  {
    id: "maxim_equipment",
    lenderId: "maxim",
    productFamily: "equipment_financing",
    displayNameInternal: "Maxim equipment and trucks",
    active: true,
    routingPriority: 4,
    objectiveAffinity: ["equipment", "startup"],
    source: SRC.maxim,
    ruleConfidence: "provisional",
    amountMin: 5_000,
    amountMax: 250_000,
    hardRules: [],
    softRules: [
      {
        id: "down_payment",
        description: "Up to 80% of cost on equipment to $74K; trucks $20K–$250K at up to 65% LTV",
        check: (f) => {
          const cost = n(f.equipment_cost);
          const loan = n(f.request_amount);
          if (cost == null || loan == null || cost <= 0) return "unknown";
          return loan / cost <= (f.equipment_category === "trucks_trailers" ? 0.65 : 0.8);
        },
      },
    ],
    requiredInputs: [],
    notes: "Low FICO and past bankruptcy considered. Start-ups with 35% down.",
  },
  {
    id: "bankers_capital",
    lenderId: "bankers_capital",
    productFamily: "equipment_financing",
    displayNameInternal: "Bankers Capital",
    active: true,
    routingPriority: 4,
    objectiveAffinity: ["equipment", "startup"],
    source: SRC.bankers,
    ruleConfidence: "provisional",
    hardRules: [],
    softRules: [pending("full_financials", "Full financial package (tax returns, interim statements, PFS) rather than application-only")],
    requiredInputs: [],
    notes: "All industries and equipment; start-ups, challenged credit and bankruptcies considered. 12–60 month terms.",
  },

  // ===========================================================================
  // RECEIVABLES AND PURCHASE ORDERS (spec §6.6)
  // ===========================================================================
  {
    id: "alleon_medical",
    lenderId: "alleon",
    productFamily: "medical_receivables",
    displayNameInternal: "Alleon medical factoring / line",
    active: true,
    routingPriority: 1,
    objectiveAffinity: ["accounts_receivable"],
    source: SRC.alleon,
    ruleConfidence: "provisional",
    hardRules: [
      {
        id: "medical_receivables",
        description: "Healthcare provider billing insurance, Medicare or Medicaid",
        // A known non-healthcare industry rules it out even before the
        // receivables questions are answered ("not sure" path).
        check: (f) =>
          f.industry === HEALTHCARE || f.ar_debtor_type === "insurance"
            ? true
            : typeof f.industry === "string" && f.industry !== "Other"
              ? false
              : "unknown",
      },
    ],
    softRules: [],
    requiredInputs: [],
    notes: "Up to 85% advance on eligible A/R; term loans up to one month of average deposits.",
  },
  {
    id: "orange_commercial_factoring",
    lenderId: "orange_commercial",
    productFamily: "invoice_factoring",
    displayNameInternal: "Orange Commercial Credit factoring",
    active: true,
    routingPriority: 1,
    objectiveAffinity: ["accounts_receivable"],
    source: SRC.orange,
    ruleConfidence: "provisional",
    hardRules: [
      { id: "b2b_debtors", description: "Business or government debtors (approval rests on the debtor's credit)", test: is("ar_b2b", true) },
    ],
    softRules: [],
    requiredInputs: [],
    notes: "Weak company credit OK with a strong debtor base. No minimum monthly volume; lines up to $5–10M a month; 48 states.",
  },
  {
    id: "us_financial_factoring",
    lenderId: "us_financial",
    productFamily: "invoice_factoring",
    displayNameInternal: "U.S. Financial factoring",
    active: true,
    routingPriority: 1,
    objectiveAffinity: ["accounts_receivable"],
    source: SRC.usFinancial,
    ruleConfidence: "provisional",
    hardRules: [{ id: "b2b_debtors", description: "Business or government debtors", test: is("ar_b2b", true) }],
    softRules: [],
    requiredInputs: [],
    notes: "70–90% next-day advance; low credit scores OK; non-recourse program.",
  },
  {
    id: "hedaya_factoring",
    lenderId: "hedaya",
    productFamily: "invoice_factoring",
    displayNameInternal: "Hedaya Capital factoring",
    active: true,
    routingPriority: 2,
    objectiveAffinity: ["accounts_receivable"],
    source: SRC.hedaya,
    ruleConfidence: "provisional",
    amountMax: 5_000_000,
    hardRules: [{ id: "b2b_debtors", description: "Business debtors", test: is("ar_b2b", true) }],
    softRules: [
      {
        id: "consumer_products_fit",
        description: "Best fit: consumer products, apparel and distribution",
        test: { fact: "industry", op: "in", value: ["Retail", "Wholesale & Distribution", "Manufacturing"] },
      },
    ],
    requiredInputs: [],
  },
  {
    id: "hedaya_po",
    lenderId: "hedaya",
    productFamily: "po_financing",
    displayNameInternal: "Hedaya purchase-order and letter-of-credit financing",
    active: true,
    routingPriority: 1,
    objectiveAffinity: ["accounts_receivable"],
    source: SRC.hedaya,
    ruleConfidence: "provisional",
    amountMax: 5_000_000,
    hardRules: [],
    softRules: [],
    requiredInputs: [],
  },

  // ===========================================================================
  // NICHE: staff-facing only
  // ===========================================================================
  ...(["global_church", "griffin"] as const).map(
    (lenderId): Program => ({
      id: `${lenderId}_church`,
      lenderId,
      productFamily: "owner_user_cre",
      displayNameInternal: `${lenderId === "griffin" ? "Griffin" : "Global Church"} church financing`,
      active: true,
      routingPriority: 3,
      objectiveAffinity: ["commercial_real_estate"],
      source: SRC.church,
      ruleConfidence: "manual_only",
      hardRules: [{ id: "special_use", description: "Special-use property (church)", test: is("cre_property_type", "special_use") }],
      softRules: [],
      requiredInputs: [],
      customerVisible: false,
      notes: lenderId === "griffin" ? "Also private money for churches in trouble, foreclosure or bankruptcy." : "Specializes in small churches.",
    }),
  ),
  {
    id: "ab_nicholas_securities",
    lenderId: "ab_nicholas",
    productFamily: "securities_based",
    displayNameInternal: "A.B. Nicholas securities-based line",
    active: true,
    routingPriority: 3,
    objectiveAffinity: [],
    source: SRC.abNicholas,
    ruleConfidence: "manual_only",
    hardRules: [],
    softRules: [],
    requiredInputs: [],
    customerVisible: false,
    notes: "Credit lines against a securities portfolio (capped around 50% LTV). Not asked about; raise on review.",
  },
];
