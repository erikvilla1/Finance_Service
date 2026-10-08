import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Container,
  ProgressBar,
  Select,
  Textarea,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { NudgeLink } from "@/components/admin/nudge-link";
import type { ProductMatch } from "@/lib/qualification/types";
import {
  BUSINESS_TIMEZONE,
  STATUS_LABELS,
  STATUS_ORDER,
  applicantLocalNow,
  formatApplicantLocalTime,
  formatCurrency,
  formatDate,
  formatDateTime,
  humanize,
  isReasonableCallingHour,
  statusTone,
} from "@/lib/crm";
import { loadLeadSummaries } from "@/lib/leads";
import { assessCompleteness } from "@/lib/funding-application/completeness";
import { loadFundingApplication } from "@/lib/funding-application/load";
import { addNote, updateStatus } from "./actions";
import { DocumentsCard } from "./documents-card";
import { SubmissionsCard } from "./submissions-card";
import { MatchRoutes, type StoredMatch } from "./match-routes";
import type { ProductMatch as MatchedFamily } from "@/lib/matching/types";

export const metadata: Metadata = {
  title: "Application",
  robots: { index: false, follow: false },
};

/**
 * The full lead view.
 *
 * Everything a specialist needs before picking up the phone, on one screen.
 * BUSINESS_CONTEXT §3: the current setup makes them assemble this from email,
 * a spreadsheet, and memory.
 *
 * All reads go through the signed-in user's client, so RLS applies. A customer
 * who somehow reached this URL would get nothing back.
 */
