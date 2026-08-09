"use client";

import { useState } from "react";
import { createDocumentLink } from "@/lib/documents/links";

/**
 * Opens a document through a freshly signed URL.
 *
 * The link is fetched on click rather than rendered into the page. Signed URLs
 * expire in five minutes, and a lead view left open on a second monitor all
 * afternoon would otherwise be a column of dead links with no way to tell which.
 */
export function OpenDocument({
  documentId,
  fileName,
}: {
  documentId: string;
  fileName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={busy}
        aria-label={`Open ${fileName}`}
        onClick={() => {
          setError(null);
          setBusy(true);
          void createDocumentLink(documentId)
            .then(({ url, error: linkError }) => {
              if (!url) {
                setError(linkError ?? "Could not open that file.");
                return;
              }
              window.open(url, "_blank", "noopener,noreferrer");
            })
            .finally(() => setBusy(false));
        }}
        className="text-sm font-semibold text-brand-700 hover:underline disabled:opacity-55"
      >
        {busy ? "Opening…" : "Open"}
      </button>
      {error && (
        <span role="alert" className="text-sm font-medium text-danger-700">
          {error}
        </span>
      )}
    </>
  );
}
