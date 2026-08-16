"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MAX_FILE_BYTES } from "@/lib/documents/upload-rules";
import { notifyStaff } from "@/lib/email/notifications";

/**
 * Recording and retracting uploads.
 *
 * THE FILE ITSELF NEVER PASSES THROUGH HERE. Server Action request bodies are
 * capped at 1MB by default and the bucket accepts 25MB, so routing uploads
 * through an action would mean either raising that limit and streaming bank
 * statements through the Next server, or rejecting most real documents. The
 * browser uploads straight to Supabase Storage — authorised by the storage
 * policies in 0005, which match the first path segment against an application
 * the caller owns — and then calls this to record the row.
 *
 * Which means everything below treats its arguments as a claim, not a fact. The
 * caller says a file is at a path; this checks the path is inside the
 * application it claims, and lets RLS decide whether the caller owns that
 * application at all.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type UploadState = { error?: string; ok?: boolean };

export async function recordUpload(
  _prevState: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const applicationId = String(formData.get("application_id") ?? "");
  const requestId = String(formData.get("request_id") ?? "");
  const documentTypeKey = String(formData.get("document_type_key") ?? "");
  const storagePath = String(formData.get("storage_path") ?? "");
  const fileName = String(formData.get("file_name") ?? "").slice(0, 255);
  const mimeType = String(formData.get("mime_type") ?? "") || null;
  const sizeBytes = Number(formData.get("size_bytes") ?? 0);

  if (!UUID_PATTERN.test(applicationId) || !UUID_PATTERN.test(requestId)) {
    return { error: "We couldn't tell which document that was. Please reload and try again." };
  }

  if (!storagePath || !fileName) {
    return { error: "That upload didn't complete. Please try again." };
  }

  // The path decides who can read the file. A row pointing outside its own
  // application would be a document filed against one applicant and readable by
  // another — the composite foreign key added in 0021 blocks the mismatch at the
  // request level, and this blocks it at the storage level.
  if (!storagePath.startsWith(`${applicationId}/`)) {
    return { error: "That upload didn't complete. Please try again." };
  }

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_FILE_BYTES) {
    return { error: "That file is too large to accept. The limit is 25MB." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your session expired. Please sign in and try again." };
  }

  // Not a permission check — the insert policy on public.documents already does
  // that, and would reject a request belonging to someone else's application.
  // This is here so document_type_key comes from the request rather than from
  // the browser, which would otherwise be free to file a rent roll as a tax
  // return.
  const { data: request } = await supabase
    .from("document_requests")
    .select("id, document_type_key")
    .eq("id", requestId)
    .eq("application_id", applicationId)
    .maybeSingle();

  if (!request || request.document_type_key !== documentTypeKey) {
    return { error: "We couldn't match that to anything we asked for. Please reload and try again." };
  }

  const { error } = await supabase.from("documents").insert({
    application_id: applicationId,
    document_request_id: requestId,
    document_type_key: request.document_type_key,
    storage_path: storagePath,
    file_name: fileName,
    mime_type: mimeType,
    size_bytes: sizeBytes,
    uploaded_by: user.id,
    status: "uploaded",
  });

  if (error) {
    // The object is already in the bucket at this point and customers hold no
    // delete policy on storage, so a failure here leaves a file nobody has a row
    // for. Invisible to the applicant and harmless — but it is the reason a
    // retry writes to a new timestamped path rather than overwriting.
    return { error: "We couldn't save that just then. Please try again." };
  }

  // Robert finds out a document arrived without refreshing the pipeline to
  // check. Never blocks the upload — the file is already stored and recorded by
  // this point, and a failed notification must not read as a failed upload.
  await notifyStaff(
    applicationId,
    "Document received",
    `${request.document_type_key.replaceAll("_", " ")} — ${fileName}`,
  );

  // The trigger from 0021 has already moved the request to 'uploaded'; this is
  // what makes the page reflect it in the same round trip.
  revalidatePath(`/dashboard/${applicationId}/documents`);
  revalidatePath("/dashboard");

  return { ok: true };
}

/**
 * Take back a file uploaded in error.
 *
 * Delegates entirely to withdraw_document() (migration 0021), which re-checks
 * ownership against auth.uid() and refuses once anyone has started reviewing.
 * Nothing is decided here, because a check written here could be skipped by
 * POSTing to the action directly.
 */
export async function withdrawUpload(
  _prevState: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const applicationId = String(formData.get("application_id") ?? "");
  const documentId = String(formData.get("document_id") ?? "");

  if (!UUID_PATTERN.test(documentId) || !UUID_PATTERN.test(applicationId)) {
    return { error: "We couldn't find that file." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("withdraw_document", {
    document_id: documentId,
  });

  if (error) {
    return { error: "We couldn't remove that just then. Please try again." };
  }

  if (!data) {
    return {
      error:
        "That file has already been picked up for review, so it can't be removed here. Your specialist can sort it out.",
    };
  }

  revalidatePath(`/dashboard/${applicationId}/documents`);
  revalidatePath("/dashboard");

  return { ok: true };
}

// Signing a URL lives in @/lib/documents/links — the specialist reviewing a
// document and the applicant reviewing their own upload are the same operation,
// and the select policy on public.documents already answers who may do it.
