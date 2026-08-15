import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  LenderRow,
  LenderSubmissionRow,
  LenderSubmissionStatus,
  ProductTrack,
} from "@/types/database";

/**
 * Lenders, and what happened when a file went to one.
 *
 * Everything here is staff-only by construction: both tables have no
 * customer-facing policy at all, so these queries return nothing to an
 * applicant rather than returning their own rows. That is deliberate — the
 * lender list is the business, not a private field.
 */

type Client = SupabaseClient<Database>;

export interface SubmissionWithLender extends LenderSubmissionRow {
  lender: Pick<LenderRow, "id" | "name" | "contact_name" | "contact_email">;
}

/**
 * Where a submission stands, in the words a specialist would use.
 *
 * 'declined' reads plainly here. This is the internal side, and softening it
 * would make a specialist re-read the row to work out what happened — the
 * careful wording belongs on the applicant's screen, which never sees any of
 * this.
 */
export const SUBMISSION_STATUS_LABEL: Record<LenderSubmissionStatus, string> = {
  prepared: "Prepared",
  sent: "Sent",
  in_review: "In review",
  countered: "Countered",
  approved: "Approved",
  declined: "Declined",
  withdrawn: "Withdrawn",
  funded: "Funded",
};

export function submissionTone(
  status: LenderSubmissionStatus,
): "neutral" | "brand" | "success" | "warning" | "danger" {
  switch (status) {
    case "funded":
    case "approved":
      return "success";
    case "countered":
      return "warning";
    case "declined":
      return "danger";
    case "withdrawn":
      return "neutral";
    case "prepared":
      return "neutral";
    default:
      return "brand";
  }
}

/** Nothing more is going to happen on these. */
const CLOSED: LenderSubmissionStatus[] = [
  "declined",
  "withdrawn",
  "funded",
];

export function isOpenSubmission(status: LenderSubmissionStatus): boolean {
  return !CLOSED.includes(status);
}

export async function loadSubmissions(
  supabase: Client,
  applicationId: string,
): Promise<SubmissionWithLender[]> {
  const { data: submissions } = await supabase
    .from("lender_submissions")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });

  if (!submissions || submissions.length === 0) return [];

  // Fetched separately rather than embedded, for the reason the rest of the app
  // does: the hand-written Database type declares no relationships, so a nested
  // select resolves its rows to never.
  const { data: lenders } = await supabase
    .from("lenders")
    .select("id, name, contact_name, contact_email")
    .in("id", [...new Set(submissions.map((s) => s.lender_id))]);

  const lenderById = new Map((lenders ?? []).map((l) => [l.id, l]));

  return submissions.map((submission) => ({
    ...submission,
    lender: lenderById.get(submission.lender_id) ?? {
      id: submission.lender_id,
      name: "Unknown lender",
      contact_name: null,
      contact_email: null,
    },
  }));
}

/**
 * Lenders worth suggesting for a file, best fit first.
 *
 * Not a matching engine and not pretending to be one. It filters out the
 * obviously wrong — a lender who does not write this track, or whose range the
 * request falls outside — and orders the rest. Robert's judgement about
 * appetite is the actual matching, and it lives in `notes` where no rule can
 * reach it.
 *
 * A lender with no tracks recorded is shown rather than hidden. Absent
 * information is not a reason to withhold an option from the person who knows
 * these relationships.
 */
export async function suggestLenders(
  supabase: Client,
  options: { track: ProductTrack | null; amount: number | null },
): Promise<LenderRow[]> {
  const { data } = await supabase
    .from("lenders")
    .select("*")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name");

  const lenders = (data ?? []) as LenderRow[];

  const fits = (lender: LenderRow) => {
    if (options.track && lender.tracks.length > 0) {
      if (!lender.tracks.includes(options.track)) return false;
    }

    if (options.amount != null) {
      if (lender.amount_min != null && options.amount < Number(lender.amount_min)) {
        return false;
      }
      if (lender.amount_max != null && options.amount > Number(lender.amount_max)) {
        return false;
      }
    }

    return true;
  };

  // Everything is returned, with the fitting ones first — a specialist sending
  // a file outside a lender's stated range because he knows they will look at
  // it is a normal thing to do, and a filter that hides them makes the platform
  // worse than the spreadsheet.
  return [...lenders].sort((a, b) => {
    const aFits = fits(a) ? 0 : 1;
    const bFits = fits(b) ? 0 : 1;
    if (aFits !== bFits) return aFits - bFits;
    return a.name.localeCompare(b.name);
  });
}

export function lenderFitsTrack(
  lender: LenderRow,
  track: ProductTrack | null,
): boolean {
  if (!track || lender.tracks.length === 0) return true;
  return lender.tracks.includes(track);
}
