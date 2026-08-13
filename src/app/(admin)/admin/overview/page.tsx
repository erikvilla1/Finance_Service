import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, Container, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import {
  STATUS_LABELS,
  SUBMITTAL_STATUSES,
  formatCurrency,
  formatDateTime,
  humanize,
  statusTone,
} from "@/lib/crm";

export const metadata: Metadata = {
  title: "Overview",
  robots: { index: false, follow: false },
};

/** Five days without a first contact. Kept out of render — see the call site. */
const STALE_AFTER_DAYS = 5;

function selectStalled<T extends { created_at: string; first_contact_at: string | null }>(
  open: T[],
): T[] {
  const now = Date.now();

  return open
    .filter((a) => {
      if (a.first_contact_at) return false;
      return (now - new Date(a.created_at).getTime()) / 86_400_000 > STALE_AFTER_DAYS;
    })
    .slice(0, 8);
}

/**
 * The whole operation on one screen.
 *
 * Platform spec §19 lists the dashboard metrics; this covers the ones the data
 * can honestly support today. Deliberately omitted: conversion and funding
 * rates, which need more than six applications before they mean anything, and
 * cost-per-acquisition, which needs ad spend the platform doesn't see.
 *
 * Leads with submittals because that is the number Robert says actually matters
 * (BUSINESS_CONTEXT §2) — everything upstream is noise until a deal is packaged
 * and sent.
 */
