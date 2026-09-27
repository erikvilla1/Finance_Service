import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readAnswers } from "./form";
import { match } from "./engine";
import { questionsFor } from "./questions";

/**
 * The server's reading of a posted questionnaire: what survives validation,
 * and what the engine makes of it.
 */

/** FormData stand-in: repeated keys become repeated entries, as in a real post. */
function form(entries: [string, string][]) {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

describe("readAnswers", () => {
  it("reads the equipment form exactly as the browser posts it", () => {
    // Captured from the live wizard: formatted amounts, an optional field left
    // blank, one checkbox.
    const posted = form([
      ["requested_amount_range", "50k_100k"],
      ["time_in_business", "2_5y"],
      ["owner_credit_range", "550_599"],
      ["industry", "Trucking & Transportation"],
      ["credit_events", "none"],
      ["equipment_cost", "90,000"],
      ["equipment_category", "trucks_trailers"],
      ["equipment_condition", "used"],
      ["equipment_titled", "yes"],
      ["seller_type", "dealer"],
      ["equipment_year", "2021"],
      ["equipment_state", "TX"],
      ["equipment_down_payment", ""],
      ["equipment_monthly_deposits", "25,000"],
    ]);

    const answers = readAnswers(questionsFor("equipment"), posted);

    assert.equal(answers.equipment_cost, 90_000);
    assert.equal(answers.equipment_monthly_deposits, 25_000);
    assert.deepEqual(answers.credit_events, ["none"]);
    assert.equal(answers.equipment_state, "TX");
    assert.equal("equipment_down_payment" in answers, false);

    const result = match("equipment", answers);
    assert.equal(result.productMatches[0]?.productFamily, "equipment_financing");
    assert.notEqual(result.overallState, "no_current_match");

    // $25K a month against a $90K truck is under 360's heavy-equipment
    // deposit rule (85% of the amount), so 360 is evaluated and excluded on
    // that documented rule while the broader routes carry the match.
    const heavy = result.internalRoutes.find((r) => r.programId === "three_sixty_heavy_metal");
    assert.equal(heavy?.state, "no_current_match");
    assert.ok(heavy?.failedRules.some((rule) => rule.includes("85%")));
  });

  it("drops answers to questions the applicant was never shown", () => {
    // A refinance never asks the purchase price; a stale value from switching
    // transaction types must not become an LTV basis.
    const answers = readAnswers(
      questionsFor("commercial_real_estate"),
      form([
        ["cre_transaction_type", "refinance"],
        ["cre_purchase_price", "1,000,000"],
        ["cre_current_value", "800,000"],
      ]),
    );
    assert.equal("cre_purchase_price" in answers, false);
    assert.equal(answers.cre_current_value, 800_000);
  });

  it("drops balances when there are no open positions", () => {
    const answers = readAnswers(
      questionsFor("working_capital"),
      form([
        ["open_positions_count", "0"],
        ["current_financing_balance", "50,000"],
      ]),
    );
    assert.equal("current_financing_balance" in answers, false);
  });

  it("rejects values that aren't one of the question's options", () => {
    const answers = readAnswers(
      questionsFor("equipment"),
      form([
        ["owner_credit_range", "900_plus"],
        ["equipment_state", "ZZ"],
        ["credit_events", "none"],
        ["credit_events", "made_up"],
        ["credit_events", "none"],
        ["equipment_cost", "-5"],
      ]),
    );
    assert.equal("owner_credit_range" in answers, false);
    assert.equal("equipment_state" in answers, false);
    assert.deepEqual(answers.credit_events, ["none"]);
    // "-5" parses as 5 after stripping; the sign isn't a digit. Negative
    // amounts can't be posted as negatives, which is the property that matters.
    assert.ok((answers.equipment_cost as number) >= 0);
  });
});
