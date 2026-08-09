import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DocumentStatus } from "@/types/database";

/**
 * The applicant's document checklist.
 *
 * BUSINESS_CONTEXT §8: the checklist is where deals currently die — not because
 * people refuse to send documents, but because nobody can see what is still
 * outstanding without asking. This assembles that view from three tables and
 * says one thing clearly: what is left for you to do.
 *
 * Every query here runs on the caller's own client. There is no user filter in
 * any of them, and there should not be — the RLS policies in 0005 restrict
 * document_requests and documents to the owner of the application. Adding a
 * `.eq("profile_id", ...)` alongside would imply the isolation lives in this
 * file, and the day someone forgets it the query would still look correct.
 */

type Client = SupabaseClient<Database>;

export type ChecklistDocument = {
  id: string;
  fileName: string;
  sizeBytes: number | null;
  status: DocumentStatus;
  uploadedAt: string;
  /** Only ever set by staff, and only worth showing when something came back. */
  note: string | null;
  /** Whether the applicant can still take this one back. */
  withdrawable: boolean;
};

export type ChecklistItem = {
  requestId: string;
  key: string;
  label: string;
  description: string | null;
  /** Free text from the specialist — overrides the generic description. */
  instructions: string | null;
  isRequired: boolean;
  status: DocumentStatus;
  dueDate: string | null;
  documents: ChecklistDocument[];
};

export type Checklist = {
  items: ChecklistItem[];
  /** Required items settled one way or the other. Drives the progress bar. */
  requiredSettled: number;
  requiredTotal: number;
  /** Required items waiting on the applicant, which is the number that matters. */
  outstanding: number;
};

/**
 * Settled means "we are not waiting on this any more" — accepted, or waived
 * because a specialist decided it isn't needed. Uploaded-but-unreviewed is
 * deliberately NOT settled: the progress bar tracks the file's readiness, not
 * the applicant's effort, and a bar that fills up on upload would sit at 100%
 * while a specialist works through a stack of documents.
 */
const SETTLED: DocumentStatus[] = ["accepted", "waived"];

/** The applicant has something to do about these. Nothing else needs them. */
const NEEDS_APPLICANT: DocumentStatus[] = ["requested", "rejected"];

export function isSettled(status: DocumentStatus): boolean {
  return SETTLED.includes(status);
}

export function needsApplicant(status: DocumentStatus): boolean {
  return NEEDS_APPLICANT.includes(status);
}

/**
 * Customer-facing wording for a document's state.
 *
 * "Rejected" never reaches a screen — it is on the forbidden list in
 * customer-status.ts, and for the same reason: a person who scanned a page
 * crookedly has not been rejected, they need to send another copy. The internal
 * value is unchanged; only the word is.
 */
export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  requested: "Needed",
  uploaded: "Received",
  under_review: "Being checked",
  accepted: "Done",
  rejected: "Send another copy",
  waived: "Not needed",
};

export function documentStatusTone(
  status: DocumentStatus,
): "neutral" | "brand" | "success" | "warning" {
  switch (status) {
    case "accepted":
      return "success";
    case "waived":
      return "neutral";
    case "uploaded":
    case "under_review":
      return "brand";
    default:
      return "warning";
  }
}

/**
 * Load the checklist for one application.
 *
 * Three separate queries rather than one embedded select. PostgREST could join
 * these in a single round trip, but the hand-written Database type declares
 * `Relationships: []`, so an embedded select resolves its nested rows to never
 * and every field access typechecks against nothing. Joining in TypeScript costs
 * two round trips on a page that loads a dozen rows, and keeps the types real.
 *
 * Returns null when the application isn't visible to the caller — RLS makes that
 * indistinguishable from not existing, which is the correct answer to give
 * someone who guessed at a URL.
 */
export async function loadChecklist(
  supabase: Client,
  applicationId: string,
): Promise<Checklist | null> {
  const { data: requests, error } = await supabase
    .from("document_requests")
    .select(
      "id, document_type_key, is_required, status, instructions, due_date",
    )
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });

  if (error || !requests) return null;

  const [{ data: definitions }, { data: documents }] = await Promise.all([
    supabase
      .from("document_type_definitions")
      .select("key, label, description, sort_order"),
    supabase
      .from("documents")
      .select(
        "id, document_request_id, file_name, size_bytes, status, created_at, verification_note",
      )
      .eq("application_id", applicationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const definitionByKey = new Map(
    (definitions ?? []).map((definition) => [definition.key, definition]),
  );

  const documentsByRequest = new Map<string, ChecklistDocument[]>();
  for (const document of documents ?? []) {
    if (!document.document_request_id) continue;
    const list = documentsByRequest.get(document.document_request_id) ?? [];
    list.push({
      id: document.id,
      fileName: document.file_name,
      sizeBytes: document.size_bytes,
      status: document.status,
      uploadedAt: document.created_at,
      note: document.verification_note,
      // Matches the guard inside withdraw_document(). Showing the control when
      // the function would refuse produces a button that does nothing.
      withdrawable: document.status === "uploaded",
    });
    documentsByRequest.set(document.document_request_id, list);
  }

  // Outstanding work first, then the catalogue's own ordering. Someone opening
  // this page wants the thing they have to do, not an alphabetical list.
  const ordered = [...requests].sort((a, b) => {
    const aOpen = needsApplicant(a.status) ? 0 : 1;
    const bOpen = needsApplicant(b.status) ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;

    const aOrder = definitionByKey.get(a.document_type_key)?.sort_order ?? 999;
    const bOrder = definitionByKey.get(b.document_type_key)?.sort_order ?? 999;
    return aOrder - bOrder;
  });

  const items: ChecklistItem[] = ordered.map((request) => {
    const definition = definitionByKey.get(request.document_type_key);
    return {
      requestId: request.id,
      key: request.document_type_key,
      // A request can outlive its definition being deactivated. Falling back to
      // the key is ugly but readable; an empty heading is neither.
      label: definition?.label ?? humanizeKey(request.document_type_key),
      description: definition?.description ?? null,
      instructions: request.instructions,
      isRequired: request.is_required,
      status: request.status,
      dueDate: request.due_date,
      documents: documentsByRequest.get(request.id) ?? [],
    };
  });

  const required = items.filter((item) => item.isRequired);

  return {
    items,
    requiredTotal: required.length,
    requiredSettled: required.filter((item) => isSettled(item.status)).length,
    outstanding: required.filter((item) => needsApplicant(item.status)).length,
  };
}

/**
 * Outstanding counts for several applications at once.
 *
 * The dashboard lists every application the person has and needs one number per
 * card. Doing that with loadChecklist in a loop is a query per application on
 * the critical path of the page they land on after signing in.
 */
export async function loadOutstandingCounts(
  supabase: Client,
  applicationIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (applicationIds.length === 0) return counts;

  const { data } = await supabase
    .from("document_requests")
    .select("application_id, status, is_required")
    .in("application_id", applicationIds)
    .eq("is_required", true);

  for (const id of applicationIds) counts.set(id, 0);

  for (const row of data ?? []) {
    if (!needsApplicant(row.status)) continue;
    counts.set(row.application_id, (counts.get(row.application_id) ?? 0) + 1);
  }

  return counts;
}

function humanizeKey(key: string): string {
  return key.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());
}
