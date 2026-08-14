/**
 * Banded money ranges for the tier-one wizard.
 *
 * WHY RANGES AT ALL. Spec §8 STEP 6 already says to use ranges during early
 * qualification, and credit, revenue, and time in business follow that rule.
 * The two money questions did not, because the engine compares them against
 * each product's amount_min / amount_max and needs a number to do it.
 *
 * WHY A MIDPOINT. A range is not a number, so something has to be stored. The
 * midpoint is the least wrong single value: it is never further than half a
 * band from the truth, where the floor is wrong by up to a full band and always
 * in the direction that shows the applicant fewer products than they qualify
 * for.
 *
 * WHAT THIS COSTS. A $30,000 request and a $48,000 request both arrive as
 * $37,500. Near a band edge that can match a product the applicant is slightly
 * too small for, or miss one they are slightly too large for. Tier one is
 * indicative by construction — the result page says so, and a specialist
 * reviews every submission — so a half-band error here is recoverable in a way
 * that a wrong figure on the funding application would not be.
 *
 * If that stops being acceptable, the fix is to store both bounds and match on
 * overlap rather than on a point. That is a schema change plus an engine
 * change, which is why it is not what this does.
 */

export interface AmountRange {
  /** Inclusive lower bound, in dollars. */
  min: number;
  /** Exclusive upper bound. null means open-ended. */
  max: number | null;
  label: string;
}

/**
 * What the applicant is asking for, and other one-off sums.
 *
 * Mirrors the bands used across small-business lending intake, which is also
 * what applicants who have shopped around will have seen elsewhere.
 */
export const FINANCING_AMOUNT_RANGES: AmountRange[] = [
  { min: 1, max: 5_000, label: "$1 – $5,000" },
  { min: 5_000, max: 25_000, label: "$5,000 – $25,000" },
  { min: 25_000, max: 50_000, label: "$25,000 – $50,000" },
  { min: 50_000, max: 100_000, label: "$50,000 – $100,000" },
  { min: 100_000, max: 250_000, label: "$100,000 – $250,000" },
  { min: 250_000, max: 500_000, label: "$250,000 – $500,000" },
  { min: 500_000, max: 1_000_000, label: "$500,000 – $1 million" },
  { min: 1_000_000, max: null, label: "Over $1 million" },
];

/**
 * Recurring monthly sums.
 *
 * A separate scale because monthly revenue sits roughly an order of magnitude
 * below a financing request. Offering the financing bands here would put most
 * applicants in the first option, which tells the engine nothing.
 */
export const MONTHLY_AMOUNT_RANGES: AmountRange[] = [
  { min: 1, max: 10_000, label: "Under $10,000" },
  { min: 10_000, max: 25_000, label: "$10,000 – $25,000" },
  { min: 25_000, max: 50_000, label: "$25,000 – $50,000" },
  { min: 50_000, max: 100_000, label: "$50,000 – $100,000" },
  { min: 100_000, max: 250_000, label: "$100,000 – $250,000" },
  { min: 250_000, max: null, label: "Over $250,000" },
];

/**
 * Which scale each money question uses.
 *
 * Keyed rather than derived because nothing in the question row distinguishes
 * a monthly figure from a one-off one — both are question_type 'currency'.
 *
 * A currency question that is NOT listed here keeps its typed input. That is
 * the safe default: a new money question added in the database renders as it
 * always did rather than silently picking up a scale nobody chose for it.
 */
const RANGE_SCALE_BY_KEY: Record<string, AmountRange[]> = {
  prequal_requested_amount: FINANCING_AMOUNT_RANGES,
  prequal_avg_monthly_revenue: MONTHLY_AMOUNT_RANGES,
};

export function rangesForQuestionKey(key: string): AmountRange[] | null {
  return RANGE_SCALE_BY_KEY[key] ?? null;
}

/**
 * The value stored for a range.
 *
 * Open-ended top bands have no midpoint to take, so they post their floor.
 * "Over $1 million" arriving as exactly 1,000,000 understates every applicant
 * in that band, which is the right direction to be wrong: it can only match
 * products with a lower ceiling, never invent headroom the applicant may not
 * have.
 */
export function rangeMidpoint(range: AmountRange): number {
  if (range.max === null) return range.min;
  return Math.round((range.min + range.max) / 2);
}

/** Range list as <option> data. Value is what the server action will parse. */
export function rangeOptions(
  ranges: AmountRange[],
): { value: string; label: string }[] {
  return ranges.map((range) => ({
    value: String(rangeMidpoint(range)),
    label: range.label,
  }));
}