export default async function OverviewPage() {
  const supabase = await createClient();

  const [{ data: applications }, { data: history }, { data: staff }] =
    await Promise.all([
      supabase
        .from("applications")
        .select(
          "id, reference_code, status, track, requested_amount, financing_goal, assigned_to, created_at, first_contact_at, funded_at",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("application_status_history")
        .select("application_id, to_status, created_at")
        .order("created_at"),
      supabase.from("profiles").select("id, full_name, email, role"),
    ]);

  const all = applications ?? [];
  const staffById = new Map((staff ?? []).map((p) => [p.id, p]));

  // ---------------------------------------------------------------- metrics
  const submittals = all.filter((a) =>
    SUBMITTAL_STATUSES.includes(a.status),
  ).length;

  const funded = all.filter((a) => a.status === "funded");
  const fundedValue = funded.reduce(
    (sum, a) => sum + Number(a.requested_amount ?? 0),
    0,
  );

  const open = all.filter(
    (a) => !["funded", "closed", "withdrawn", "declined"].includes(a.status),
  );

  const unassigned = open.filter((a) => !a.assigned_to);

  const needsAction = all.filter((a) =>
    ["information_requested", "documents_requested"].includes(a.status),
  );

  // Time to first contact, in hours. Uses the stamped timestamp rather than
  // status history so a file contacted before the trigger existed still counts.
  const contacted = all.filter((a) => a.first_contact_at);
  const avgHoursToContact =
    contacted.length === 0
      ? null
      : Math.round(
          contacted.reduce((sum, a) => {
            const created = new Date(a.created_at).getTime();
            const first = new Date(a.first_contact_at!).getTime();
            return sum + (first - created) / 3_600_000;
          }, 0) / contacted.length,
        );

  // Stalled: open, untouched for more than five days. Speed to first contact is
  // what converts, so age on an untouched file is the number worth surfacing.
  //
  // Computed in a helper rather than inline: reading the clock during render
  // makes a component that returns something different every time it runs, and
  // react-hooks/purity rejects it. Behaviour is identical — the boundary just
  // sits outside the render.
  const stalled = selectStalled(open);

  const byTrack = new Map<string, number>();
  for (const a of all) {
    const key = a.track ?? "unassigned";
    byTrack.set(key, (byTrack.get(key) ?? 0) + 1);
  }

  const lastActivity = (history ?? []).at(-1);

  return (
    <Container>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink-900">
            Overview
          </h1>
          <p className="mt-1 text-ink-600">
            {lastActivity
              ? `Last pipeline activity ${formatDateTime(lastActivity.created_at)}`
              : "No pipeline activity recorded yet"}
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          Go to pipeline →
        </Link>
      </div>

      {all.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No applications yet"
            description="Once applications start arriving, this page shows volume, what's waiting on someone, and how fast files are being worked."
          />
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Submitted to a funder"
              value={submittals}
              note="the number that matters"
            />
            <Metric label="Open files" value={open.length} note="still in play" />
            <Metric
              label="Funded"
              value={funded.length}
              note={funded.length > 0 ? formatCurrency(fundedValue) : "none yet"}
            />
            <Metric
              label="Avg. time to first contact"
              value={avgHoursToContact === null ? "—" : `${avgHoursToContact}h`}
              note={
                contacted.length === 0
                  ? "no contact recorded"
                  : `across ${contacted.length} file${contacted.length === 1 ? "" : "s"}`
              }
            />
          </ul>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* -------------------------------------------- WAITING ON US */}
            <Card>
              <h2 className="text-base font-semibold text-ink-900">
                Waiting on us
              </h2>

              <div className="mt-4 space-y-4">
                <WorkRow
                  label="Unassigned"
                  count={unassigned.length}
                  hint="no specialist yet"
                  href="/admin"
                />
                <WorkRow
                  label="Never contacted, over 5 days old"
                  count={stalled.length}
                  hint="speed to contact is what converts"
                  href="/admin"
                />
                <WorkRow
                  label="Waiting on the applicant"
                  count={needsAction.length}
                  hint="documents or information requested"
                  href="/admin?status=documents_requested"
                />
              </div>

              {stalled.length > 0 && (
                <div className="mt-5 border-t border-ink-100 pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Oldest untouched
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {stalled.map((a) => (
                      <li key={a.id}>
                        <Link
                          href={`/admin/applications/${a.id}`}
                          className="flex items-center justify-between gap-3 text-sm hover:underline"
                        >
                          <span className="font-mono text-ink-500">
                            {a.reference_code}
                          </span>
                          <span className="truncate text-ink-800">
                            {a.financing_goal ?? "Application"}
                          </span>
                          <Badge tone={statusTone(a.status)}>
                            {STATUS_LABELS[a.status]}
                          </Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            {/* ------------------------------------------------- BY TRACK */}
            <Card>
              <h2 className="text-base font-semibold text-ink-900">
                Where the demand is
              </h2>
              <p className="mt-1 text-sm text-ink-600">
                Applications by underwriting track
              </p>

              <ul className="mt-4 space-y-2">
                {[...byTrack.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([track, count]) => {
                    const pct = Math.round((count / all.length) * 100);
                    return (
                      <li key={track}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-ink-800">{humanize(track)}</span>
                          <span className="tabular-nums text-ink-600">
                            {count} · {pct}%
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-ink-100">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
              </ul>

              <p className="mt-5 border-t border-ink-100 pt-4 text-sm leading-relaxed text-ink-600">
                Conversion and funding rates are deliberately not shown yet —
                with {all.length} application{all.length === 1 ? "" : "s"} they
                would be noise rather than signal.
              </p>
            </Card>
          </div>

          {/* ------------------------------------------------ WORKLOAD */}
          {staffById.size > 1 && (
            <Card className="mt-6">
              <h2 className="text-base font-semibold text-ink-900">Workload</h2>
              <ul className="mt-4 space-y-2">
                {[...staffById.values()]
                  .filter((p) => p.role !== "customer")
                  .map((person) => {
                    const count = open.filter(
                      (a) => a.assigned_to === person.id,
                    ).length;
                    return (
                      <li
                        key={person.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-ink-800">
                          {person.full_name ?? person.email}
                        </span>
                        <span className="tabular-nums text-ink-600">
                          {count} open
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </Card>
          )}
        </>
      )}
    </Container>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string;
  note?: string;
}) {
  return (
    <Card as="li">
      <p className="text-sm text-ink-600">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-ink-900">{value}</p>
      {note && <p className="mt-0.5 text-xs text-ink-500">{note}</p>}
    </Card>
  );
}

function WorkRow({
  label,
  count,
  hint,
  href,
}: {
  label: string;
  count: number;
  hint: string;
  href: string;
}) {
  return (
    <Link href={href} className="flex items-start justify-between gap-4 group">
      <div>
        <p className="text-sm font-medium text-ink-800 group-hover:text-brand-700">
          {label}
        </p>
        <p className="text-xs text-ink-500">{hint}</p>
      </div>
      <span
        className={
          count > 0
            ? "shrink-0 rounded-full bg-warning-50 px-2.5 py-1 text-sm font-semibold tabular-nums text-warning-700"
            : "shrink-0 rounded-full bg-ink-100 px-2.5 py-1 text-sm font-semibold tabular-nums text-ink-500"
        }
      >
        {count}
      </span>
    </Link>
  );
}
