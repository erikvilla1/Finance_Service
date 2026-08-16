import { Badge, Button, Card, ProgressBar, Select, Textarea } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/crm";
import {
  STAFF_DOCUMENT_STATUS_LABEL,
  documentStatusTone,
  isSettled,
  loadChecklist,
} from "@/lib/documents/checklist";
import { formatBytes } from "@/lib/documents/upload-rules";
import { assessCompleteness } from "@/lib/funding-application/completeness";
import { loadFundingApplication } from "@/lib/funding-application/load";
import {
  acceptDocument,
  rejectDocument,
  requestDocument,
  requestSignature,
  unwaiveRequest,
  waiveRequest,
} from "./document-actions";
import { OpenDocument } from "./open-document";

/**
 * Document review.
 *
 * BUSINESS_CONTEXT §8 names the checklist as where deals die, and §3 describes
 * the current process: documents arrive by email, get read somewhere else, and
 * the state of the checklist lives in Robert's head. This is the screen that
 * replaces that — every file that has arrived, openable, with the two decisions
 * that matter attached to it.
 *
 * Reads the same loader the applicant's page uses. The two screens showing the
 * same rows through different queries is how they drift, and a specialist
 * marking something accepted needs to be confident the applicant is looking at
 * the same fact.
 *
 * Only the vocabulary differs, and it must: 'rejected' reads as "Sent back"
 * here and "Send another copy" there.
 */
