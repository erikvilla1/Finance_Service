import type { ApplicationStatus } from "@/types/database";

/**
 * What the applicant is allowed to see.
 *
 * Platform spec §18: "Never expose internal CRM data to customers." The
 * pipeline has sixteen stages carrying information that is ours, not theirs —
 * which funder a file went to, whether one declined, whether anyone has picked
 * up the phone yet. This collapses all of that to five honest stages.
 *
 * Two rules that matter more than the mapping itself:
 *
 *  1. A DECLINE NEVER RENDERS AS A STATUS. Someone reading "declined" alone at
 *     11pm has been given bad news by a web page with no one to ask about it.
 *     A decline from one funder also isn't the end of the file — Robert's own
 *     framing is that it's a "no right now" (BUSINESS_CONTEXT §2). It shows as
 *     "we're reviewing your options", and the real conversation happens on the
 *     phone.
 *
 *  2. NO PROMISES. Nothing here implies approval or funding is coming. Spec §5
 *     forbids it and spec §26 forbids the platform making credit decisions at
 *     all.
 */

export type CustomerStage =
  | "received"
  | "reviewing"
  | "need_from_you"
  | "with_funder"
  | "complete";

export interface CustomerStatusView {
  stage: CustomerStage;
  label: string;
  description: string;
  /** Position in the visible progress track, 1-indexed. */
  step: number;
  /** True when the applicant has something to do. */
  actionNeeded: boolean;
}

export const CUSTOMER_STAGES: CustomerStage[] = [
  "received",
  "reviewing",
  "need_from_you",
  "with_funder",
  "complete",
];

export const CUSTOMER_STAGE_LABELS: Record<CustomerStage, string> = {
  received: "Application received",
  reviewing: "Reviewing your file",
  need_from_you: "We need a few things",
  with_funder: "Submitted for financing",
  complete: "Complete",
};

/**
 * The mapping. Every internal status must appear exactly once — a status with
 * no mapping would fall through to a default and quietly tell an applicant
 * something wrong.
 */
const STAGE_BY_STATUS: Record<ApplicationStatus, CustomerStage> = {
  draft: "received",
  submitted: "received",
  initial_review: "received",

  contact_attempted: "reviewing",
  contacted: "reviewing",
  under_review: "reviewing",
  potential_match: "reviewing",

  information_requested: "need_from_you",
  documents_requested: "need_from_you",

  documents_received: "reviewing",
  submitted_to_funder: "with_funder",

  // Deliberately mapped to "reviewing", not to anything final.
  // A single funder's decision is not the file's outcome, and this is not the
  // place to deliver that news.
  approved: "with_funder",
  declined: "reviewing",

  funded: "complete",
  closed: "complete",
  withdrawn: "complete",
};

const STAGE_COPY: Record<CustomerStage, string> = {
  received:
    "We have your information and a financing specialist will review it shortly.",
  reviewing:
    "A specialist is reviewing your file and looking at which programs may fit your situation.",
  need_from_you:
    "There are a few items we need from you before we can move forward. They're listed below.",
  with_funder:
    "Your application is with a funding source. We'll be in touch as soon as we hear back.",
  complete:
    "This application is complete. If anything changes, your specialist will reach out.",
};

export function customerStatus(status: ApplicationStatus): CustomerStatusView {
  const stage = STAGE_BY_STATUS[status] ?? "reviewing";
  return {
    stage,
    label: CUSTOMER_STAGE_LABELS[stage],
    description: STAGE_COPY[stage],
    step: CUSTOMER_STAGES.indexOf(stage) + 1,
    actionNeeded: stage === "need_from_you",
  };
}

/**
 * Guard used by the tests and worth keeping: no internal vocabulary should ever
 * reach a customer-facing string.
 */
export const FORBIDDEN_CUSTOMER_WORDS = [
  "declined",
  "denied",
  "rejected",
  "funder",
  "lender",
  "approved",
  "underwriting",
];
