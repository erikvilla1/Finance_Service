"use client";

import { useRef, useState, useTransition, type DragEvent } from "react";
import { Check, CircleAlert, FileText, UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  ACCEPT_ATTRIBUTE,
  ACCEPTED_DESCRIPTION,
  checkFile,
  formatBytes,
  storagePathFor,
} from "@/lib/documents/upload-rules";
import type { ChecklistDocument } from "@/lib/documents/checklist";
import { DOCUMENT_STATUS_LABEL } from "@/lib/documents/checklist";
import { createDocumentLink } from "@/lib/documents/links";
import { Pill, type PillTone } from "@/components/portal/ui";
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
 *
 * SEVERAL FILES, DRAGGED OR PICKED. Three months of bank statements are three
 * files; asking for them one pick at a time was three trips through a file
 * dialog. They go up one after another, each with its own progress bar.
 *
 * REAL PROGRESS. supabase-js uploads with fetch, which reports nothing until
 * the end, and on a phone a 20MB scan is a long silence. So the upload is the
 * same request the library makes (POST /storage/v1/object/<bucket>/<path>,
 * multipart with cacheControl, the user's own token) sent with
 * XMLHttpRequest, which reports bytes as they go. If that request fails for
 * any reason, the library's own upload runs as before, just without the bar,
 * so this can never be worse than what it replaced.
 */

const BUCKET = "application-documents";

type Progress = number | null; // 0..1, or null when it can't be measured

async function uploadFile(
  path: string,
  file: File,
  contentType: string,
  onProgress: (value: Progress) => void,
): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (session?.access_token && base && key) {
    const sent = await new Promise<boolean>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${base}/storage/v1/object/${BUCKET}/${path}`);
      xhr.setRequestHeader("authorization", `Bearer ${session.access_token}`);
      xhr.setRequestHeader("apikey", key);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(event.loaded / event.total);
      };
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
      xhr.onerror = () => resolve(false);
      xhr.onabort = () => resolve(false);

      const body = new FormData();
      body.append("cacheControl", "3600");
      body.append("", new File([file], file.name, { type: contentType }));
      xhr.send(body);
    });
    if (sent) return true;
  }

  // The fallback: exactly the upload this used before, no progress.
  onProgress(null);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType, upsert: false });
  return !error;
}

interface QueuedFile {
  id: string;
  name: string;
  size: number;
  progress: Progress;
  state: "waiting" | "uploading" | "done" | "error";
  error?: string;
}

export function UploadControl({
  applicationId,
  requestId,
  documentTypeKey,
  label,
  compact = false,
}: {
  applicationId: string;
  requestId: string;
  documentTypeKey: string;
  /** The item's name, for the screen-reader label. */
  label: string;
  /** A small "Add another file" rather than the full drop area. */
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const patch = (id: string, change: Partial<QueuedFile>) =>
    setQueue((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)));

  async function handleFiles(list: FileList | File[]) {
    const files = Array.from(list);
    if (files.length === 0 || busy) return;

    const entries = files.map((file, i) => ({
      file,
      entry: {
        id: `${Date.now()}-${i}-${file.name}`,
        name: file.name,
        size: file.size,
        progress: 0 as Progress,
        state: "waiting" as const,
      },
    }));
    // Finished rows from an earlier batch make way for this one.
    setQueue((current) => [...current.filter((item) => item.state === "error"), ...entries.map((e) => e.entry)]);
    setBusy(true);

    try {
      for (const { file, entry } of entries) {
        // The bucket enforces these too, but only after the whole file has
        // gone up. On a phone connection that is a minute spent to be told no.
        const check = checkFile(file);
        if (!check.ok) {
          patch(entry.id, { state: "error", error: check.error });
          continue;
        }

        patch(entry.id, { state: "uploading" });
        const path = storagePathFor(applicationId, documentTypeKey, file.name);
        const uploaded = await uploadFile(path, file, check.contentType, (progress) =>
          patch(entry.id, { progress }),
        );
        if (!uploaded) {
          patch(entry.id, {
            state: "error",
            error: "Couldn't upload this one. Check your connection and try again.",
          });
          continue;
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
          patch(entry.id, { state: "error", error: result.error });
          continue;
        }
        patch(entry.id, { state: "done", progress: 1 });

        // revalidatePath inside the action re-renders this route; the
        // transition is what lets React commit that without tearing the view.
        startTransition(() => {});
      }
    } finally {
      setBusy(false);
      // Without this, choosing the same file twice in a row fires no change
      // event and the retry after an error silently does nothing.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const inputId = `upload-${requestId}`;
  const dropProps = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      if (!dragging) setDragging(true);
    },
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDragging(false);
      if (event.dataTransfer.files?.length) void handleFiles(event.dataTransfer.files);
    },
  };

  return (
    <div className="mt-5">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        className="sr-only"
        accept={ACCEPT_ATTRIBUTE}
        disabled={busy}
        aria-label={`Upload ${label}`}
        onChange={(event) => {
          if (event.target.files) void handleFiles(event.target.files);
        }}
      />

      {compact ? (
        <div
          {...dropProps}
          className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2 transition-colors ${
            dragging ? "bg-brand-50 ring-2 ring-inset ring-brand-900/40" : ""
          }`}
        >
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-900 underline-offset-4 hover:underline disabled:opacity-55"
          >
            <UploadCloud aria-hidden="true" className="h-4 w-4" />
            {busy ? "Uploading…" : "Add another file"}
          </button>
          <span className="text-xs text-ink-500">or drop it here</span>
        </div>
      ) : (
        <div
          {...dropProps}
          className={`rounded-2xl border-2 border-dashed px-5 py-6 text-center transition-colors ${
            dragging ? "border-brand-900/50 bg-brand-50" : "border-ink-200 bg-white/60 hover:border-ink-300"
          }`}
        >
          <UploadCloud aria-hidden="true" className="mx-auto h-6 w-6 text-ink-400" />
          <p className="mt-2 text-sm text-ink-700">
            <span className="font-medium">Drag files here</span>, or{" "}
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="font-semibold text-brand-900 underline underline-offset-4 disabled:opacity-55"
            >
              browse your files
            </button>
          </p>
          <p className="mt-1 text-xs text-ink-500">{ACCEPTED_DESCRIPTION}. Several files at once is fine.</p>
        </div>
      )}

      {queue.length > 0 && (
        <ul className="mt-3 space-y-2" aria-live="polite">
          {queue.map((item) => (
            <li key={item.id} className="rounded-xl bg-ink-50 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  {item.state === "done" ? (
                    <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-success-700" strokeWidth={2.5} />
                  ) : item.state === "error" ? (
                    <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0 text-danger-600" />
                  ) : (
                    <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400" />
                  )}
                  <span className="truncate text-sm font-medium text-ink-800">{item.name}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-ink-500">
                  {item.state === "done"
                    ? "Sent"
                    : item.state === "error"
                      ? ""
                      : item.state === "waiting"
                        ? "Waiting…"
                        : item.progress === null
                          ? "Uploading…"
                          : `${Math.round(item.progress * 100)}%`}
                </span>
              </div>
              {(item.state === "uploading" || item.state === "waiting") && (
                <span className="mt-2 block h-1 overflow-hidden rounded-full bg-ink-200">
                  <span
                    className={`block h-full rounded-full bg-brand-900 transition-[width] duration-200 ${
                      item.progress === null ? "w-1/3 animate-pulse" : ""
                    }`}
                    style={item.progress === null ? undefined : { width: `${Math.round(item.progress * 100)}%` }}
                  />
                </span>
              )}
              {item.state === "error" && item.error && (
                <p role="alert" className="mt-1 text-xs font-medium text-danger-700">
                  {item.error}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {busy && (
        <p className="mt-2 text-xs text-ink-500">Sending your files. Keep this page open until they&apos;re done.</p>
      )}
    </div>
  );
}

const fileTone: Record<ChecklistDocument["status"], PillTone> = {
  requested: "todo",
  uploaded: "waiting",
  under_review: "waiting",
  accepted: "done",
  rejected: "attention",
  waived: "todo",
};

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
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink-50 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-800">{document.fileName}</p>
          <p className="text-xs text-ink-500">
            {formatBytes(document.sizeBytes)}
            {/* A returned file's note is shown in the callout above it. */}
            {document.note && document.status !== "rejected" ? ` · ${document.note}` : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Pill tone={fileTone[document.status]}>{DOCUMENT_STATUS_LABEL[document.status]}</Pill>
        <button
          type="button"
          disabled={busy}
          onClick={() => void open(document.id)}
          className="text-sm font-semibold text-brand-900 underline-offset-4 hover:underline disabled:opacity-55"
        >
          {busy ? "Opening…" : "View"}
        </button>
        {document.withdrawable && (
          <WithdrawButton applicationId={applicationId} documentId={document.id} />
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