export async function DocumentsCard({
  applicationId,
  signatureRequestedAt,
}: {
  applicationId: string;
  signatureRequestedAt: string | null;
}) {
  const supabase = await createClient();

  const [checklist, { data: definitions }, { data: signedDocument }] =
    await Promise.all([
      loadChecklist(supabase, applicationId),
      supabase
        .from("document_type_definitions")
        .select("key, label")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("documents")
        .select("id, created_at")
        .eq("application_id", applicationId)
        .eq("document_type_key", "signed_application")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const items = checklist?.items ?? [];
  const requestedKeys = new Set(items.map((item) => item.key));
  const available = (definitions ?? []).filter(
    (definition) => !requestedKeys.has(definition.key),
  );

  const awaitingReview = items.filter((item) =>
    item.documents.some((document) => document.status === "uploaded"),
  ).length;

  // Signing is gated on the application being complete. The FCRA wording the
  // applicant accepts says everything submitted is "true, complete and
  // accurate" — putting that over a form with blanks is worse than making them
  // wait a day, and a lender receiving it either returns it or, worse, doesn't
  // notice.
  const fundingData = await loadFundingApplication(applicationId);
  const completeness = assessCompleteness(
    fundingData?.context ?? {
      application: null, business: null, owners: [], answers: {}, debtCount: 0,
    },
  );

  const canRequestSignature = completeness.readyToSend;
  const missingForSignature = completeness.missing.map((field) => field.formLabel);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink-900">Documents</h2>
          <p className="mt-1 text-sm text-ink-600">
            {checklist
              ? `${checklist.requiredSettled} of ${checklist.requiredTotal} required documents settled`
              : "No checklist for this application"}
          </p>
        </div>
        {awaitingReview > 0 && (
          <Badge tone="warning">
            {awaitingReview === 1
              ? "1 file to review"
              : `${awaitingReview} files to review`}
          </Badge>
        )}
      </div>

      {checklist && checklist.requiredTotal > 0 && (
        <div className="mt-4">
          <ProgressBar
            value={checklist.requiredSettled}
            max={checklist.requiredTotal}
            label="Checklist"
          />
        </div>
      )}

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-ink-600">
          Nothing has been asked for yet. The checklist is seeded when the
          applicant claims their application — until then, add items below.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-ink-100">
          {items.map((item) => (
            <li key={item.requestId} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {item.label}
                    {!item.isRequired && (
                      <span className="ml-2 text-xs font-normal text-ink-500">
                        optional
                      </span>
                    )}
                  </p>
                  {item.instructions && (
                    <p className="mt-1 max-w-prose text-sm text-ink-600">
                      {item.instructions}
                    </p>
                  )}
                  {item.dueDate && (
                    <p className="mt-1 text-xs text-ink-500">
                      Due {formatDate(item.dueDate)}
                    </p>
                  )}
                </div>
                <Badge tone={documentStatusTone(item.status)}>
                  {STAFF_DOCUMENT_STATUS_LABEL[item.status]}
                </Badge>
              </div>

              {item.documents.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {item.documents.map((document) => (
                    <li
                      key={document.id}
                      className="rounded-lg bg-ink-50 px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink-800">
                            {document.fileName}
                          </p>
                          <p className="text-xs text-ink-500">
                            {formatBytes(document.sizeBytes)} ·{" "}
                            {formatDateTime(document.uploadedAt)}
                          </p>

                          {/*
                            Provenance, on the one item where mistaking the two
                            is expensive. A transcript was once accepted into
                            the signed-application slot and would have gone to a
                            funder as "01 Signed Application.pdf" — the fix is
                            not to forbid uploads there, since a wet signature
                            is a real answer, but to stop them being
                            indistinguishable.
                          */}
                          {item.key === "signed_application" && (
                            <p
                              className={
                                document.source === "e_signature"
                                  ? "mt-1 text-xs font-medium text-success-700"
                                  : "mt-1 text-xs font-medium text-warning-700"
                              }
                            >
                              {document.source === "e_signature"
                                ? "Signed in the portal — consent and audit trail recorded"
                                : "Uploaded file — not signed through the portal, check it carries a signature"}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <Badge tone={documentStatusTone(document.status)}>
                            {STAFF_DOCUMENT_STATUS_LABEL[document.status]}
                          </Badge>
                          <OpenDocument
                            documentId={document.id}
                            fileName={document.fileName}
                          />
                          {document.status !== "accepted" && (
                            <form action={acceptDocument}>
                              <input
                                type="hidden"
                                name="applicationId"
                                value={applicationId}
                              />
                              <input
                                type="hidden"
                                name="documentId"
                                value={document.id}
                              />
                              <button
                                type="submit"
                                className="text-sm font-semibold text-success-700 hover:underline"
                              >
                                Accept
                              </button>
                            </form>
                          )}
                        </div>
                      </div>

                      {document.note && (
                        <p className="mt-2 text-xs text-ink-600">
                          Sent back: {document.note}
                        </p>
                      )}

                      {/*
                        The reason is required by the action, so it is a field
                        here rather than a confirm dialog. Collapsed by default
                        because the common case is accepting.
                      */}
                      {document.status !== "rejected" && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-medium text-ink-600 hover:text-danger-700">
                            Send back
                          </summary>
                          <form action={rejectDocument} className="mt-2 space-y-2">
                            <input
                              type="hidden"
                              name="applicationId"
                              value={applicationId}
                            />
                            <input
                              type="hidden"
                              name="documentId"
                              value={document.id}
                            />
                            <Textarea
                              name="reason"
                              rows={2}
                              required
                              maxLength={500}
                              placeholder="What needs fixing? The applicant reads this exactly as written."
                            />
                            <Button type="submit" variant="secondary" size="sm">
                              Send back
                            </Button>
                          </form>
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {/* Waiving is only meaningful while something is still expected. */}
              {item.status === "waived" ? (
                <form action={unwaiveRequest} className="mt-3">
                  <input type="hidden" name="applicationId" value={applicationId} />
                  <input type="hidden" name="requestId" value={item.requestId} />
                  <button
                    type="submit"
                    className="text-sm font-medium text-ink-600 hover:text-brand-700"
                  >
                    Put back on the list
                  </button>
                </form>
              ) : (
                !isSettled(item.status) && (
                  <form action={waiveRequest} className="mt-3">
                    <input
                      type="hidden"
                      name="applicationId"
                      value={applicationId}
                    />
                    <input type="hidden" name="requestId" value={item.requestId} />
                    <button
                      type="submit"
                      className="text-sm font-medium text-ink-600 hover:text-brand-700"
                    >
                      Not needed for this deal
                    </button>
                  </form>
                )
              )}
            </li>
          ))}
        </ul>
      )}

      {/*
        The signature release. Sits with the documents because that is what it
        produces — a signed application arrives as another item on this list —
        and because this is the screen a specialist is on when they decide the
        file is ready.
      */}
      <div className="mt-5 border-t border-ink-100 pt-4 dark:border-brand-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">
              Funding application signature
            </p>
            <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-400">
              {signedDocument
                ? `Signed ${formatDateTime(signedDocument.created_at)}`
                : signatureRequestedAt
                  ? `Waiting on the applicant since ${formatDateTime(signatureRequestedAt)}`
                  : canRequestSignature
                    ? "The applicant sees no signing page until you release it"
                    : "The application has blanks — it cannot be signed yet"}
            </p>
          </div>

          {!signedDocument && (
            <form action={requestSignature}>
              <input type="hidden" name="applicationId" value={applicationId} />
              <input
                type="hidden"
                name="withdraw"
                value={signatureRequestedAt ? "true" : "false"}
              />
              <Button
                type="submit"
                size="sm"
                variant={signatureRequestedAt ? "secondary" : "primary"}
                disabled={!signatureRequestedAt && !canRequestSignature}
              >
                {signatureRequestedAt ? "Withdraw request" : "Send for signature"}
              </Button>
            </form>
          )}
        </div>

        {/*
          Named, not just refused. "Cannot send yet" without saying why sends a
          specialist hunting through a form for blanks, which is the exact work
          the completeness check exists to remove.
        */}
        {!signedDocument && !signatureRequestedAt && !canRequestSignature && (
          <p className="mt-2 text-xs leading-relaxed text-warning-700">
            <span className="font-medium">Still needed: </span>
            {missingForSignature.slice(0, 6).join(", ")}
            {missingForSignature.length > 6 &&
              ` and ${missingForSignature.length - 6} more`}
            . The applicant fills these in on their own application page.
          </p>
        )}
      </div>

      {available.length > 0 && (
        <details className="mt-5 border-t border-ink-100 pt-4">
          <summary className="cursor-pointer text-sm font-semibold text-brand-700">
            Ask for something else
          </summary>
          <form action={requestDocument} className="mt-3 space-y-3">
            <input type="hidden" name="applicationId" value={applicationId} />
            <Select name="documentTypeKey" required aria-label="Document type">
              {available.map((definition) => (
                <option key={definition.key} value={definition.key}>
                  {definition.label}
                </option>
              ))}
            </Select>
            <Textarea
              name="instructions"
              rows={2}
              maxLength={1000}
              placeholder="Optional. Replaces the generic description on the applicant's page — be specific about periods, pages, or which entity."
            />
            <Button type="submit" size="sm">
              Add to checklist
            </Button>
          </form>
        </details>
      )}
    </Card>
  );
}
