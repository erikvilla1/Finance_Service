import { createServiceRoleClient } from "@/lib/supabase/server";
import { createZip, safeFileName, type ZipEntry } from "@/lib/zip";
import { assessCompleteness } from "./completeness";
import { loadFundingApplication } from "./load";
import { formatCurrency, formatDate } from "@/lib/crm";

/**
 * The lender package: one zip, everything a funder needs, named so the folder
 * reads itself.
 *
 * This is the deliverable the whole product points at. Robert assembles it by
 * hand today — documents out of email, the application off a printer — and the
 * assembly is where things get forgotten, because nothing tells him what is
 * missing until a funder asks.
 *
 * EVERY ACCEPTED FILE PER CHECKLIST ITEM. A request can hold several documents
 * for two very different reasons, and they need opposite handling.
 *
 * One is a correction: a rejected first attempt and its replacement. Sending
 * both makes a lender read the same statement twice and guess which is current.
 *
 * The other is a set. "Bank statements, last 6 months" is six files by
 * definition; so is a year of tax returns. There is no newest one to pick,
 * because none of them supersedes another.
 *
 * Acceptance separates the two, and it is the right signal because it is a
 * specialist saying "this belongs in the file". Every accepted document travels;
 * a rejected one never travels while an accepted one exists. Before review there
 * is nothing accepted to go on, so the newest wins as it used to — at that point
 * a second upload is far more likely to be a correction than a second page.
 *
 * THE MANIFEST IS NOT DECORATION. It lists what is inside, and — more usefully —
 * what is not. A funder receiving a package with no debt schedule should be able
 * to see that it was waived rather than lost, and Robert should be able to see
 * it before he sends rather than after.
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

  const report = assessCompleteness(data.context);
  const application = data.context.application ?? {};
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
    .select(
      "id, document_request_id, document_type_key, file_name, storage_path, status, created_at",
    )
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

  // Newest first from the query. Grouped rather than reduced to one, because a
  // single checklist item legitimately holds a set of files.
  type PackagedDocument = NonNullable<typeof documents>[number];
  const byRequest = new Map<string, PackagedDocument[]>();

  /**
   * Files that belong to the application but to no checklist item.
   *
   * NOT A THEORETICAL CASE. signFundingApplication resolves the signed
   * application's request id and falls back to null when there is no
   * signed_application request on the file — so the one document a lender
   * actually relies on is exactly the one that can arrive unlinked. Skipping
   * these, which is what this loop used to do, meant the package could omit the
   * signature and still describe itself as complete.
   *
   * They go in at the end under their own type label rather than being forced
   * into a checklist position they do not have.
   */
  const unlinked = new Map<string, PackagedDocument[]>();

  for (const document of documents ?? []) {
    const key = document.document_request_id;
    const bucket = key ? byRequest : unlinked;
    const id = key ?? document.document_type_key ?? "__unfiled__";

    const group = bucket.get(id);
    if (group) group.push(document);
    else bucket.set(id, [document]);
  }

  /**
   * Which of a request's files go to the funder. See the note at the top of
   * this file for why acceptance rather than recency decides it.
   *
   * The old rule kept one file and reported nothing missing, so a package that
   * had lost five of six bank statements looked complete on its own manifest.
   * That is the part worth guarding against: a short package a lender queries
   * costs a week, and nothing in the product said it was short.
   */
  function choose(group: PackagedDocument[]): PackagedDocument[] {
    const accepted = group.filter((document) => document.status === "accepted");

    // slice(0, 1) is the newest — the query ordered them that way.
    const chosen = accepted.length > 0 ? accepted : group.slice(0, 1);

    // Oldest first. Newest-first is only useful for picking a single winner;
    // a set of statements should read in the order it was sent.
    return [...chosen].reverse();
  }

  const ordered = [...(requests ?? [])].sort(
    (a, b) =>
      (orderByKey.get(a.document_type_key) ?? 999) -
      (orderByKey.get(b.document_type_key) ?? 999),
  );

  const entries: ZipEntry[] = [];
  const included: string[] = [];
  const missing: string[] = [];

  let position = 1;

  /**
   * Add one item's files to the zip under a single number.
   *
   * Every file of one checklist item carries that item's number, so a set stays
   * together in a sorted folder listing instead of being interleaved with
   * whatever happened to sort next. "(1 of 3)" then tells a reader the set is
   * whole without opening anything.
   */
  async function addToPackage(label: string, files: PackagedDocument[]) {
    const number = String(position).padStart(2, "0");
    let part = 0;

    for (const document of files) {
      part += 1;
      const suffix = files.length > 1 ? ` (${part} of ${files.length})` : "";

      const { data: file, error } = await service.storage
        .from("application-documents")
        .download(document.storage_path);

      if (error || !file) {
        // Named rather than skipped silently: a package quietly one document
        // short is worse than one that says which document failed. With a set,
        // the file name says which part of it went missing.
        missing.push(
          files.length > 1
            ? `${label} — ${document.file_name} (file could not be read)`
            : `${label} (file could not be read)`,
        );
        continue;
      }

      const bytes = new Uint8Array(await file.arrayBuffer());

      entries.push({
        name: `${number} ${safeFileName(`${label}${suffix}`)}${extensionOf(document.file_name)}`,
        data: bytes,
        modified: new Date(document.created_at),
      });

      included.push(
        `${label}${suffix} — ${document.file_name}${
          document.status === "accepted" ? "" : ` (${document.status}, not yet accepted)`
        }`,
      );
    }

    position += 1;
  }

  for (const request of ordered) {
    const label = labelByKey.get(request.document_type_key) ?? request.document_type_key;
    const files = choose(byRequest.get(request.id) ?? []);

    if (files.length === 0) {
      if (request.status === "waived") {
        included.push(`${label} — waived, not required for this file`);
      } else if (request.is_required) {
        missing.push(label);
      }
      continue;
    }

    await addToPackage(label, files);
  }

  // Anything the checklist never claimed. Last, and labelled by its own type so
  // the folder still says what it is.
  for (const [key, group] of unlinked) {
    const label =
      labelByKey.get(key) ??
      (key === "__unfiled__" ? "Additional document" : key);

    await addToPackage(label, choose(group));
  }

  // ---------------------------------------------------------------- manifest
  const manifest = [
    `LENDER PACKAGE`,
    ``,
    `Business          ${businessName}`,
    `Reference         ${reference}`,
    `Requested amount  ${formatCurrency(application.requested_amount as number | null)}`,
    `Financing goal    ${(application.financing_goal as string) ?? "—"}`,
    `Prepared          ${formatDate(new Date().toISOString())}`,
    ``,
    `APPLICATION COMPLETENESS`,
    `${report.requiredPresent} of ${report.requiredTotal} required fields`,
    report.readyToSend
      ? `Complete.`
      : `Outstanding: ${report.missing.map((f) => f.formLabel).join(", ")}`,
    ``,
    `ENCLOSED`,
    ...(included.length > 0 ? included.map((line) => `  ${line}`) : ["  Nothing."]),
    ``,
    `NOT ENCLOSED`,
    ...(missing.length > 0 ? missing.map((line) => `  ${line}`) : ["  Nothing outstanding."]),
    ``,
    `Collected on the signed document and not stored by us:`,
    `  ${report.collectedAtSigning.map((f) => f.formLabel).join(", ")}`,
    ``,
  ].join("\n");

  entries.unshift({
    name: "00 Package manifest.txt",
    data: new TextEncoder().encode(manifest),
  });

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
