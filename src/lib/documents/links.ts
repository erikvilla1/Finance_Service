"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * A short-lived link to a document in the private bucket.
 *
 * Spec §23: private object storage, signed time-limited URLs, never a public
 * one. Five minutes is enough to open a file and short enough that a link
 * forwarded in an email is dead before it arrives anywhere.
 *
 * ONE FUNCTION FOR BOTH SIDES. The applicant reviewing what they sent and the
 * specialist reviewing what arrived are the same operation, and the select
 * policy on public.documents already answers "may this caller see this row"
 * for both — `a.profile_id = auth.uid() or public.is_staff()`. A separate
 * staff version would be a second place for that question to be answered
 * differently.
 *
 * Takes a document id and reads the path from the row rather than accepting a
 * path from the caller. The caller can only name rows RLS already shows them,
 * and the bucket's internal layout never reaches a client bundle.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createDocumentLink(
  documentId: string,
): Promise<{ url?: string; error?: string }> {
  if (!UUID_PATTERN.test(documentId)) {
    return { error: "We couldn't open that file." };
  }

  const supabase = await createClient();

  const { data: document } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", documentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!document) return { error: "We couldn't open that file." };

  const { data, error } = await supabase.storage
    .from("application-documents")
    .createSignedUrl(document.storage_path, 300);

  if (error || !data?.signedUrl) return { error: "We couldn't open that file." };

  return { url: data.signedUrl };
}
