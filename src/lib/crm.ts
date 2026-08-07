import type { ApplicationStatus } from "@/types/database";

/**
 * Pipeline vocabulary.
 *
 * The sixteen stages come from platform spec §18. Grouping them keeps the board
 * readable — Robert works one deal at a time, and sixteen equal columns is a
 * spreadsheet, not a pipeline.
 */

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  initial_review: "Initial review",
  contact_attempted: "Contact attempted",
  contacted: "Contacted",
  information_requested: "Information requested",
  documents_requested: "Documents requested",
  documents_received: "Documents received",
  under_review: "Under review",
  potential_match: "Potential match",
  submitted_to_funder: "Submitted to funder",
  approved: "Approved",
  declined: "Declined",
  withdrawn: "Withdrawn",
  funded: "Funded",
  closed: "Closed",
};

export type StatusGroup = "new" | "working" | "packaging" | "decided" | "closed";

export const STATUS_GROUP: Record<ApplicationStatus, StatusGroup> = {
  draft: "new",
  submitted: "new",
  initial_review: "new",
  contact_attempted: "working",
  contacted: "working",
  information_requested: "working",
  documents_requested: "working",
  documents_received: "working",
  under_review: "packaging",
  potential_match: "packaging",
  submitted_to_funder: "packaging",
  approved: "decided",
  declined: "decided",
  withdrawn: "closed",
  funded: "closed",
  closed: "closed",
};

export const GROUP_LABELS: Record<StatusGroup, string> = {
  new: "New",
  working: "In contact",
  packaging: "Packaging",
  decided: "Decided",
  closed: "Closed",
};

export const STATUS_ORDER: ApplicationStatus[] = [
  "draft",
  "submitted",
  "initial_review",
  "contact_attempted",
  "contacted",
  "information_requested",
  "documents_requested",
  "documents_received",
  "under_review",
  "potential_match",
  "submitted_to_funder",
  "approved",
  "declined",
  "withdrawn",
  "funded",
  "closed",
];

/**
 * The metric Robert says actually matters (BUSINESS_CONTEXT §2): deals packaged
 * and sent to a funder. Everything upstream is noise until it becomes one.
 */
export const SUBMITTAL_STATUSES: ApplicationStatus[] = [
  "submitted_to_funder",
  "approved",
  "declined",
  "funded",
];

export function statusTone(
  status: ApplicationStatus,
): "neutral" | "brand" | "success" | "warning" | "danger" {
  switch (STATUS_GROUP[status]) {
    case "new":
      return "brand";
    case "working":
    case "packaging":
      return "warning";
    case "decided":
      return status === "declined" ? "danger" : "success";
    default:
      return status === "funded" ? "success" : "neutral";
  }
}

export function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * The timezone the business operates in. Robert is in Los Angeles.
 *
 * Every date shown to staff is rendered in this zone explicitly. Leaving it
 * unset means Intl falls back to the *server's* zone, which is UTC in
 * production — so a 10pm Pacific application would display as the next day.
 * That is a quiet, believable kind of wrong: nothing errors, the dates just
 * disagree with reality near midnight.
 */
export const BUSINESS_TIMEZONE = "America/Los_Angeles";

export function formatDate(
  value: string | null,
  timeZone: string = BUSINESS_TIMEZONE,
): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(new Date(value));
}

export function formatDateTime(
  value: string | null,
  timeZone: string = BUSINESS_TIMEZONE,
): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone,
  }).format(new Date(value));
}

/**
 * The same instant as the applicant experienced it.
 *
 * Answers the question that actually matters before dialling: is it a
 * reasonable hour where this person is? Returns null when no zone was captured
 * or the value is unusable, so callers can omit the line rather than print a
 * misleading fallback.
 */
export function formatApplicantLocalTime(
  value: string | null,
  timeZone: string | null,
): string | null {
  if (!value || !timeZone) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone,
    }).format(new Date(value));
  } catch {
    // Unrecognised zone string — treat as not captured.
    return null;
  }
}

/** Current local time where the applicant is, for "is it OK to call now". */
export function applicantLocalNow(timeZone: string | null): string | null {
  if (!timeZone) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone,
    }).format(new Date());
  } catch {
    return null;
  }
}

/**
 * Whether calling right now would be reasonable where the applicant is.
 * Deliberately conservative: 8am to 7pm local.
 */
export function isReasonableCallingHour(timeZone: string | null): boolean | null {
  if (!timeZone) return null;
  try {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone,
      }).format(new Date()),
    );
    if (!Number.isFinite(hour)) return null;
    return hour >= 8 && hour < 19;
  } catch {
    return null;
  }
}

export function humanize(value: string | null): string {
  if (!value) return "—";
  return value.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());
}
