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
import { addNote, assignToMe, updateStatus } from "./actions";
import { DocumentsCard } from "./documents-card";

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

  const matches = (result?.product_matches ?? []) as unknown as ProductMatch[];
  const rulesEvaluated = (result?.rules_evaluated ?? []) as unknown as {
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
          <p className="font-mono text-sm text-ink-500">
            {application.reference_code}
            {lead?.contactName && lead?.businessName
              ? ` · ${lead.contactName}`
              : ""}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink-900">
            {lead?.businessName ?? lead?.contactName ?? "Name not given yet"}
          </h1>
          <p className="mt-1 text-ink-600">
            {application.financing_goal ?? "Financing application"}
            {` · ${formatCurrency(application.requested_amount)}`}
            {application.track ? ` · ${humanize(application.track)} track` : ""}
            {` · created ${formatDate(application.created_at)}`}
          </p>
          {lead?.contactEmail && (
            <p className="mt-1 text-sm text-ink-600">
              <a
                href={`mailto:${lead.contactEmail}`}
                className="hover:text-brand-700 hover:underline"
              >
                {lead.contactEmail}
              </a>
            </p>
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
                <h2 className="text-base font-semibold text-ink-900">
                  Lender package
                </h2>
                <p className="mt-1 text-sm text-ink-600">
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
              <div className="mt-5 space-y-3 border-t border-ink-100 pt-4">
                {completeness.missingBySection.map((group) => (
                  <div key={group.section}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                      {group.label}
                    </h3>
                    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {group.fields.map((field) => (
                        <li key={field.key} className="text-sm text-ink-800">
                          {field.formLabel}
                          {field.conditional && (
                            <span className="ml-1 text-xs text-ink-400">
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
              <p className="mt-5 rounded-lg bg-ink-50 p-3 text-sm leading-relaxed text-ink-600">
                Collected at signing, not stored here:{" "}
                {completeness.collectedAtSigning
                  .map((f) => f.formLabel)
                  .join(", ")}
                .
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink
                href={`/admin/applications/${application.id}/print`}
                size="sm"
              >
                Open funding application
              </ButtonLink>
            </div>
          </Card>

          {/*
            Directly under the lender package, because the two answer the same
            question from different sides: the package names the fields that are
            blank, this names the paperwork that hasn't arrived. Both are reasons
            a file cannot go out.
          */}
          <DocumentsCard applicationId={application.id} />

          <Card>
            <h2 className="text-base font-semibold text-ink-900">
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
                  <dt className="text-xs uppercase tracking-wide text-ink-400">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-sm text-ink-900">{value}</dd>
                </div>
              ))}
            </dl>

            {(answers?.length ?? 0) > 0 && (
              <details className="mt-5 border-t border-ink-100 pt-4">
                <summary className="cursor-pointer text-sm font-medium text-brand-700">
                  All {answers?.length} stored answers
                </summary>
                <dl className="mt-3 space-y-2">
                  {(answers ?? []).map((answer) => (
                    <div key={answer.question_key} className="flex gap-3 text-sm">
                      <dt className="w-56 shrink-0 font-mono text-xs text-ink-500">
                        {answer.question_key}
                      </dt>
                      <dd className="text-ink-800">
                        {answer.is_pii ? (
                          <span className="text-ink-400">[redacted]</span>
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
            <h2 className="text-base font-semibold text-ink-900">
              Qualification result
            </h2>
            {!result ? (
              <p className="mt-2 text-sm text-ink-600">
                No result recorded for this application.
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm text-ink-600">
                  Outcome{" "}
                  <span className="font-medium text-ink-900">
                    {humanize(result.outcome)}
                  </span>
                  {" · engine "}
                  <span className="font-mono text-xs">{result.engine_version}</span>
                </p>

                {matches.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {matches.map((match) => (
                      <li
                        key={match.productSlug}
                        className="flex items-center justify-between gap-3 rounded-lg bg-ink-50 px-3 py-2"
                      >
                        <span className="text-sm text-ink-900">
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
                {rulesEvaluated.length > 0 && (
                  <details className="mt-5 border-t border-ink-100 pt-4">
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
                          <span className="text-ink-800">{rule.description}</span>
                          <p className="mt-0.5 font-mono text-xs text-ink-500">
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
            <h2 className="text-base font-semibold text-ink-900">Notes</h2>
            <p className="mt-1 text-sm text-ink-500">
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
                <p className="text-sm text-ink-500">No notes yet.</p>
              ) : (
                <ul className="space-y-4">
                  {(notes ?? []).map((note) => (
                    <li key={note.id} className="border-t border-ink-100 pt-4">
                      <p className="whitespace-pre-wrap text-sm text-ink-800">
                        {note.body}
                      </p>
                      <p className="mt-1.5 text-xs text-ink-500">
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
            <h2 className="text-base font-semibold text-ink-900">Move the deal</h2>
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

            <form action={assignToMe} className="mt-3">
              <input type="hidden" name="applicationId" value={application.id} />
              <Button type="submit" size="sm" variant="secondary" className="w-full">
                {application.assigned_to ? "Reassign to me" : "Assign to me"}
              </Button>
            </form>
          </Card>

          {/*
            Before dialling, the question isn't "when was this created" — it's
            "is it a reasonable hour where they are". A national pipeline means
            a 9am call from Los Angeles is 6am in New York.
          */}
          <Card>
            <h2 className="text-base font-semibold text-ink-900">
              Calling window
            </h2>
            {application.applicant_timezone ? (
              <>
                <p className="mt-3 text-sm text-ink-500">Their local time now</p>
                <p className="text-2xl font-bold tabular-nums text-ink-900">
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
                <p className="mt-3 font-mono text-xs text-ink-500">
                  {application.applicant_timezone}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-600">
                No timezone captured for this applicant.
              </p>
            )}
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-ink-900">Lead source</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Source</dt>
                <dd className="text-ink-900">{application.source ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Channel</dt>
                <dd className="text-ink-900">{application.channel ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Submitted</dt>
                <dd className="text-right text-ink-900">
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
                      <span className="block text-xs text-ink-500">
                        {local} their time
                      </span>
                    );
                  })()}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">First contact</dt>
                <dd className="text-ink-900">
                  {formatDateTime(application.first_contact_at)}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-ink-900">History</h2>
            {(history?.length ?? 0) === 0 ? (
              <p className="mt-2 text-sm text-ink-500">
                No status changes recorded yet.
              </p>
            ) : (
              <ol className="mt-3 space-y-3">
                {(history ?? []).map((entry) => (
                  <li key={entry.id} className="text-sm">
                    <p className="text-ink-900">
                      {entry.from_status
                        ? `${STATUS_LABELS[entry.from_status]} → `
                        : ""}
                      {STATUS_LABELS[entry.to_status]}
                    </p>
                    <p className="text-xs text-ink-500">
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
