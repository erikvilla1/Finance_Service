import type { MatchState } from "./types";

/**
 * Customer-facing result language (spec §8, §9, §18). One place, so the result
 * page, emails and the admin view all say the same thing, and so compliance
 * review (spec §20, "Final public disclaimers") has one file to read.
 */

export const MATCH_STATE_LABEL: Record<MatchState, string> = {
  strong: "Strong Match",
  potential: "Potential Match",
  specialist_review: "Specialist Review",
  no_current_match: "May not fit",
};

/** Staff-facing: the spec's own names, including "No Current Match". */
export const MATCH_STATE_STAFF_LABEL: Record<MatchState, string> = {
  strong: "Strong Match",
  potential: "Potential Match",
  specialist_review: "Specialist Review",
  no_current_match: "No Current Match",
};

/** Spec §18, "Recommended top-of-results copy". */
export const RESULTS_DISCLAIMER =
  "Based on the information provided, these financing options may fit your profile. This is a preliminary matching tool, not a credit decision or commitment to fund. A financing specialist and the applicable funding source will review the complete file before terms are offered.";

/** Spec §18, "No Current Match copy". */
export const NO_CURRENT_MATCH_COPY =
  "Your profile does not currently match the preliminary criteria in our automated program library. Financing guidelines vary and change frequently, so you may still request a manual review.";

/** The line under every product card (spec §9, customer result card example). */
export const FINAL_STRUCTURE_NOTE =
  "Final structure depends on your business, the collateral, cash flow and lender underwriting.";