export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!application) notFound();

  const [{ data: answers }, { data: result }, { data: notes }, { data: history }] =
    await Promise.all([
      supabase
        .from("application_answers")
        .select("question_key, value, is_pii")
        .eq("application_id", id),
      supabase
        .from("qualification_results")
        .select("*")
        .eq("application_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("crm_notes")
        .select("id, body, created_at, author_profile_id")
        .eq("application_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("application_status_history")
        .select("id, from_status, to_status, created_at")
        .eq("application_id", id)
        .order("created_at", { ascending: false }),
    ]);

  // Same loader the pipeline uses, so a lead is named identically in the list
  // and on its own page.
  const summaries = await loadLeadSummaries(supabase, [application]);
  const lead = summaries.get(application.id);

  const fundingData = await loadFundingApplication(id);
  const completeness = assessCompleteness(
    fundingData?.context ?? {
      application: null, business: null, owners: [], answers: {}, debtCount: 0,
    },
  );

  const isV3 = result?.engine_version?.startsWith("3.") ?? false;
  const matches = (result?.product_matches ?? []) as unknown as ProductMatch[];
  const rulesEvaluated = (isV3 ? [] : result?.rules_evaluated ?? []) as unknown as {
    ruleId: string;
    description: string;
    matched: boolean;
    detail: string;
  }[];

  return (
    <Container>
      <Link
        href="/admin"
        className="text-sm font-medium text-brand-700 hover:underline"
      >
        ← Back to pipeline
      </Link>

      {/*
        Who this is, above what they want.

        The heading used to be the financing goal — "Finance Equipment" — which
        is true of a great many files and identifies none of them. A specialist
        arriving here from a phone call needs to confirm in one glance that they
        are looking at the right company.

        Business first, then the person, because that is the order a lender
        package reads and the order the pipeline list uses. Neither present yet
        means the prequal was submitted and nothing since, which is worth saying
        plainly rather than papering over with a reference number.
      */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          {/* THE REFERENCE IS NO LONGER THE HEADLINE. This line used to open
              with FLS-2026-000075, which made the filing number the deal's
              identity — on screen, in the pipeline, and in the chase email's
              subject. Robert identifies deals by business, so the business is
              the h1 and the reference moved to the end of the meta line below:
              still there to match a funder's correspondence, no longer the
              first thing read. */}
          {lead?.contactName && lead?.businessName && (
            <p className="font-mono text-sm text-ink-500 dark:text-ink-400">
              {lead.contactName}
            </p>
          )}
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink-900 dark:text-ink-100">
            {lead?.businessName ?? lead?.contactName ?? "Name not given yet"}
          </h1>
          <p className="mt-1 text-ink-600 dark:text-ink-300">
            {application.financing_goal ?? "Financing application"}
            {` · ${formatCurrency(application.requested_amount)}`}
            {application.track ? ` · ${humanize(application.track)} track` : ""}
            {` · created ${formatDate(application.created_at)}`}
            <span className="ml-2 font-mono text-sm text-ink-400 dark:text-ink-500">
              {application.reference_code}
            </span>
          </p>
          {lead?.contactEmail && (
            <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
              <a
                href={`mailto:${lead.contactEmail}`}
                className="hover:text-brand-700 hover:underline"
              >
                {lead.contactEmail}
              </a>
            </p>
          )}
          {/* Renders itself away when there is nothing outstanding, so it only
              appears on the files it is actually for. */}
          {lead && (
            <NudgeLink summary={lead} className="mt-3" />
          )}
        </div>
        <Badge tone={statusTone(application.status)}>
          {STATUS_LABELS[application.status]}
        </Badge>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* ------------------------------------------------------- MAIN */}
        <div className="space-y-6 lg:col-span-2">
          {/*
            Lender package readiness. This is the screen that replaces reading a
            form looking for blanks (BUSINESS_CONTEXT §3) — it names what is
            missing, and lists the signer-collected fields separately so they
            read as accounted for rather than absent.
          */}
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">
                  Lender package
                </h2>
                <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
                  {completeness.requiredPresent} of {completeness.requiredTotal}{" "}
                  required fields complete
                </p>
              </div>
              <Badge tone={completeness.readyToSend ? "success" : "warning"}>
                {completeness.readyToSend ? "Ready to send" : "Incomplete"}
              </Badge>
            </div>

            <div className="mt-4">
              <ProgressBar
                value={completeness.requiredPresent}
                max={completeness.requiredTotal}
                label="Application completeness"
              />
            </div>

            {completeness.missingBySection.length > 0 && (
              <div className="mt-5 space-y-3 border-t border-ink-100 dark:border-white/10 pt-4">
                {completeness.missingBySection.map((group) => (
                  <div key={group.section}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
                      {group.label}
                    </h3>
                    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {group.fields.map((field) => (
                        <li key={field.key} className="text-sm text-ink-800 dark:text-ink-200">
                          {field.formLabel}
                          {field.conditional && (
                            <span className="ml-1 text-xs text-ink-400 dark:text-ink-500">
                              (needed for this file)
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {completeness.collectedAtSigning.length > 0 && (
              <p className="mt-5 rounded-lg bg-ink-50 dark:bg-white/[0.04] p-3 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                Collected at signing, not stored here:{" "}
                {completeness.collectedAtSigning
                  .map((f) => f.formLabel)
                  .join(", ")}
                .
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <ButtonLink
                href={`/admin/applications/${application.id}/print`}
                size="sm"
                variant="secondary"
              >
                Open funding application
              </ButtonLink>

              {/*
                A plain link, not a Button — it is a file download, and an
                anchor to a route handler is what makes the browser treat it as
                one. Styled to match.

                Deliberately not disabled when the package is incomplete.
                Robert knows things about a file that this screen does not, and
                a specialist who wants to send eleven of twelve documents to a
                funder who asked for exactly those should not be argued with by
                a button. The manifest inside says what is missing, and so does
                the line underneath.
              */}
              <a
                href={`/admin/applications/${application.id}/package`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-700"
              >
                Download lender package
              </a>
            </div>

            <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
              {lead && lead.docsSettled === lead.docsTotal && completeness.readyToSend
                ? "Everything is in. The zip contains the manifest and every document."
                : "The zip includes a manifest naming anything still outstanding."}
            </p>
          </Card>

          {/*
            Directly under the lender package, because the two answer the same
            question from different sides: the package names the fields that are
            blank, this names the paperwork that hasn't arrived. Both are reasons
            a file cannot go out.
          */}
          <DocumentsCard
            applicationId={application.id}
            signatureRequestedAt={application.signature_requested_at}
          />

          {/*
            After the documents, because that is the order the work happens in:
            the package is assembled, then it goes out. A decline here sends it
            to the next lender rather than ending the file.
          */}
          <SubmissionsCard
            applicationId={application.id}
            track={application.track}
            requestedAmount={application.requested_amount}
          />

          <Card>
            <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">
              What they told us
            </h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {[
                ["Requested amount", formatCurrency(application.requested_amount)],
                ["Time in business", humanize(application.time_in_business)],
                ["Annual revenue", humanize(application.revenue_band)],
                ["Credit range", humanize(application.credit_band)],
                ["Industry", application.industry ?? "—"],
                ["Urgency", humanize(application.urgency)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs uppercase tracking-wide text-ink-400 dark:text-ink-500">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-sm text-ink-900 dark:text-ink-100">{value}</dd>
                </div>
              ))}
            </dl>

            {(answers?.length ?? 0) > 0 && (
              <details className="mt-5 border-t border-ink-100 dark:border-white/10 pt-4">
                <summary className="cursor-pointer text-sm font-medium text-brand-700">
                  All {answers?.length} stored answers
                </summary>
                <dl className="mt-3 space-y-2">
                  {(answers ?? []).map((answer) => (
                    <div key={answer.question_key} className="flex gap-3 text-sm">
                      <dt className="w-56 shrink-0 font-mono text-xs text-ink-500 dark:text-ink-400">
                        {answer.question_key}
                      </dt>
                      <dd className="text-ink-800 dark:text-ink-200">
                        {answer.is_pii ? (
                          <span className="text-ink-400 dark:text-ink-500">[redacted]</span>
                        ) : (
                          String(answer.value ?? "—")
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">
              Qualification result
            </h2>
            {!result ? (
              <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
                No result recorded for this application.
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
                  Outcome{" "}
                  <span className="font-medium text-ink-900 dark:text-ink-100">
                    {humanize(result.outcome)}
                  </span>
                  {" · engine "}
                  <span className="font-mono text-xs">{result.engine_version}</span>
                </p>

                {/* Scored by the spec v1.1 engine: match states and lender
                    routes. The two blocks after this are the previous
                    engine's shape and render only for its results. */}
                {isV3 && (
                  <MatchRoutes
                    stored={(result.rules_evaluated ?? {}) as unknown as StoredMatch}
                    matches={(result.product_matches ?? []) as unknown as MatchedFamily[]}
                    missing={
                      Array.isArray(result.missing_information)
                        ? (result.missing_information as string[])
                        : []
                    }
                  />
                )}

                {!isV3 && matches.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {matches.map((match) => (
                      <li
                        key={match.productSlug}
                        className="flex items-center justify-between gap-3 rounded-lg bg-ink-50 dark:bg-white/[0.04] px-3 py-2"
                      >
                        <span className="text-sm text-ink-900 dark:text-ink-100">
                          {match.productName}
                        </span>
                        <Badge
                          tone={
                            match.confidence === "potential_match"
                              ? "success"
                              : "warning"
                          }
                        >
                          {match.confidence === "potential_match"
                            ? "Potential match"
                            : "Needs review"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}

                {/*
                  Spec §26 requires storing the rules used to produce each
                  result. Showing them here is what makes the engine auditable
                  in practice rather than only in principle.
                */}
                {!isV3 && rulesEvaluated.length > 0 && (
                  <details className="mt-5 border-t border-ink-100 dark:border-white/10 pt-4">
                    <summary className="cursor-pointer text-sm font-medium text-brand-700">
                      Why — {rulesEvaluated.length} rule
                      {rulesEvaluated.length === 1 ? "" : "s"} evaluated
                    </summary>
                    <ul className="mt-3 space-y-2">
                      {rulesEvaluated.map((rule, index) => (
                        <li key={`${rule.ruleId}-${index}`} className="text-sm">
                          <span
                            className={
                              rule.matched
                                ? "font-medium text-success-700"
                                : "font-medium text-ink-500"
                            }
                          >
                            {rule.matched ? "matched" : "no match"}
                          </span>{" "}
                          <span className="text-ink-800 dark:text-ink-200">{rule.description}</span>
                          <p className="mt-0.5 font-mono text-xs text-ink-500 dark:text-ink-400">
                            {rule.detail}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">Notes</h2>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
              Internal only. Never shown to the applicant.
            </p>

            <form action={addNote} className="mt-4 space-y-3">
              <input type="hidden" name="applicationId" value={application.id} />
              <label htmlFor="note-body" className="sr-only">
                Add a note
              </label>
              <Textarea
                id="note-body"
                name="body"
                rows={3}
                placeholder="What happened on this deal?"
                required
              />
              <Button type="submit" size="sm">
                Add note
              </Button>
            </form>

            <div className="mt-6">
              {(notes?.length ?? 0) === 0 ? (
                <p className="text-sm text-ink-500 dark:text-ink-400">No notes yet.</p>
              ) : (
                <ul className="space-y-4">
                  {(notes ?? []).map((note) => (
                    <li key={note.id} className="border-t border-ink-100 dark:border-white/10 pt-4">
                      <p className="whitespace-pre-wrap text-sm text-ink-800 dark:text-ink-200">
                        {note.body}
                      </p>
                      <p className="mt-1.5 text-xs text-ink-500 dark:text-ink-400">
                        {formatDateTime(note.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        {/* ------------------------------------------------------ SIDEBAR */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">Move the deal</h2>
            <form action={updateStatus} className="mt-4 space-y-3">
              <input type="hidden" name="applicationId" value={application.id} />
              <label htmlFor="status" className="sr-only">
                Status
              </label>
              <Select id="status" name="status" defaultValue={application.status}>
                {STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
              <Button type="submit" size="sm" className="w-full">
                Update status
              </Button>
            </form>
          </Card>

          {/*
            Before dialling, the question isn't "when was this created" — it's
            "is it a reasonable hour where they are". A national pipeline means
            a 9am call from Los Angeles is 6am in New York.
          */}
          <Card>
            <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">
              Calling window
            </h2>
            {application.applicant_timezone ? (
              <>
                <p className="mt-3 text-sm text-ink-500 dark:text-ink-400">Their local time now</p>
                <p className="text-2xl font-bold tabular-nums text-ink-900 dark:text-ink-100">
                  {applicantLocalNow(application.applicant_timezone)}
                </p>
                {(() => {
                  const ok = isReasonableCallingHour(application.applicant_timezone);
                  if (ok === null) return null;
                  return (
                    <div className="mt-3">
                      <Badge tone={ok ? "success" : "warning"}>
                        {ok ? "Reasonable hour to call" : "Outside 8am–7pm local"}
                      </Badge>
                    </div>
                  );
                })()}
                <p className="mt-3 font-mono text-xs text-ink-500 dark:text-ink-400">
                  {application.applicant_timezone}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
                No timezone captured for this applicant.
              </p>
            )}
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">Lead source</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500 dark:text-ink-400">Source</dt>
                <dd className="text-ink-900 dark:text-ink-100">{application.source ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500 dark:text-ink-400">Channel</dt>
                <dd className="text-ink-900 dark:text-ink-100">{application.channel ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500 dark:text-ink-400">Submitted</dt>
                <dd className="text-right text-ink-900 dark:text-ink-100">
                  {formatDateTime(application.created_at)}
                  {(() => {
                    const local = formatApplicantLocalTime(
                      application.created_at,
                      application.applicant_timezone,
                    );
                    // Only worth showing when it differs from the office zone.
                    if (!local || application.applicant_timezone === BUSINESS_TIMEZONE) {
                      return null;
                    }
                    return (
                      <span className="block text-xs text-ink-500 dark:text-ink-400">
                        {local} their time
                      </span>
                    );
                  })()}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500 dark:text-ink-400">First contact</dt>
                <dd className="text-ink-900 dark:text-ink-100">
                  {formatDateTime(application.first_contact_at)}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">History</h2>
            {(history?.length ?? 0) === 0 ? (
              <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
                No status changes recorded yet.
              </p>
            ) : (
              <ol className="mt-3 space-y-3">
                {(history ?? []).map((entry) => (
                  <li key={entry.id} className="text-sm">
                    <p className="text-ink-900 dark:text-ink-100">
                      {entry.from_status
                        ? `${STATUS_LABELS[entry.from_status]} → `
                        : ""}
                      {STATUS_LABELS[entry.to_status]}
                    </p>
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      {formatDateTime(entry.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </Container>
  );
}
