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

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function humanize(value: string | null): string {
  if (!value) return "—";
  return value.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());
}
