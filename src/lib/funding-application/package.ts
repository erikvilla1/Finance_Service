import { createServiceRoleClient } from "@/lib/supabase/server";
import { createZip, safeFileName, type ZipEntry } from "@/lib/zip";
import { loadFundingApplication } from "./load";

/**
 * The lender package: one zip, everything a funder needs, named so the folder
 * reads itself.
 *
 * This is the deliverable the whole product points at. Robert assembles it by
 * hand today — documents out of email, the application off a printer — and the
 * assembly is where things get forgotten, because nothing tells him what is
 * missing until a funder asks.
 *
 * ONE FILE PER CHECKLIST ITEM, THE NEWEST. A request can hold several documents:
 * a rejected first attempt, its replacement, a specialist's own copy. Sending
 * all of them makes a lender read the same statement twice and guess which is
 * current. The newest non-deleted file wins, which is the same one the checklist
 * shows as satisfying the request.
 *
 * NO MANIFEST. An earlier version put a "00 Package manifest.txt" at the top of
 * the zip listing what was enclosed and what was not. The client asked what it
 * was and for it to go (Notion 09.27): everything it said is already on the
 * admin page the download comes from (lender package readiness, the missing
 * list), and a funder does not need our internal completeness notes in their
 * folder. `missing` still comes back to the caller for the warning before the
 * download.
 *
 * Runs on the service role, deliberately and narrowly. Reading a dozen files out
 * of a private bucket in one request is the one thing a per-user client makes
 * genuinely awkward — every download would need its own signed URL and round
 * trip. The caller is responsible for having established that the requester is
 * staff; the route handler does that before this is entered.
 */

export interface PackageResult {
  filename: string;
  zip: Buffer;
  /** Everything the lender package still lacks, for the caller to warn about. */
  missing: string[];
}

export async function buildLenderPackage(
  applicationId: string,
): Promise<PackageResult | null> {
  const service = createServiceRoleClient();

  const data = await loadFundingApplication(applicationId);
  if (!data) return null;

  const business = data.context.business;

  const businessName =
    (business?.legal_name as string | undefined) ??
    (data.context.owners[0]?.full_name as string | undefined) ??
    "Applicant";

  const reference = data.referenceCode ?? applicationId.slice(0, 8);

  // ---------------------------------------------------------------- documents
  const { data: requests } = await service
    .from("document_requests")
    .select("id, document_type_key, status, is_required")
    .eq("application_id", applicationId);

  const { data: documents } = await service
    .from("documents")
    .select("id, document_request_id, file_name, storage_path, status, created_at")
    .eq("application_id", applicationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { data: definitions } = await service
    .from("document_type_definitions")
    .select("key, label, sort_order");

  const labelByKey = new Map(
    (definitions ?? []).map((d) => [d.key, d.label] as const),
  );
  const orderByKey = new Map(
    (definitions ?? []).map((d) => [d.key, d.sort_order] as const),
  );

  // Newest first from the query, so the first one seen per request is the one
  // to send.
  type PackagedDocument = NonNullable<typeof documents>[number];
  const newestByRequest = new Map<string, PackagedDocument>();

  for (const document of documents ?? []) {
    if (!document.document_request_id) continue;
    if (!newestByRequest.has(document.document_request_id)) {
      newestByRequest.set(document.document_request_id, document);
    }
  }

  const ordered = [...(requests ?? [])].sort(
    (a, b) =>
      (orderByKey.get(a.document_type_key) ?? 999) -
      (orderByKey.get(b.document_type_key) ?? 999),
  );

  const entries: ZipEntry[] = [];
  const missing: string[] = [];

  let position = 1;

  for (const request of ordered) {
    const label = labelByKey.get(request.document_type_key) ?? request.document_type_key;
    const document = newestByRequest.get(request.id);

    if (!document) {
      if (request.status !== "waived" && request.is_required) missing.push(label);
      continue;
    }

    const { data: file, error } = await service.storage
      .from("application-documents")
      .download(document.storage_path);

    if (error || !file) {
      // Named rather than skipped silently: a package quietly one document
      // short is worse than one that says which document failed.
      missing.push(`${label} (file could not be read)`);
      continue;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = extensionOf(document.file_name);
    const number = String(position).padStart(2, "0");

    entries.push({
      name: `${number} ${safeFileName(label)}${extension}`,
      data: bytes,
      modified: new Date(document.created_at),
    });

    position += 1;
  }

  return {
    filename: `${safeFileName(`${reference} ${businessName}`)}.zip`,
    zip: createZip(entries),
    missing,
  };
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot === -1) return "";

  const extension = fileName.slice(dot).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(extension) ? extension : "";
}
