"use client";

import { useRef, useState, useTransition } from "react";
import { Badge, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import {
  ACCEPT_ATTRIBUTE,
  ACCEPTED_DESCRIPTION,
  checkFile,
  formatBytes,
  storagePathFor,
} from "@/lib/documents/upload-rules";
import type { ChecklistDocument } from "@/lib/documents/checklist";
import {
  DOCUMENT_STATUS_LABEL,
  documentStatusTone,
} from "@/lib/documents/checklist";
import { createDocumentLink } from "@/lib/documents/links";
import { recordUpload, withdrawUpload } from "./actions";

/**
 * The upload control, and the list of what has already been sent.
 *
 * The file goes browser → Supabase Storage directly, never through a Server
 * Action: action bodies cap at 1MB and this bucket accepts 25MB. The action is
 * called afterwards to record the row, so the sequence is upload, then record,
 * and a failure between the two leaves an unreferenced object rather than a row
 * pointing at nothing. That direction is chosen deliberately — an orphaned file
 * is invisible; a row whose file is missing is a specialist clicking a link that
 * errors.
 */

export function UploadControl({
  applicationId,
  requestId,
  documentTypeKey,
  label,
}: {
  applicationId: string;
  requestId: string;
  documentTypeKey: string;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function handleFile(file: File) {
    setError(null);

    // The bucket enforces these too, but only after the whole file has gone up.
    // On a phone connection that is a minute spent to be told no.
    const check = checkFile(file);
    if (!check.ok) {
      setError(check.error);
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const path = storagePathFor(applicationId, documentTypeKey, file.name);

      const { error: uploadError } = await supabase.storage
        .from("application-documents")
        .upload(path, file, { contentType: check.contentType, upsert: false });

      if (uploadError) {
        setError("We couldn't upload that just then. Please check your connection and try again.");
        return;
      }

      const formData = new FormData();
      formData.set("application_id", applicationId);
      formData.set("request_id", requestId);
      formData.set("document_type_key", documentTypeKey);
      formData.set("storage_path", path);
      formData.set("file_name", file.name);
      formData.set("mime_type", check.contentType);
      formData.set("size_bytes", String(file.size));

      const result = await recordUpload({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }

      // revalidatePath inside the action re-renders this route; the transition
      // is what lets React commit that without tearing the current view.
      startTransition(() => {});
    } finally {
      setBusy(false);
      // Without this, choosing the same file twice in a row fires no change
      // event and the retry after an error silently does nothing.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const inputId = `upload-${requestId}`;

  return (
    <div className="mt-4">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="sr-only"
        accept={ACCEPT_ATTRIBUTE}
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          aria-describedby={`${inputId}-hint`}
        >
          {busy ? "Uploading…" : `Upload ${label}`}
        </Button>
        <p id={`${inputId}-hint`} className="text-xs text-ink-500">
          {ACCEPTED_DESCRIPTION}
        </p>
      </div>

      {busy && (
        <p className="mt-2 text-sm text-ink-600" aria-live="polite">
          Sending your file. Don&apos;t close this page.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * One file the applicant has already sent.
 *
 * The link is fetched on click rather than rendered into the page. Signed URLs
 * expire, and a page left open in a tab overnight would otherwise be a list of
 * dead links with no way to tell which — asking for one at the moment it is
 * needed means it is always fresh.
 */
export function UploadedFile({
  applicationId,
  document,
}: {
  applicationId: string;
  document: ChecklistDocument;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function open(documentId: string) {
    setError(null);
    setBusy(true);
    try {
      const { url, error: linkError } = await createDocumentLink(documentId);
      if (!url) {
        setError(linkError ?? "We couldn't open that file.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-ink-50 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-800">
          {document.fileName}
        </p>
        <p className="text-xs text-ink-500">
          {formatBytes(document.sizeBytes)}
          {document.note ? ` · ${document.note}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Badge tone={documentStatusTone(document.status)}>
          {DOCUMENT_STATUS_LABEL[document.status]}
        </Badge>
        <button
          type="button"
          disabled={busy}
          onClick={() => void open(document.id)}
          className="text-sm font-semibold text-brand-700 hover:underline disabled:opacity-55"
        >
          {busy ? "Opening…" : "View"}
        </button>
        {document.withdrawable && (
          <WithdrawButton
            applicationId={applicationId}
            documentId={document.id}
          />
        )}
      </div>

      {error && (
        <p role="alert" className="w-full text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </li>
  );
}

function WithdrawButton({
  applicationId,
  documentId,
}: {
  applicationId: string;
  documentId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const formData = new FormData();
            formData.set("application_id", applicationId);
            formData.set("document_id", documentId);
            const result = await withdrawUpload({}, formData);
            setError(result.error ?? null);
          });
        }}
        className="text-sm font-medium text-ink-600 hover:text-danger-700 disabled:opacity-55"
      >
        {pending ? "Removing…" : "Remove"}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </>
  );
}
