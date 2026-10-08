import type { Objective, ObjectiveId } from "./types";

/**
 * The nine Stage 1 objectives (spec §2), in display order.
 *
 * Labels and descriptions are Robert's, verbatim: the spec asks for them to be
 * used consistently across the homepage funnel, Resources CTAs, analytics and
 * backend event names, so this is the one place they are defined.
 *
 * SOLUTION TYPES ARE NOT OBJECTIVES. SBA, MCA, DSCR, factoring, term loans,
 * revenue-based financing, unsecured lending and lender names never appear as
 * a card here (spec §2, "Do not use on Stage 1"). The engine decides which of
 * those fit; the customer only says what they are trying to do.
 */
export const OBJECTIVES: Objective[] = [
  {
    id: "working_capital",
    label: "Access Working Capital",
    description:
      "Cover operations, payroll, inventory, expansion or short-term business needs.",
  },
  {
    id: "equipment",
    label: "Finance Equipment",
    description:
      "Purchase or finance vehicles, machinery, technology or other business equipment.",
  },
  {
    id: "commercial_real_estate",
    label: "Buy or Refinance Commercial Real Estate",
    description: "Purchase, refinance or access equity in commercial property.",
  },
  {
    id: "investment_real_estate",
    label: "Fund a Fix & Flip or Investment Property",
    description:
      "Finance an investment property purchase, renovation, rental or construction project.",
  },
  {
    id: "business_acquisition",
    label: "Acquire a Business",
    description: "Finance an acquisition, franchise purchase or partner buyout.",
  },
  {
    id: "accounts_receivable",
    label: "Get Paid Faster",
    description: "Access capital tied up in invoices or accounts receivable.",
  },
  {
    id: "debt_refinance",
    label: "Consolidate or Refinance Business Debt",
    description: "Replace or restructure existing business financing.",
  },
  {
    id: "startup",
    label: "Fund a Startup or New Business",
    description: "Explore financing for a new or recently established company.",
  },
  {
    id: "unsure",
    label: "I'm Not Sure - Help Me Find an Option",
    description:
      "Tell us about your situation and FLS will identify potential financing options.",
  },
];

const BY_ID = new Map(OBJECTIVES.map((objective) => [objective.id, objective]));

export function findObjective(id: string | null | undefined): Objective | null {
  if (!id) return null;
  return BY_ID.get(id as ObjectiveId) ?? null;
}

/**
 * Which objective each Resources guide deep-links into (spec §14).
 *
 * The eleven guides stay as content; this is what their "See Your Financing Options"
 * preselects. Several guides share an objective because the guides are organised
 * by solution and the funnel by goal (both flip and ground-up construction are
 * "investment real estate"; the SBA guide's readers are most often buying or
 * expanding a business, which is where SBA is evaluated).
 */
export const GUIDE_OBJECTIVE: Record<string, ObjectiveId> = {
  "equipment-financing": "equipment",
  "sba-financing": "business_acquisition",
  "commercial-real-estate-financing": "commercial_real_estate",
  "fix-and-flip-financing": "investment_real_estate",
  "ground-up-construction-financing": "investment_real_estate",
  "working-capital-financing": "working_capital",
  "business-term-loans-and-lines-of-credit": "working_capital",
  "invoice-factoring-and-ar-financing": "accounts_receivable",
  "business-acquisition-financing": "business_acquisition",
  "startup-financing": "startup",
  "business-debt-refinance-and-mca-restructuring": "debt_refinance",
};

/**
 * A guide's preselected answer within its objective's branch, where the guide
 * is narrower than the objective (the construction guide should arrive with
 * "ground-up" already chosen rather than make the reader pick it again).
 */
export const GUIDE_PREFILL: Record<string, Record<string, string>> = {
  "fix-and-flip-financing": { re_subobjective: "fix_and_flip" },
  "ground-up-construction-financing": { re_subobjective: "ground_up" },
};

/**
 * What a `?goal=` in a link means. Accepts an objective id ("equipment") or,
 * for links written before the nine objectives existed and for the guides'
 * own CTAs, a guide slug ("fix-and-flip-financing"), which resolves to its
 * objective plus any answer the guide already implies.
 */
export function resolveGoal(
  param: string | null | undefined,
): { objective: Objective; prefill: Record<string, string> } | null {
  if (!param) return null;
  const direct = findObjective(param);
  if (direct) return { objective: direct, prefill: {} };
  const viaGuide = GUIDE_OBJECTIVE[param];
  if (!viaGuide) return null;
  return { objective: findObjective(viaGuide) as Objective, prefill: GUIDE_PREFILL[param] ?? {} };
}

/** The prequal URL for an objective, carrying any prefilled answers. */
export function prequalHref(objective: ObjectiveId, prefill: Record<string, string> = {}): string {
  const query = new URLSearchParams({ goal: objective, ...prefill });
  return `/start/prequal?${query.toString()}`;
}
