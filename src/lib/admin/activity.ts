import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApplicationStatus, Database } from "@/types/database";
import { STATUS_LABELS } from "@/lib/crm";

/**
 * What has happened lately, across the whole operation.
 *
 * Four things count as activity, and they are the four a specialist would want
 * to be told about without asking: a lead arrived, a file moved, a document
 * turned up, someone wrote a note.
 *
 * Merged in memory from four small queries rather than a union view. Each one is
 * bounded and indexed on `created_at`, and a view would be a migration for
 * something a sort already does.
 *
 * Every entry carries the application it belongs to, because an activity feed
 * you cannot click is a list of things you now have to go and find.
 */

type Client = SupabaseClient<Database>;

export type ActivityKind = "application" | "status" | "document" | "note";

export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  at: string;
  applicationId: string;
  referenceCode: string | null;
}

export async function loadRecentActivity(
  supabase: Client,
  limit = 12,
): Promise<ActivityEntry[]> {
  // Deliberately over-fetched per source: the newest twelve overall could all
  // come from one source, so taking twelve of each and sorting is the only way
  // to be sure the merge is right.
  const [{ data: applications }, { data: history }, { data: documents }, { data: notes }] =
    await Promise.all([
      supabase
        .from("applications")
        .select("id, reference_code, financing_goal, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("application_status_history")
        .select("id, application_id, from_status, to_status, created_at")
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("documents")
        .select("id, application_id, file_name, status, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("crm_notes")
        .select("id, application_id, body, created_at")
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

  // Reference codes for the sources that do not carry one.
  const referenceIds = new Set<string>();
  for (const row of history ?? []) referenceIds.add(row.application_id);
  for (const row of documents ?? []) referenceIds.add(row.application_id);
  for (const row of notes ?? []) referenceIds.add(row.application_id);

  const codeById = new Map<string, string>();
  for (const row of applications ?? []) codeById.set(row.id, row.reference_code);

  const missing = [...referenceIds].filter((id) => !codeById.has(id));
  if (missing.length > 0) {
    const { data: extra } = await supabase
      .from("applications")
      .select("id, reference_code")
      .in("id", missing);

    for (const row of extra ?? []) codeById.set(row.id, row.reference_code);
  }

  const entries: ActivityEntry[] = [];

  for (const row of applications ?? []) {
    entries.push({
      id: `application-${row.id}`,
      kind: "application",
      title: "New application",
      detail: row.financing_goal ?? "Prequalification submitted",
      at: row.created_at,
      applicationId: row.id,
      referenceCode: row.reference_code,
    });
  }

  for (const row of history ?? []) {
    entries.push({
      id: `status-${row.id}`,
      kind: "status",
      title: "Moved to " + label(row.to_status),
      detail: row.from_status ? `From ${label(row.from_status)}` : "First stage",
      at: row.created_at,
      applicationId: row.application_id,
      referenceCode: codeById.get(row.application_id) ?? null,
    });
  }

  for (const row of documents ?? []) {
    entries.push({
      id: `document-${row.id}`,
      kind: "document",
      // Staff wording, not the applicant's. This feed is internal.
      title: row.status === "uploaded" ? "Document received" : "Document updated",
      detail: row.file_name,
      at: row.created_at,
      applicationId: row.application_id,
      referenceCode: codeById.get(row.application_id) ?? null,
    });
  }

  for (const row of notes ?? []) {
    entries.push({
      id: `note-${row.id}`,
      kind: "note",
      title: "Note added",
      detail: row.body.length > 90 ? `${row.body.slice(0, 90)}…` : row.body,
      at: row.created_at,
      applicationId: row.application_id,
      referenceCode: codeById.get(row.application_id) ?? null,
    });
  }

  return entries
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

function label(status: ApplicationStatus): string {
  return STATUS_LABELS[status] ?? status;
}
