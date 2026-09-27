import type { Comparison, Condition, FactValue, Facts, Tri } from "./types";

/**
 * Three-valued condition evaluation: true, false, or "unknown".
 *
 * Unknown is a first-class answer, not a failure. A rule that needs a fact the
 * applicant didn't give (or gave as a band that straddles the threshold) cannot
 * honestly pass or fail, so the engine treats it as "needs review" rather than
 * guessing in either direction (spec §8: never imply approval, never imply
 * decline).
 *
 * RANGE FACTS. Banded answers are stored as `<name>_low` and `<name>_high`
 * (see facts.ts). A comparison against `<name>` when no plain `<name>` fact
 * exists is evaluated against the range: "credit ≥ 660" is true for 680–699
 * (the whole band clears it), false for 620–649 (none of it does), and unknown
 * for 650–679 (the band straddles the line). Equality-style operators never
 * apply to ranges.
 */

function isMissing(value: FactValue | undefined): boolean {
  return value === undefined || value === null || (Array.isArray(value) && value.length === 0);
}

function compareRange(facts: Facts, c: Comparison): Tri | null {
  const low = facts[`${c.fact}_low`];
  const high = facts[`${c.fact}_high`];
  if (low === undefined && high === undefined) return null; // not a range fact
  if (typeof low !== "number" || typeof high !== "number" || typeof c.value !== "number") {
    return "unknown";
  }
  const v = c.value;
  switch (c.op) {
    case "gte":
      return low >= v ? true : high < v ? false : "unknown";
    case "gt":
      return low > v ? true : high <= v ? false : "unknown";
    case "lte":
      return high <= v ? true : low > v ? false : "unknown";
    case "lt":
      return high < v ? true : low >= v ? false : "unknown";
    case "exists":
      return true;
    default:
      return "unknown";
  }
}

function compare(facts: Facts, c: Comparison): Tri {
  const value = facts[c.fact];

  if (value === undefined) {
    const ranged = compareRange(facts, c);
    if (ranged !== null) return ranged;
  }

  if (c.op === "exists") return !isMissing(value);
  if (isMissing(value)) return "unknown";

  switch (c.op) {
    case "eq":
      return value === c.value;
    case "neq":
      return value !== c.value;
    case "in":
      return Array.isArray(c.value) ? (c.value as FactValue[]).includes(value as never) : false;
    case "not_in":
      return Array.isArray(c.value) ? !(c.value as FactValue[]).includes(value as never) : true;
    case "includes":
      return Array.isArray(value) ? value.includes(c.value as string) : value === c.value;
    case "excludes":
      return Array.isArray(value) ? !value.includes(c.value as string) : value !== c.value;
    case "gte":
    case "gt":
    case "lte":
    case "lt": {
      if (typeof value !== "number" || typeof c.value !== "number") return "unknown";
      if (c.op === "gte") return value >= c.value;
      if (c.op === "gt") return value > c.value;
      if (c.op === "lte") return value <= c.value;
      return value < c.value;
    }
    default:
      return "unknown";
  }
}

/** Kleene logic: false dominates AND, true dominates OR, unknown otherwise. */
export function evaluate(condition: Condition, facts: Facts): Tri {
  if ("all" in condition) {
    let unknown = false;
    for (const part of condition.all) {
      const result = evaluate(part, facts);
      if (result === false) return false;
      if (result === "unknown") unknown = true;
    }
    return unknown ? "unknown" : true;
  }
  if ("any" in condition) {
    let unknown = false;
    for (const part of condition.any) {
      const result = evaluate(part, facts);
      if (result === true) return true;
      if (result === "unknown") unknown = true;
    }
    return unknown ? "unknown" : false;
  }
  if ("not" in condition) {
    const result = evaluate(condition.not, facts);
    return result === "unknown" ? "unknown" : !result;
  }
  return compare(facts, condition);
}

/** For the UI: should a field with this showIf be asked, given answers so far? */
export function isShown(showIf: Condition | undefined, facts: Facts): boolean {
  if (!showIf) return true;
  // Unknown means the question it depends on hasn't been answered yet; hide
  // until it has, so a dependent question never appears before its parent.
  return evaluate(showIf, facts) === true;
}
