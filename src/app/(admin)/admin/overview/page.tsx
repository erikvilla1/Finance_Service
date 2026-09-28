import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { STATUS_GROUP, GROUP_LABELS, type StatusGroup } from "@/lib/crm";
import { OpsConsole, type Bucket, type ConsoleData } from "@/components/admin/ops-console";
import { quoteOfTheDay } from "@/lib/admin/quotes";

export const metadata: Metadata = {
  title: "Overview",
  robots: { index: false, follow: false },
};

/**
 * The dashboard, rebuilt as an operations console.
 *
 * WHAT MOVED AND WHY. This page used to repeat the pipeline's work queues —
 * the same "files to review / waiting on the applicant" counts Robert already
 * has one click away. Two screens answering the same question means two
 * screens to keep in agreement, and it made the dashboard a worse copy of the
 * pipeline rather than a different tool. The queues now live only on the
 * pipeline, which is where the work happens; this page answers the questions
 * the pipeline cannot: how much came in, how much went out, and whether that
 * is getting better or worse.
 *
 * EVERY NUMBER HERE IS COMPUTED, NONE ARE ESTIMATED. That constraint decided
 * the layout more than any design reference did:
 *
 *   - "Amount funded" is the sum of lender_submissions.offered_amount on
 *     submissions that actually funded — NOT requested_amount on applications
 *     whose status is 'funded', which is what the old version summed. Those
 *     are different numbers: what a business asked for and what a funder
 *     actually wrote are rarely equal, and reporting the first as the second
 *     overstates the book. This is the one figure Robert is most likely to
 *     quote to somebody, so it has to be the real one.
 *
 *   - "Deals won" is status 'funded'. Not 'approved' — an approval that never
 *     funds is not a deal, and counting it as one flatters the number.
 *
 *   - "Deals lost" is 'declined' plus 'withdrawn'. Withdrawn is a loss even
 *     though nobody said no: the file left without funding either way.
 *
 * THE TIME SERIES USES TWO DIFFERENT DATES on purpose. Requested is bucketed
 * by created_at (when the ask arrived) and funded by funded_at (when the money
 * landed). Bucketing both by created_at would draw a chart where a deal that
 * took ninety days to fund appears to have funded the month it came in.
 */

type Row = {
  status: string;
  requested_amount: number | string | null;
  created_at: string;
  funded_at: string | null;
};

type SubmissionRow = {
  status: string;
  offered_amount: number | string | null;
  responded_at: string | null;
};

const num = (v: number | string | null | undefined) => Number(v ?? 0) || 0;

/** "2026-09" → "SEP", "2026-Q3" → "Q3", "2026" → "2026". */
function bucketKey(d: Date, grain: "monthly" | "quarterly" | "annual") {
  const y = d.getUTCFullYear();
  if (grain === "annual") return { key: String(y), label: String(y) };
  if (grain === "quarterly") {
    const q = Math.floor(d.getUTCMonth() / 3) + 1;
    return { key: `${y}-Q${q}`, label: `Q${q} ’${String(y).slice(2)}` };
  }
  const m = d.getUTCMonth();
  const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return { key: `${y}-${String(m + 1).padStart(2, "0")}`, label: MONTHS[m] };
}

/** How many buckets of each grain are worth showing. More than this and the
 *  bars get too thin to compare, which is the only thing the chart is for. */
const SPAN: Record<"monthly" | "quarterly" | "annual", number> = {
  monthly: 12,
  quarterly: 8,
  annual: 4,
};

function series(
  rows: Row[],
  submissions: SubmissionRow[],
  grain: "monthly" | "quarterly" | "annual",
): Bucket[] {
  const acc = new Map<string, Bucket>();

  const touch = (d: Date) => {
    const { key, label } = bucketKey(d, grain);
    if (!acc.has(key)) {
      acc.set(key, { label, requested: 0, funded: 0, won: 0, lost: 0 });
    }
    return acc.get(key)!;
  };

  for (const r of rows) {
    touch(new Date(r.created_at)).requested += num(r.requested_amount);

    if (r.status === "funded" && r.funded_at) {
      touch(new Date(r.funded_at)).won += 1;
    }
    if (r.status === "declined" || r.status === "withdrawn") {
      touch(new Date(r.created_at)).lost += 1;
    }
  }

  // Funded dollars come from the lender side, keyed on when the funder
  // responded — see the note at the top of this file.
  for (const s of submissions) {
    if (s.status === "funded" && s.responded_at) {
      touch(new Date(s.responded_at)).funded += num(s.offered_amount);
    }
  }

  return [...acc.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-SPAN[grain])
    .map(([, v]) => v);
}

export default async function OverviewPage() {
  const supabase = await createClient();

  const [{ data: applications }, { data: submissions }] = await Promise.all([
    supabase
      .from("applications")
      .select("status, requested_amount, created_at, funded_at")
      .is("deleted_at", null),
    supabase
      .from("lender_submissions")
      .select("status, offered_amount, responded_at"),
  ]);

  const rows = (applications ?? []) as Row[];
  const subs = (submissions ?? []) as SubmissionRow[];

  const closedOut = ["funded", "closed", "withdrawn", "declined"];

  const data: ConsoleData = {
    quote: quoteOfTheDay(),
    monthly: series(rows, subs, "monthly"),
    quarterly: series(rows, subs, "quarterly"),
    annual: series(rows, subs, "annual"),
    totals: {
      won: rows.filter((r) => r.status === "funded").length,
      lost: rows.filter((r) => r.status === "declined" || r.status === "withdrawn").length,
      amountFunded: subs
        .filter((s) => s.status === "funded")
        .reduce((sum, s) => sum + num(s.offered_amount), 0),
      amountRequested: rows.reduce((sum, r) => sum + num(r.requested_amount), 0),
      inPipeline: rows.filter((r) => !closedOut.includes(r.status)).length,
      withLender: rows.filter((r) => r.status === "submitted_to_funder").length,
      // 'countered' is the schema's existing name for an offer that is not the
      // one asked for — which is what "conditionally approved" describes. No
      // new column was needed; the state was already being recorded.
      conditional: subs.filter((s) => s.status === "countered").length,
    },
    groups: (Object.keys(GROUP_LABELS) as StatusGroup[]).map((g) => ({
      label: GROUP_LABELS[g],
      count: rows.filter(
        (r) => STATUS_GROUP[r.status as keyof typeof STATUS_GROUP] === g,
      ).length,
    })),
  };

  return <OpsConsole data={data} />;
}
