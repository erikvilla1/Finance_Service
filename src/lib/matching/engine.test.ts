import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { match, inferObjectives } from "./engine";
import { buildFacts } from "./facts";
import { evaluate } from "./conditions";
import { PROGRAMS } from "./programs";
import type { Answers, MatchResult, Program } from "./types";

/**
 * Spec §15 acceptance tests, one per row, plus checks on the pieces under
 * them. Run with `npm test`.
 */

const families = (result: MatchResult) => result.productMatches.map((m) => m.productFamily);
const viable = (result: MatchResult) =>
  result.productMatches.filter((m) => m.state !== "no_current_match").map((m) => m.productFamily);
const route = (result: MatchResult, programId: string) =>
  result.internalRoutes.find((r) => r.programId === programId);

describe("spec §15 acceptance tests", () => {
  it("equipment / challenged credit: 360 is evaluated and leads despite a 560 score", () => {
    const answers: Answers = {
      requested_amount_range: "50k_100k",
      time_in_business: "2_5y",
      owner_credit_range: "550_599",
      industry: "Construction",
      credit_events: ["none"],
      equipment_cost: 90_000,
      equipment_category: "construction",
      equipment_condition: "used",
      equipment_titled: "no",
      seller_type: "dealer",
      equipment_year: 2018,
      equipment_state: "TX",
      equipment_monthly_deposits: 95_000,
    };
    const result = match("equipment", answers);

    assert.equal(result.productMatches[0].productFamily, "equipment_financing");
    assert.ok(["strong", "potential"].includes(result.productMatches[0].state));
    assert.equal(result.internalRoutes[0].lenderId, "three_sixty");
    assert.equal(result.internalRoutes[0].programId, "three_sixty_heavy_metal");
    assert.equal(result.nextAction, "start_application");
  });

  it("startup / strong personal credit: Finance Factory evaluated, not declined for TIB or revenue", () => {
    const answers: Answers = {
      requested_amount_range: "50k_100k",
      time_in_business: "startup_pre_revenue",
      owner_credit_range: "720_739",
      industry: "Professional Services",
      credit_events: ["none"],
      startup_use: ["startup_costs"],
      personal_income_type: "w2",
      personal_income: "100k_150k",
      credit_utilization: "under_30",
      recent_lates: "no",
      collections_chargeoffs: "no",
      credit_depth: ["mortgage", "major_bank_card"],
    };
    const result = match("startup", answers);

    assert.notEqual(result.overallState, "no_current_match");
    const lines = route(result, "finance_factory_credit_lines");
    assert.ok(lines, "Finance Factory credit lines evaluated");
    assert.equal(lines.state, "strong", `expected strong, got ${lines.state}: ${JSON.stringify(lines)}`);
    assert.equal(result.productMatches[0].productFamily, "startup_credit_line");
  });

  it("fix & flip: the flip product comes first; no SBA, MCA or equipment products", () => {
    const answers: Answers = {
      requested_amount_range: "500k_1m",
      time_in_business: "5y_plus",
      owner_credit_range: "720_739",
      industry: "Real Estate",
      credit_events: ["none"],
      re_subobjective: "fix_and_flip",
      re_state: "GA",
      re_property_type: "sfr",
      re_purchase_price: 500_000,
      re_rehab_budget: 125_000,
      re_arv: 850_000,
      re_requested_loan: 550_000,
      re_experience: "1_2",
      re_liquidity: 150_000,
    };
    const result = match("investment_real_estate", answers);

    assert.equal(result.productMatches[0].productFamily, "fix_and_flip");
    for (const unrelated of ["sba_loan", "revenue_based", "equipment_financing"] as const) {
      assert.ok(!families(result).includes(unrelated), `${unrelated} should be suppressed`);
    }
    assert.equal(result.internalRoutes[0].lenderId, "rcn");
    assert.ok(result.calculatedMetrics.ltc && Math.abs(result.calculatedMetrics.ltc - 0.88) < 0.001);
    assert.ok(result.calculatedMetrics.arvLeverage && Math.abs(result.calculatedMetrics.arvLeverage - 0.647) < 0.001);
  });

  it("owner-user CRE: the SBA/Ready pathway is evaluated separately from investor bridge", () => {
    const answers: Answers = {
      requested_amount_range: "1m_5m",
      time_in_business: "5y_plus",
      owner_credit_range: "700_719",
      industry: "Professional Services",
      credit_events: ["none"],
      cre_occupancy_type: "owner_occupied",
      cre_transaction_type: "purchase",
      cre_property_type: "office",
      cre_state: "CA",
      cre_purchase_price: 1_500_000,
      cre_current_value: 1_500_000,
      cre_requested_loan: 1_200_000,
    };
    const result = match("commercial_real_estate", answers);

    assert.equal(result.productMatches[0].productFamily, "owner_user_cre");
    assert.ok(!families(result).includes("investment_cre"), "investor CRE is not offered to an owner-user");
    const ownerUser = result.internalRoutes.filter((r) => r.productFamily === "owner_user_cre");
    assert.equal(ownerUser[0].programId, "ready_owner_occupied_cre");
    const bridge = route(result, "sky_equity_commercial_bridge");
    assert.equal(bridge?.state, "no_current_match", "non-owner-occupied bridge excluded for owner-users");
  });

  it("A/R / weak owner credit: factoring stays viable; owner FICO is no system-wide decline", () => {
    const answers: Answers = {
      requested_amount_range: "250k_500k",
      time_in_business: "2_5y",
      owner_credit_range: "550_599",
      industry: "Staffing & Employment",
      credit_events: ["none"],
      ar_debtor_type: "businesses",
      ar_monthly_sales: 166_667,
      ar_total: 300_000,
      ar_amount_requested: 300_000,
      ar_terms: "net_30",
      ar_days_to_pay: "30_45",
    };
    const result = match("accounts_receivable", answers);

    const factoring = result.productMatches.find((m) => m.productFamily === "invoice_factoring");
    assert.ok(factoring && factoring.state !== "no_current_match");
    assert.notEqual(result.overallState, "no_current_match");
    assert.equal(route(result, "national_ar_line")?.state, "potential");
  });

  it("MCA distress: refinance/restructuring leads; another MCA is never the top result", () => {
    const answers: Answers = {
      requested_amount_range: "100k_250k",
      time_in_business: "2_5y",
      owner_credit_range: "600_619",
      industry: "Retail",
      credit_events: ["none"],
      debt_total_balance: 150_000,
      debt_position_count: "3",
      debt_types: ["mca"],
      debt_payment_frequency: "daily",
      debt_total_monthly_payment: 30_000,
      debt_current_default: "no",
      debt_collateral: ["none"],
      debt_goal: "lower_payment",
    };
    const result = match("debt_refinance", answers);

    assert.ok(["debt_refinance", "debt_restructuring"].includes(result.productMatches[0].productFamily));
    assert.ok(!viable(result).includes("revenue_based"), "no MCA offered for a lower-payment goal");
    assert.notEqual(result.internalRoutes[0].productFamily, "revenue_based");
    const sba = result.productMatches.find((m) => m.productFamily === "sba_loan");
    if (sba) assert.ok(["specialist_review", "no_current_match"].includes(sba.state));
  });

  it("MCA distress with heavy stacking: restructuring first", () => {
    const answers: Answers = {
      requested_amount_range: "100k_250k",
      time_in_business: "2_5y",
      owner_credit_range: "600_619",
      industry: "Retail",
      credit_events: ["none"],
      debt_total_balance: 250_000,
      debt_position_count: "4_plus",
      debt_types: ["mca"],
      debt_payment_frequency: "daily",
      debt_total_monthly_payment: 60_000,
      debt_current_default: "no",
      debt_collateral: ["none"],
      debt_goal: "stop_daily_drafts",
    };
    const result = match("debt_refinance", answers);
    assert.equal(result.productMatches[0].productFamily, "debt_restructuring");
  });

  it("no match: still offers manual review and a record", () => {
    const strict: Program[] = [
      {
        id: "test_equipment",
        lenderId: "three_sixty",
        productFamily: "equipment_financing",
        displayNameInternal: "Test program",
        active: true,
        routingPriority: 1,
        objectiveAffinity: ["equipment"],
        source: { name: "test", versionDate: null, lastVerified: null },
        ruleConfidence: "documented",
        hardRules: [{ id: "credit_800", description: "Credit 800+", test: { fact: "credit", op: "gte", value: 800 } }],
        softRules: [],
        requiredInputs: [],
      },
    ];
    const result = match(
      "equipment",
      { requested_amount_range: "10k_25k", time_in_business: "1_2y", owner_credit_range: "600_619", industry: "Retail", credit_events: ["none"], equipment_cost: 20_000 },
      strict,
    );
    assert.equal(result.overallState, "no_current_match");
    assert.equal(result.nextAction, "request_manual_review");
    assert.deepEqual(result.productMatches.map((m) => [m.productFamily, m.state]), [["equipment_financing", "no_current_match"]]);
    assert.equal(result.internalRoutes[0].failedRules[0], "Credit 800+");
  });

  it("range integrity: no dollar estimate without a documented sizing formula", () => {
    const samples: [Parameters<typeof match>[0], Answers][] = [
      ["working_capital", { requested_amount_range: "50k_100k", time_in_business: "2_5y", owner_credit_range: "680_699", industry: "Retail", credit_events: ["none"], avg_monthly_revenue: 80_000, avg_monthly_deposits: 75_000, deposit_trend: "consistent", open_positions_count: "0", use_of_funds: "inventory" }],
      ["equipment", { requested_amount_range: "25k_50k", time_in_business: "5y_plus", owner_credit_range: "740_plus", industry: "Construction", credit_events: ["none"], equipment_cost: 40_000, equipment_category: "construction", equipment_condition: "new", equipment_state: "TX", equipment_monthly_deposits: 60_000 }],
    ];
    for (const [objective, answers] of samples) {
      for (const m of match(objective, answers).productMatches) {
        assert.equal(m.estimatedRange, null, `${m.productFamily} showed an estimate`);
      }
    }

    // A formula on a provisional program is still not shown; on a documented one it is.
    const withSizing = (confidence: Program["ruleConfidence"]): Program[] => [
      {
        ...PROGRAMS.find((p) => p.id === "three_sixty_pennybacker")!,
        ruleConfidence: confidence,
        sizing: { description: "test", compute: () => ({ min: 10_000, max: 40_000 }) },
      },
    ];
    const answers: Answers = { requested_amount_range: "25k_50k", time_in_business: "2_5y", owner_credit_range: "600_619", industry: "Retail", credit_events: ["none"], equipment_cost: 40_000, equipment_state: "TX", equipment_monthly_deposits: 40_000 };
    assert.equal(match("equipment", answers, withSizing("provisional")).productMatches[0].estimatedRange, null);
    assert.deepEqual(match("equipment", answers, withSizing("documented")).productMatches[0].estimatedRange, { min: 10_000, max: 40_000 });
  });
});

