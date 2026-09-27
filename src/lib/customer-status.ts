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
  | "started"
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
  "started",
  "received",
  "reviewing",
  "need_from_you",
  "with_funder",
  "complete",
];

export const CUSTOMER_STAGE_LABELS: Record<CustomerStage, string> = {
  started: "Finishing your application",
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
/*
 * DRAFT IS "STARTED", NOT "RECEIVED". Every prequal lands as 'draft', and an
 * applicant never moves it out themselves: there is no submit button, staff
 * advance the file. So 'draft' means they are still filling it in, and
 * "Application received" (which it used to map to) told someone who had only
 * answered the short questionnaire that they had submitted an application.
 */
const STAGE_BY_STATUS: Record<ApplicationStatus, CustomerStage> = {
  draft: "started",
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
  started:
    "Complete your application and send your documents. Once they're in, a specialist reviews your file and reaches out with next steps.",
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

/** What the applicant has done, from their side of the file. */
export interface ApplicantProgress {
  /** Every required question answered, including any follow-up section. */
  applicationDone: boolean;
  /** No requested document is still waiting on them. */
  documentsSent: boolean;
}

/**
 * The stage an applicant sees.
 *
 * A DRAFT WHOSE APPLICANT HAS FINISHED READS AS RECEIVED. There is no submit
 * button: an applicant finishes by answering everything and sending every
 * document, and the status only leaves 'draft' when staff move it. Going by
 * status alone, someone who had done all of it was still told "Finishing your
 * application", step 1 of 4. So `progress` can carry a finished draft to
 * "received" (the In review step). It only ever moves 'started' forward, and
 * only on the screen; the stored status is still staff's to change.
 */
export function customerStatus(status: ApplicationStatus, progress?: ApplicantProgress): CustomerStatusView {
  let stage = STAGE_BY_STATUS[status] ?? "reviewing";
  if (stage === "started" && progress?.applicationDone && progress.documentsSent) stage = "received";
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
