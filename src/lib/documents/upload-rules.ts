/**
 * What the `application-documents` bucket will accept.
 *
 * These constants mirror migration 0004 exactly. They are duplicated here on
 * purpose and must not drift: the bucket rejects a bad file with an opaque
 * storage error after the whole thing has been uploaded, which on a 25MB
 * spreadsheet over a phone connection is a minute of the applicant's life spent
 * to be told "no". Checking first is the difference between a useful message and
 * a mystery.
 *
 * If the bucket's configuration changes, change it here in the same commit.
 */

export const MAX_FILE_BYTES = 26_214_400; // 25 MB — storage.buckets.file_size_limit

/**
 * Extension → the content type we declare on upload.
 *
 * Declaring it ourselves rather than trusting `file.type` is deliberate. Browsers
 * disagree about several of these — Safari reports HEIC inconsistently, Windows
 * reports `.csv` as `application/vnd.ms-excel` when Excel is installed, and a
 * file dragged from some cloud drives arrives with an empty type. The bucket
 * checks the declared type against its allow-list, so a browser's guess deciding
 * whether an upload succeeds means the same file works on one machine and fails
 * on another.
 */
const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  csv: "text/csv",
};

export const ACCEPTED_EXTENSIONS = Object.keys(CONTENT_TYPE_BY_EXTENSION);

/** For the file picker's `accept` attribute. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(",");

/** Plain-language version of the same rules, for the UI to say out loud. */
export const ACCEPTED_DESCRIPTION = "PDF, Word, Excel, CSV, or a photo (JPG, PNG, HEIC), up to 25MB";

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

export type FileCheck =
  | { ok: true; contentType: string }
  | { ok: false; error: string };

export function checkFile(file: { name: string; size: number }): FileCheck {
  const contentType = CONTENT_TYPE_BY_EXTENSION[extensionOf(file.name)];

  if (!contentType) {
    return {
      ok: false,
      error: `We can't accept that file type. Send a ${ACCEPTED_DESCRIPTION}.`,
    };
  }

  // Zero-byte files upload without error and are useless. Catching it here
  // saves a specialist opening an empty page and chasing a document that
  // technically arrived.
  if (file.size === 0) {
    return { ok: false, error: "That file is empty. Check it opens, then try again." };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `That file is ${formatBytes(file.size)}. The limit is 25MB — try splitting it or sending a lower-resolution scan.`,
    };
  }

  return { ok: true, contentType };
}

export function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Where the file lives in the bucket.
 *
 * The first segment MUST be the application id. The storage policies in 0005
 * authorise on `(storage.foldername(name))[1]`, so a path that starts with
 * anything else is either rejected or — worse, if the policies ever loosen —
 * readable by the wrong person. Nothing else about the layout is load-bearing.
 *
 * The name is prefixed rather than replaced: the applicant called it
 * "Chase statements Jan-Jun.pdf" for a reason, and a specialist opening a folder
 * of uuids has to download each one to find out what it is. Collisions are
 * avoided by the timestamp, because storage upload refuses to overwrite and
 * customers have no policy allowing them to.
 */
export function storagePathFor(
  applicationId: string,
  documentTypeKey: string,
  fileName: string,
): string {
  const safeName = fileName
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(-100) // keep the extension when a name is absurdly long
    .replace(/^[.-]+/, "");

  return `${applicationId}/${documentTypeKey}/${Date.now()}-${safeName || "upload"}`;
}