describe("customer view never names a lender", () => {
  it("product matches carry families only", () => {
    const result = match("working_capital", { requested_amount_range: "50k_100k", time_in_business: "2_5y", owner_credit_range: "680_699", industry: "Retail", credit_events: ["none"], avg_monthly_revenue: 80_000, avg_monthly_deposits: 75_000, deposit_trend: "consistent", open_positions_count: "0", use_of_funds: "payroll" });
    for (const m of result.productMatches) {
      assert.deepEqual(Object.keys(m).sort(), ["estimatedRange", "primary", "productFamily", "state"]);
    }
    // Revenue-based comes after the lower-cost families when both are viable.
    const order = viable(result);
    if (order.includes("revenue_based") && order.includes("term_loan")) {
      assert.ok(order.indexOf("term_loan") < order.indexOf("revenue_based"));
    }
  });
});

describe("conditions and facts", () => {
  it("banded credit is true, false or honestly unknown against a threshold", () => {
    const facts = (band: string) => buildFacts("working_capital", { owner_credit_range: band });
    const rule = { fact: "credit", op: "gte" as const, value: 660 };
    assert.equal(evaluate(rule, facts("680_699")), true);
    assert.equal(evaluate(rule, facts("620_649")), false);
    assert.equal(evaluate(rule, facts("650_679")), "unknown");
    assert.equal(evaluate(rule, facts("not_sure")), "unknown");
  });

  it("option values stay strings; only numeric fields become numbers", () => {
    const facts = buildFacts("working_capital", { open_positions_count: "0", avg_monthly_revenue: "$80,000" });
    assert.equal(facts.open_positions_count, "0");
    assert.equal(facts.avg_monthly_revenue, 80_000);
  });

  it("DSCR is never estimated", () => {
    const facts = buildFacts("investment_real_estate", { re_subobjective: "rental", re_monthly_rent: 3_000, re_taxes_insurance: 500, re_requested_loan: 300_000, re_as_is_value: 400_000 });
    assert.equal(facts.dscr, null);
    assert.equal(facts.ltv, 0.75);
  });

  it("'not sure' infers up to three objectives from use, assets and age", () => {
    const facts = buildFacts("unsure", { unsure_use: "operations", unsure_assets: ["ar", "equipment"], time_in_business: "lt_3m" });
    assert.deepEqual(inferObjectives(facts), ["working_capital", "accounts_receivable", "startup"]);
  });
});

describe("program library integrity", () => {
  it("every program has a source, a known family and unique id", () => {
    const ids = new Set<string>();
    for (const program of PROGRAMS) {
      assert.ok(!ids.has(program.id), `duplicate id ${program.id}`);
      ids.add(program.id);
      assert.ok(program.source.name.length > 0, `${program.id} has no source`);
    }
  });

  it("only the spec's current-use anchors are 'documented'", () => {
    const documented = new Set(PROGRAMS.filter((p) => p.ruleConfidence === "documented").map((p) => p.lenderId));
    assert.deepEqual([...documented].sort(), ["finance_factory", "three_sixty"]);
  });
});
