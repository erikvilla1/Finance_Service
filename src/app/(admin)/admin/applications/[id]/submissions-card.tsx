import Link from "next/link";
import { Badge, Button, Card, Input, Select, Textarea } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime, humanize } from "@/lib/crm";
import type { ProductTrack } from "@/types/database";
import {
  SUBMISSION_STATUS_LABEL,
  isOpenSubmission,
  loadSubmissions,
  submissionTone,
  suggestLenders,
} from "@/lib/lenders";
import { addSubmission, recordResponse } from "./submission-actions";

/**
 * Where this file has been, and where it goes next.
 *
 * BUSINESS_CONTEXT §2: Robert "matches each borrower to a custom lender — a real
 * differentiator in commercial finance". Until now the platform could record
 * exactly one fact about that: submitted, or not. No lender, no date, no
 * response.
 *
 * A DECLINE IS NOT THE END OF THE FILE, and this panel is shaped around that.
 * "A denial is not a forever no" is Robert's own framing, so a declined
 * submission sits in the history with its reason attached and the form to send
 * it elsewhere stays right there underneath. Nothing about a decline closes the
 * application.
 */
export async function SubmissionsCard({
  applicationId,
  track,
  requestedAmount,
}: {
  applicationId: string;
  track: ProductTrack | null;
  requestedAmount: number | null;
}) {
  const supabase = await createClient();

  const [submissions, lenders] = await Promise.all([
    loadSubmissions(supabase, applicationId),
    suggestLenders(supabase, { track, amount: requestedAmount }),
  ]);

  const open = submissions.filter((s) => isOpenSubmission(s.status));
  const alreadySent = new Set(open.map((s) => s.lender_id));
  const offerable = lenders.filter((lender) => !alreadySent.has(lender.id));

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink-900">Lenders</h2>
          <p className="mt-1 text-sm text-ink-600">
            {submissions.length === 0
              ? "Not sent to anyone yet"
              : `${submissions.length} submission${submissions.length === 1 ? "" : "s"}, ${open.length} still open`}
          </p>
        </div>
        {open.length > 0 && <Badge tone="brand">{open.length} live</Badge>}
      </div>

      {submissions.length > 0 && (
        <ul className="mt-5 divide-y divide-ink-100">
          {submissions.map((submission) => (
            <li key={submission.id} className="py-4 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {submission.lender.name}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {submission.submitted_at
                      ? `Sent ${formatDateTime(submission.submitted_at)}`
                      : "Not sent yet"}
                    {submission.responded_at
                      ? ` · answered ${formatDateTime(submission.responded_at)}`
                      : ""}
                  </p>
                </div>
                <Badge tone={submissionTone(submission.status)}>
                  {SUBMISSION_STATUS_LABEL[submission.status]}
                </Badge>
              </div>

              {submission.decline_reason && (
                <p className="mt-2 rounded-lg bg-ink-50 p-3 text-sm leading-relaxed text-ink-700">
                  <span className="font-medium">Why: </span>
                  {submission.decline_reason}
                </p>
              )}

              {(submission.offered_amount || submission.offered_terms) && (
                <p className="mt-2 text-sm text-ink-700">
                  {submission.offered_amount
                    ? formatCurrency(submission.offered_amount)
                    : ""}
                  {submission.offered_terms ? ` · ${submission.offered_terms}` : ""}
                </p>
              )}

              {isOpenSubmission(submission.status) && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-brand-700 hover:underline">
                    Record their answer
                  </summary>
                  <form action={recordResponse} className="mt-3 space-y-3">
                    <input type="hidden" name="applicationId" value={applicationId} />
                    <input type="hidden" name="submissionId" value={submission.id} />

                    <Select name="status" defaultValue="in_review" aria-label="Response">
                      <option value="in_review">In review</option>
                      <option value="countered">Countered</option>
                      <option value="approved">Approved</option>
                      <option value="declined">Declined</option>
                      <option value="withdrawn">Withdrawn</option>
                      <option value="funded">Funded</option>
                    </Select>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        name="offeredAmount"
                        inputMode="decimal"
                        placeholder="Amount offered, if any"
                        aria-label="Amount offered"
                      />
                      <Input
                        name="offeredTerms"
                        placeholder="Terms, rate, conditions"
                        aria-label="Terms offered"
                      />
                    </div>

                    {/*
                      Required by the action when the answer is a decline. It is
                      the most reusable sentence in the business: it tells the
                      next submission what to fix, and over time it tells Robert
                      which lender to stop sending this kind of file to.
                    */}
                    <Textarea
                      name="declineReason"
                      rows={2}
                      placeholder="If declined, why? Required — the next submission depends on it."
                    />

                    <Button type="submit" size="sm" variant="secondary">
                      Save answer
                    </Button>
                  </form>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* ------------------------------------------------------- send it out */}
      <div className="mt-5 border-t border-ink-100 pt-4">
        {lenders.length === 0 ? (
          <p className="text-sm text-ink-600">
            No lenders yet.{" "}
            <Link href="/admin/lenders" className="font-semibold text-brand-700 hover:underline">
              Add the first one
            </Link>
            .
          </p>
        ) : (
          <details open={submissions.length === 0}>
            <summary className="cursor-pointer text-sm font-semibold text-brand-700">
              {submissions.length === 0 ? "Send to a lender" : "Send to another lender"}
            </summary>

            <form action={addSubmission} className="mt-3 space-y-3">
              <input type="hidden" name="applicationId" value={applicationId} />

              <Select name="lenderId" required aria-label="Lender">
                {offerable.map((lender) => (
                  <option key={lender.id} value={lender.id}>
                    {lender.name}
                    {lender.tracks.length > 0
                      ? ` — ${lender.tracks.map(humanize).join(", ")}`
                      : ""}
                  </option>
                ))}
              </Select>

              <Textarea
                name="notes"
                rows={2}
                placeholder="Anything worth remembering about this submission"
              />

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" size="sm">
                  Record as sent
                </Button>
                <label className="flex items-center gap-2 text-sm text-ink-600">
                  <input type="checkbox" name="markSent" value="false" />
                  Preparing it, not sent yet
                </label>
              </div>
            </form>

            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              Lenders that fit this file&apos;s track and amount are listed first.
              Sending outside a lender&apos;s stated range is still an option —
              the list orders, it doesn&apos;t decide.
            </p>
          </details>
        )}
      </div>
    </Card>
  );
}
