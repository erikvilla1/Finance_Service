import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  FileText,
  MessageSquare,
  Package,
  Send,
  Users,
} from "lucide-react";
import { Badge, Card, Container, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import {
  GROUP_LABELS,
  STATUS_GROUP,
  STATUS_LABELS,
  SUBMITTAL_STATUSES,
  formatCurrency,
  formatDateTime,
  humanize,
  statusTone,
  type StatusGroup,
} from "@/lib/crm";
import { loadLeadSummaries } from "@/lib/leads";
import { loadRecentActivity, type ActivityKind } from "@/lib/admin/activity";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/** Five days without a first contact. Kept out of render — see the call site. */
const STALE_AFTER_DAYS = 5;

function selectStalled<
  T extends { created_at: string; first_contact_at: string | null },
>(open: T[]): T[] {
  const now = Date.now();

  return open
    .filter((a) => {
      if (a.first_contact_at) return false;
      return (now - new Date(a.created_at).getTime()) / 86_400_000 > STALE_AFTER_DAYS;
    })
    .slice(0, 6);
}

/**
 * The whole operation on one screen.
 *
 * Platform spec §19 lists the dashboard metrics; this covers the ones the data
 * can honestly support today. Deliberately omitted: conversion and funding
 * rates, which need more than a handful of applications before they mean
 * anything, and cost-per-acquisition, which needs ad spend the platform cannot
 * see.
 *
 * Every count here is a link into the pipeline with the matching filter. A
 * dashboard that reports "5 waiting on the applicant" and leaves you to work out
 * which five is a dashboard you read once and then go and do the real work
 * somewhere else.
 */
export default async function OverviewPage() {
  const supabase = await createClient();

  const [{ data: applications }, activity] = await Promise.all([
    supabase
      .from("applications")
      .select(
        "id, reference_code, status, track, requested_amount, financing_goal, created_at, first_contact_at, funded_at, profile_id, business_id",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
    loadRecentActivity(supabase, 10),
  ]);

  const all = applications ?? [];
  const summaries = await loadLeadSummaries(supabase, all);

  // ------------------------------------------------------------------ metrics
  const submittals = all.filter((a) => SUBMITTAL_STATUSES.includes(a.status));
  const funded = all.filter((a) => a.status === "funded");
  const fundedValue = funded.reduce(
    (sum, a) => sum + Number(a.requested_amount ?? 0),
    0,
  );

  const open = all.filter(
    (a) => !["funded", "closed", "withdrawn", "declined"].includes(a.status),
  );
  const stalled = selectStalled(open);

  const groupCounts = new Map<StatusGroup, number>();
  for (const row of all) {
    const group = STATUS_GROUP[row.status];
    groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
  }

  let awaitingReview = 0;
  let waitingOnApplicant = 0;
  let readyToPackage = 0;

  for (const summary of summaries.values()) {
    if (summary.docsAwaitingReview > 0) awaitingReview += 1;
    if (summary.docsOutstanding > 0) waitingOnApplicant += 1;
    if (
      summary.formRequired > 0 &&
      summary.formAnswered === summary.formRequired &&
      summary.docsTotal > 0 &&
      summary.docsSettled === summary.docsTotal
    ) {
      readyToPackage += 1;
    }
  }

  // What people are actually asking for. This sat as "Top Products" in the
  // layout this page was adapted from, which assumed a shop: a fixed catalogue
  // with prices. Robert does not sell products, he places deals — so the useful
  // version of that panel is which financing types the current leads want,
  // weighted by what they are asking for.
  const byTrack = new Map<string, { count: number; value: number }>();
  for (const a of all) {
    const key = a.track ?? "unassigned";
    const current = byTrack.get(key) ?? { count: 0, value: 0 };
    current.count += 1;
    current.value += Number(a.requested_amount ?? 0);
    byTrack.set(key, current);
  }

  const tracks = [...byTrack.entries()].sort((a, b) => b[1].count - a[1].count);
  const trackMax = Math.max(1, ...tracks.map(([, t]) => t.count));

  return (
    <Container>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink-900 dark:text-ink-100">
            Dashboard
          </h1>
          <p className="mt-1 text-ink-600 dark:text-ink-400">
            {all.length} {all.length === 1 ? "application" : "applications"} ·{" "}
            {submittals.length} submitted to a funder
            {funded.length > 0 && ` · ${formatCurrency(fundedValue)} funded`}
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-700 hover:underline dark:text-accent-400"
        >
          Open the pipeline <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* What is waiting on whom — the same three the pipeline leads with. */}
      <ul className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          href="/admin?needs=review"
          label="Files to review"
          value={awaitingReview}
          hint="Documents sent in and not yet looked at"
          Icon={FileText}
        />
        <StatCard
          href="/admin?needs=applicant"
          label="Waiting on the applicant"
          value={waitingOnApplicant}
          hint="Still owe us at least one document"
          Icon={Users}
        />
        <StatCard
          href="/admin?needs=package"
          label="Ready to package"
          value={readyToPackage}
          hint="Application complete, every document settled"
          Icon={Send}
        />
      </ul>

      {/* Where things sit. */}
      <ul className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(Object.keys(GROUP_LABELS) as StatusGroup[]).map((group) => (
          <li key={group}>
            <Link
              href={`/admin?group=${group}`}
              className="block rounded-card bg-white p-6 shadow-card ring-1 ring-ink-200/70 transition-all hover:shadow-card-hover hover:ring-accent-300 dark:bg-brand-900 dark:ring-brand-800 dark:hover:ring-accent-600"
            >
              <p className="text-sm text-ink-600 dark:text-ink-400">
                {GROUP_LABELS[group]}
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-ink-900 dark:text-ink-100">
                {groupCounts.get(group) ?? 0}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* --------------------------------------------------------- ACTIVITY */}
        <div className="lg:col-span-2">
          <Card>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">
                Recent activity
              </h2>
              <Link
                href="/admin"
                className="text-sm font-semibold text-accent-700 hover:underline dark:text-accent-400"
              >
                View all
              </Link>
            </div>

            {activity.length === 0 ? (
              <p className="text-sm text-ink-600 dark:text-ink-400">
                Nothing has happened yet. New applications, status changes,
                documents and notes all show up here.
              </p>
            ) : (
              <ul className="space-y-1">
                {activity.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={`/admin/applications/${entry.applicationId}`}
                      className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-ink-50 dark:hover:bg-brand-800"
                    >
                      <span className={`rounded-lg p-2 ${activityTone(entry.kind)}`}>
                        <ActivityIcon kind={entry.kind} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink-900 dark:text-ink-100">
                          {entry.title}
                        </span>
                        <span className="block truncate text-xs text-ink-500 dark:text-ink-400">
                          {entry.referenceCode ? `${entry.referenceCode} · ` : ""}
                          {entry.detail}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-ink-400 dark:text-ink-500">
                        {formatDateTime(entry.at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ----------------------------------------------- TRACKS AND STALLED */}
        <div className="space-y-6">
          <Card>
            <h2 className="mb-1 text-lg font-semibold text-ink-900 dark:text-ink-100">
              What they are asking for
            </h2>
            <p className="mb-4 text-sm text-ink-600 dark:text-ink-400">
              Financing type across every lead
            </p>

            {tracks.length === 0 ? (
              <p className="text-sm text-ink-600 dark:text-ink-400">
                No applications yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {tracks.map(([track, stats]) => (
                  <li key={track}>
                    <Link
                      href={
                        track === "unassigned" ? "/admin" : `/admin?track=${track}`
                      }
                      className="block"
                    >
                      <span className="flex items-center justify-between text-sm">
                        <span className="text-ink-700 dark:text-ink-300">
                          {track === "unassigned" ? "Not yet matched" : humanize(track)}
                        </span>
                        <span className="font-medium tabular-nums text-ink-900 dark:text-ink-100">
                          {stats.count}
                        </span>
                      </span>
                      <span className="mt-1.5 block h-2 w-full overflow-hidden rounded-full bg-ink-200 dark:bg-brand-800">
                        <span
                          className="block h-full rounded-full bg-accent-600"
                          style={{ width: `${(stats.count / trackMax) * 100}%` }}
                        />
                      </span>
                      <span className="mt-1 block text-xs text-ink-500 dark:text-ink-400">
                        {formatCurrency(stats.value)} requested
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-1 text-lg font-semibold text-ink-900 dark:text-ink-100">
              Nobody has called these
            </h2>
            <p className="mb-4 text-sm text-ink-600 dark:text-ink-400">
              Open more than {STALE_AFTER_DAYS} days with no first contact
            </p>

            {stalled.length === 0 ? (
              <p className="text-sm text-ink-600 dark:text-ink-400">
                Nothing is sitting untouched. Good.
              </p>
            ) : (
              <ul className="space-y-2">
                {stalled.map((application) => (
                  <li key={application.id}>
                    <Link
                      href={`/admin/applications/${application.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-ink-50 dark:hover:bg-brand-800"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink-900 dark:text-ink-100">
                          {summaries.get(application.id)?.businessName ??
                            summaries.get(application.id)?.contactName ??
                            application.reference_code}
                        </span>
                        <span className="block text-xs text-ink-500 dark:text-ink-400">
                          {formatCurrency(application.requested_amount)}
                        </span>
                      </span>
                      <Badge tone={statusTone(application.status)}>
                        {STATUS_LABELS[application.status]}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {all.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="No applications yet"
            description="Once someone completes the prequalification, they will appear here and in the pipeline."
          />
        </div>
      )}
    </Container>
  );
}

function StatCard({
  href,
  label,
  value,
  hint,
  Icon,
}: {
  href: string;
  label: string;
  value: number;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-card bg-white p-6 shadow-card ring-1 ring-ink-200/70 transition-all hover:shadow-card-hover hover:ring-accent-300 dark:bg-brand-900 dark:ring-brand-800 dark:hover:ring-accent-600"
      >
        <span className="mb-4 flex items-center justify-between">
          <span className="rounded-lg bg-accent-50 p-2 dark:bg-accent-600/15">
            <Icon className="h-5 w-5 text-accent-700 dark:text-accent-400" />
          </span>
        </span>
        <span className="block text-sm font-medium text-ink-600 dark:text-ink-400">
          {label}
        </span>
        <span className="mt-1 block text-3xl font-bold tabular-nums text-ink-900 dark:text-ink-100">
          {value}
        </span>
        <span className="mt-1 block text-xs text-ink-500 dark:text-ink-400">
          {hint}
        </span>
      </Link>
    </li>
  );
}

function ActivityIcon({ kind }: { kind: ActivityKind }) {
  const className = "h-4 w-4";
  switch (kind) {
    case "application":
      return <Package className={className} />;
    case "status":
      return <Activity className={className} />;
    case "document":
      return <FileText className={className} />;
    case "note":
      return <MessageSquare className={className} />;
  }
}

function activityTone(kind: ActivityKind): string {
  switch (kind) {
    case "application":
      return "bg-accent-50 text-accent-700 dark:bg-accent-600/15 dark:text-accent-400";
    case "status":
      return "bg-brand-50 text-brand-700 dark:bg-brand-800 dark:text-ink-200";
    case "document":
      return "bg-success-50 text-success-700 dark:bg-success-600/20 dark:text-success-600";
    default:
      return "bg-ink-100 text-ink-700 dark:bg-brand-800 dark:text-ink-300";
  }
}
