import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Container, EmptyState, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, ProductTrack } from "@/types/database";
import {
  GROUP_LABELS,
  STATUS_GROUP,
  STATUS_LABELS,
  STATUS_ORDER,
  SUBMITTAL_STATUSES,
  formatCurrency,
  formatDateTime,
  humanize,
  statusTone,
  type StatusGroup,
} from "@/lib/crm";
import {
  NEEDS,
  NEED_LABELS,
  findApplicationIdsByPerson,
  isNeed,
  loadLeadSummaries,
  matchesNeed,
} from "@/lib/leads";

export const metadata: Metadata = {
  title: "Pipeline",
  robots: { index: false, follow: false },
};

function isStatusGroup(value: string | undefined): value is StatusGroup {
  return value !== undefined && value in GROUP_LABELS;
}

/**
 * The pipeline list — the screen Robert opens every morning.
 *
 * Replaces the Airtable view. Ordered newest first because speed to first
 * contact is the thing that converts (BUSINESS_CONTEXT §2), and the counts
 * along the top lead with submittals — the number Robert himself says is the
 * one that matters.
 *
 * Filtering is done with links rather than client-side state so a filtered view
 * is a URL Robert can bookmark or send to Kai.
 */
export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    track?: string;
    q?: string;
    group?: string;
    needs?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("applications")
    // Must stay a single string literal — postgrest infers the row type from
    // it, and a concatenated expression makes every column resolve to an error
    // type instead.
    .select(
      "id, reference_code, financing_goal, track, requested_amount, status, revenue_band, credit_band, time_in_business, industry, created_at, submitted_at, profile_id, business_id",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const status = params.status as ApplicationStatus | undefined;
  if (status && STATUS_ORDER.includes(status)) {
    query = query.eq("status", status);
  }

  // A stage card filters to every status in its group. Done in the query rather
  // than in memory because a group is a fixed set of statuses — the database can
  // answer it, and the row cap then applies to the right hundred rows.
  const group = isStatusGroup(params.group) ? params.group : undefined;
  if (group) {
    query = query.in(
      "status",
      STATUS_ORDER.filter((s) => STATUS_GROUP[s] === group),
    );
  }

  const track = params.track as ProductTrack | undefined;
  if (track) query = query.eq("track", track);

  const search = params.q?.trim();
  if (search) {
    // Names are not on this table, so the people matching the term are resolved
    // to ids first and folded into the same filter. Without this, searching for
    // a person returns nothing — which reads as "no such lead" rather than
    // "this box doesn't search names".
    const people = await findApplicationIdsByPerson(supabase, search);

    const clauses = [
      `reference_code.ilike.%${search}%`,
      `industry.ilike.%${search}%`,
      `financing_goal.ilike.%${search}%`,
    ];

    if (people.profileIds.length) {
      clauses.push(`profile_id.in.(${people.profileIds.join(",")})`);
    }
    if (people.businessIds.length) {
      clauses.push(`business_id.in.(${people.businessIds.join(",")})`);
    }
    if (people.applicationIds.length) {
      clauses.push(`id.in.(${people.applicationIds.join(",")})`);
    }

    query = query.or(clauses.join(","));
  }

  const { data: applications, error } = await query;

  // Counts come from an unfiltered read so the header stays stable while
  // filtering. Cheap at this volume; revisit if it grows past a few thousand.
  const { data: all } = await supabase
    .from("applications")
    .select("status")
    .is("deleted_at", null);

  const groupCounts = new Map<StatusGroup, number>();
  let submittals = 0;
  for (const row of all ?? []) {
    const group = STATUS_GROUP[row.status];
    groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
    if (SUBMITTAL_STATUSES.includes(row.status)) submittals++;
  }

  // Who these people are, and what each file is still missing. One pass for the
  // whole page rather than a lookup per row.
  const summaries = await loadLeadSummaries(supabase, applications ?? []);

  // What is outstanding, as distinct from where a file sits. The stage counts
  // above answer "where is this in the pipeline"; these answer "what is it
  // waiting on", which is the question that decides who gets called today.
  const needCounts = new Map(NEEDS.map((need) => [need, 0]));
  for (const summary of summaries.values()) {
    for (const need of NEEDS) {
      if (matchesNeed(summary, need)) {
        needCounts.set(need, (needCounts.get(need) ?? 0) + 1);
      }
    }
  }

  // The `needs` filter is applied after the counts, not before, so clicking a
  // card does not change the numbers on the cards. Same behaviour as the status
  // pills, and it means you can move between them without losing your place.
  //
  // Filtered here rather than in the query because these are derived from three
  // other tables — expressing "has an unreviewed upload" as SQL against
  // `applications` is not possible without a view, and a view is a migration for
  // something the page can do in a loop.
  const needs = isNeed(params.needs) ? params.needs : undefined;
  const visible = needs
    ? (applications ?? []).filter((application) => {
        const summary = summaries.get(application.id);
        return summary ? matchesNeed(summary, needs) : false;
      })
    : (applications ?? []);

  const filtered = Boolean(status || track || search || group || needs);

  /** Preserves the filters already applied when building a card's link. */
  const linkWith = (next: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const merged = { status, track, q: search, group, needs, ...next };

    for (const [key, value] of Object.entries(merged)) {
      if (value) query.set(key, value);
    }

    const qs = query.toString();
    return qs ? `/admin?${qs}` : "/admin";
  };

  return (
    <Container>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink-900">
            Pipeline
          </h1>
          <p className="mt-1 text-ink-600">
            {all?.length ?? 0} total · {submittals} submitted to a funder
          </p>
        </div>
        {filtered && (
          <Link
            href="/admin"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            Clear filters
          </Link>
        )}
      </div>

      {/*
        A plain GET form, so a search is a URL. That is the same reasoning the
        status filters use — a view worth looking at is a view worth sending to
        someone, and it also means the back button behaves.

        The `q` parameter has been read by this page all along with nothing to
        set it: searching was possible only by editing the address bar.
      */}
      <form action="/admin" className="mt-6 flex flex-wrap gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        {track && <input type="hidden" name="track" value={track} />}
        <Input
          type="search"
          name="q"
          defaultValue={search ?? ""}
          placeholder="Search by name, business, email or reference code"
          aria-label="Search the pipeline"
          className="max-w-md flex-1"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {/*
        What is waiting on whom. Deliberately above the stage counts: a stage
        tells you where a file is, this tells you what to do about it, and only
        one of those is a morning's work.
      */}
      <ul className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {NEEDS.map((need) => {
          const active = needs === need;
          const { label, hint } = NEED_LABELS[need];

          return (
            <li key={need}>
              <Link
                // Clicking the active card clears it, so the same card is both
                // the way in and the way out.
                href={linkWith({ needs: active ? undefined : need })}
                aria-pressed={active}
                className={
                  active
                    ? "block h-full rounded-card bg-brand-700 p-6 text-white shadow-card ring-1 ring-brand-700 dark:bg-accent-700 dark:ring-accent-700"
                    : "block h-full rounded-card bg-white p-6 shadow-card ring-1 ring-ink-200/70 transition-all hover:shadow-card-hover hover:ring-brand-300 dark:bg-brand-900 dark:ring-brand-800 dark:hover:ring-accent-600"
                }
              >
                <p
                  className={
                    active
                      ? "text-sm text-brand-100"
                      : "text-sm text-ink-600 dark:text-ink-400"
                  }
                >
                  {label}
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums">
                  {needCounts.get(need) ?? 0}
                </p>
                <p
                  className={
                    active
                      ? "mt-1 text-xs text-brand-100"
                      : "mt-1 text-xs text-ink-500 dark:text-ink-400"
                  }
                >
                  {hint}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Stage counts */}
      <ul className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(Object.keys(GROUP_LABELS) as StatusGroup[]).map((stageGroup) => {
          const active = group === stageGroup;
          return (
            <li key={stageGroup}>
              <Link
                href={linkWith({
                  group: active ? undefined : stageGroup,
                  // A stage and a single status are two ways of saying the same
                  // thing, and holding both produces an empty list whenever they
                  // disagree.
                  status: undefined,
                })}
                aria-pressed={active}
                className={
                  active
                    ? "block rounded-card bg-brand-700 p-6 text-white shadow-card ring-1 ring-brand-700"
                    : "block rounded-card bg-white p-6 shadow-card ring-1 ring-ink-200/70 transition-all hover:shadow-card-hover hover:ring-brand-300"
                }
              >
                <p className={active ? "text-sm text-brand-100" : "text-sm text-ink-600"}>
                  {GROUP_LABELS[stageGroup]}
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums">
                  {groupCounts.get(stageGroup) ?? 0}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Status filter */}
      <div className="mt-8 flex flex-wrap gap-2">
        {STATUS_ORDER.filter((s) =>
          (all ?? []).some((row) => row.status === s),
        ).map((s) => (
          <Link
            key={s}
            href={linkWith({
              status: status === s ? undefined : s,
              group: undefined,
            })}
            className={
              status === s
                ? "rounded-full bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white"
                : "rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 ring-1 ring-ink-200 hover:ring-brand-300"
            }
          >
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        {error && (
          <EmptyState
            title="Couldn't load the pipeline"
            description="Try refreshing. If it persists, check the database connection."
          />
        )}

        {!error && visible.length === 0 && (
          <EmptyState
            title={filtered ? "No applications match this filter" : "No applications yet"}
            description={
              filtered
                ? "Try clearing the filters."
                : "Submitted applications will appear here as soon as they come in."
            }
          />
        )}

        {!error && visible.length > 0 && (
          <ul className="space-y-3">
            {visible.map((application) => {
              const lead = summaries.get(application.id);

              return (
              <li key={application.id}>
                <Link
                  href={`/admin/applications/${application.id}`}
                  className="block rounded-card bg-white p-5 shadow-card ring-1 ring-ink-200/70 transition-all hover:shadow-card-hover hover:ring-brand-300"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm text-ink-500">
                        {application.reference_code}
                      </p>

                      {/*
                        The person leads. A pipeline that opens with a reference
                        code is a list of applications; Robert works a list of
                        people, and he has never once known a deal by its
                        number. The business name sits alongside because it is
                        how a lender will refer to the same file.
                      */}
                      <h2 className="mt-1 text-base font-semibold text-ink-900">
                        {lead?.businessName ??
                          lead?.contactName ??
                          "Name not given yet"}
                      </h2>

                      <p className="mt-0.5 text-sm text-ink-600">
                        {[
                          lead?.businessName && lead?.contactName
                            ? lead.contactName
                            : null,
                          lead?.contactEmail,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "No contact details yet"}
                      </p>

                      <p className="mt-1.5 text-sm text-ink-600">
                        {application.financing_goal ?? "Financing application"}
                        {" · "}
                        {formatCurrency(application.requested_amount)}
                        {application.track ? ` · ${humanize(application.track)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge tone={statusTone(application.status)}>
                        {STATUS_LABELS[application.status]}
                      </Badge>
                      <span className="text-xs text-ink-500">
                        {formatDateTime(application.created_at)}
                      </span>
                    </div>
                  </div>

                  <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-ink-100 pt-3 text-xs text-ink-600">
                    <div className="flex gap-1.5">
                      <dt className="text-ink-400">Revenue</dt>
                      <dd>{humanize(application.revenue_band)}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-ink-400">Credit</dt>
                      <dd>{humanize(application.credit_band)}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-ink-400">In business</dt>
                      <dd>{humanize(application.time_in_business)}</dd>
                    </div>

                    {/*
                      Two numbers because they answer two questions. The form is
                      how far the applicant got, which decides whether to chase
                      them. The package is whether the file can go out, which
                      decides everything else — and the two differ, because the
                      form does not collect everything the funding application
                      needs.
                    */}
                    {lead && lead.formRequired > 0 && (
                      <div className="flex gap-1.5">
                        <dt className="text-ink-400">Form</dt>
                        <dd
                          className={
                            lead.formAnswered === lead.formRequired
                              ? "font-semibold text-success-700"
                              : lead.formAnswered === 0
                                ? "text-ink-500"
                                : "font-semibold text-warning-700"
                          }
                        >
                          {lead.formAnswered === 0
                            ? "Not started"
                            : `${lead.formAnswered}/${lead.formRequired}`}
                        </dd>
                      </div>
                    )}

                    {lead && lead.packageTotal > 0 && (
                      <div className="flex gap-1.5">
                        <dt className="text-ink-400">Package</dt>
                        <dd
                          className={
                            lead.packageReady
                              ? "font-semibold text-success-700"
                              : "font-semibold text-warning-700"
                          }
                        >
                          {lead.packagePresent}/{lead.packageTotal}
                        </dd>
                      </div>
                    )}

                    {lead && lead.docsTotal > 0 && (
                      <div className="flex gap-1.5">
                        <dt className="text-ink-400">Documents</dt>
                        <dd
                          className={
                            lead.docsSettled === lead.docsTotal
                              ? "font-semibold text-success-700"
                              : "font-semibold text-warning-700"
                          }
                        >
                          {lead.docsSettled}/{lead.docsTotal}
                          {lead.docsAwaitingReview > 0
                            ? ` · ${lead.docsAwaitingReview} to review`
                            : ""}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {/*
                    A file at 31 of 33 is nearly done, and the number alone does
                    not say whether the two gaps are a middle initial or the
                    whole ownership section. Named here so the decision to chase
                    can be made from the list rather than by opening every row.

                    Capped at four: past that it is a form to fill in, not a gap
                    to mention on a phone call.
                  */}
                  {lead && lead.packageMissing.length > 0 && (
                    <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
                      <span className="text-ink-400 dark:text-ink-500">
                        Package still needs{" "}
                      </span>
                      {lead.packageMissing.slice(0, 4).join(", ")}
                      {lead.packageMissing.length > 4 &&
                        ` and ${lead.packageMissing.length - 4} more`}
                    </p>
                  )}
                </Link>
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </Container>
  );
}
