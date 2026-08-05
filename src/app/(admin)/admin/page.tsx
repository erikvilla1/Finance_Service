import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, Container, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, ProductTrack } from "@/types/database";
import {
  GROUP_LABELS,
  STATUS_GROUP,
  STATUS_LABELS,
  STATUS_ORDER,
  SUBMITTAL_STATUSES,
  formatCurrency,
  formatDate,
  humanize,
  statusTone,
  type StatusGroup,
} from "@/lib/crm";

export const metadata: Metadata = {
  title: "Pipeline",
  robots: { index: false, follow: false },
};

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
  searchParams: Promise<{ status?: string; track?: string; q?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("applications")
    // Must stay a single string literal — postgrest infers the row type from
    // it, and a concatenated expression makes every column resolve to an error
    // type instead.
    .select(
      "id, reference_code, financing_goal, track, requested_amount, status, revenue_band, credit_band, time_in_business, industry, created_at, submitted_at",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const status = params.status as ApplicationStatus | undefined;
  if (status && STATUS_ORDER.includes(status)) {
    query = query.eq("status", status);
  }

  const track = params.track as ProductTrack | undefined;
  if (track) query = query.eq("track", track);

  const search = params.q?.trim();
  if (search) {
    query = query.or(
      `reference_code.ilike.%${search}%,industry.ilike.%${search}%,financing_goal.ilike.%${search}%`,
    );
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

  const filtered = Boolean(status || track || search);

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

      {/* Stage counts */}
      <ul className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(Object.keys(GROUP_LABELS) as StatusGroup[]).map((group) => (
          <Card as="li" key={group}>
            <p className="text-sm text-ink-600">{GROUP_LABELS[group]}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-ink-900">
              {groupCounts.get(group) ?? 0}
            </p>
          </Card>
        ))}
      </ul>

      {/* Status filter */}
      <div className="mt-8 flex flex-wrap gap-2">
        {STATUS_ORDER.filter((s) =>
          (all ?? []).some((row) => row.status === s),
        ).map((s) => (
          <Link
            key={s}
            href={`/admin?status=${s}`}
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

        {!error && (applications?.length ?? 0) === 0 && (
          <EmptyState
            title={filtered ? "No applications match this filter" : "No applications yet"}
            description={
              filtered
                ? "Try clearing the filters."
                : "Submitted applications will appear here as soon as they come in."
            }
          />
        )}

        {!error && (applications?.length ?? 0) > 0 && (
          <ul className="space-y-3">
            {(applications ?? []).map((application) => (
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
                      <h2 className="mt-1 text-base font-semibold text-ink-900">
                        {application.financing_goal ?? "Financing application"}
                      </h2>
                      <p className="mt-1 text-sm text-ink-600">
                        {formatCurrency(application.requested_amount)}
                        {application.industry ? ` · ${application.industry}` : ""}
                        {application.track ? ` · ${humanize(application.track)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge tone={statusTone(application.status)}>
                        {STATUS_LABELS[application.status]}
                      </Badge>
                      <span className="text-xs text-ink-500">
                        {formatDate(application.created_at)}
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
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}
