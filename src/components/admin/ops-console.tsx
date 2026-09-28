"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Banknote,
  CircleSlash,
  Crosshair,
  TrendingUp,
} from "lucide-react";
import { MICRO, PANEL, Panel } from "@/components/admin/console-ui";

/**
 * The operations console — Robert's dashboard.
 *
 * BUILT ON THE ADMIN SHELL'S OWN TOKENS, NOT ITS OWN PALETTE. The first
 * version of this painted itself onto a hardcoded near-black surface, which
 * looked right in isolation and wrong the moment it was mounted: a dark slab
 * inside a white sidebar and a white header, reading as two products stitched
 * together rather than one console. Everything structural here now uses the
 * same ink/brand/accent tokens the sidebar and pipeline use, so the three
 * admin screens are one skin and the theme toggle moves all of them together.
 *
 * WHAT STAYED HARDCODED, AND WHY. The three series colours and the status
 * colours below are fixed hexes on purpose: they are data encodings, not
 * chrome. They were validated against this surface — lightness band, chroma
 * floor, CVD separation, normal-vision floor, and 3:1 contrast all pass — and
 * a token that someone later retunes for the UI would quietly break that.
 *
 * Status colours are exempt from the categorical checks precisely because they
 * never travel alone: every one of them ships with an icon AND a text label
 * here, which is the required mitigation for red and green sitting close
 * together under deuteranopia.
 *
 * ONE AXIS, ALWAYS. Requested and funded are both dollars, so they share a
 * scale and belong on one chart. Deal COUNTS are a different unit and get
 * their own panel rather than a second y-axis — a dual-axis chart invites
 * exactly the false correlation this screen exists to avoid.
 */

/** Validated against the shell's dark surface — see the note above. */
const SERIES = {
  requested: "#3987e5",
  funded: "#199e70",
} as const;

const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
} as const;

export type Bucket = {
  /** "SEP", "Q3 ’26", "2026" — already formatted for the axis. */
  label: string;
  requested: number;
  funded: number;
  won: number;
  lost: number;
};

export type ConsoleData = {
  /** Picked on the server so it cannot mismatch on hydration — see quotes.ts. */
  quote: { text: string; author: string };
  monthly: Bucket[];
  quarterly: Bucket[];
  annual: Bucket[];
  totals: {
    won: number;
    lost: number;
    amountFunded: number;
    amountRequested: number;
    inPipeline: number;
    withLender: number;
    conditional: number;
  };
  groups: { label: string; count: number }[];
};

type Grain = "monthly" | "quarterly" | "annual";

const GRAIN_LABELS: Record<Grain, string> = {
  monthly: "MONTH",
  quarterly: "QUARTER",
  annual: "YEAR",
};

function money(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function Metric({
  label,
  value,
  sub,
  color,
  Icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  Icon: React.ElementType;
}) {
  return (
    <div className={`${PANEL} p-5`}>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: color }}
      />
      <div className="flex items-center gap-2">
        {/* Icon AND label, never colour alone. */}
        <Icon className="h-3.5 w-3.5" style={{ color }} strokeWidth={2} />
        <span className={MICRO}>{label}</span>
      </div>
      <p className="mt-3 font-mono text-4xl font-semibold tabular-nums text-ink-900 dark:text-ink-100">
        {value}
      </p>
      <p className="mt-1.5 text-[12px] leading-snug text-ink-500 dark:text-ink-400">
        {sub}
      </p>
    </div>
  );
}

/**
 * Grouped bars, hand-rolled in SVG.
 *
 * No charting library: two series of at most twelve buckets is a loop and a
 * rect, and recharts would be ~150KB and a new dependency to draw it. The
 * hover layer is the part that actually matters, and its hit target is a rect
 * per BUCKET rather than per bar — deliberately wider than the marks it
 * covers, so the tooltip is easy to summon.
 */
function VolumeChart({ buckets }: { buckets: Bucket[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(1, ...buckets.map((b) => Math.max(b.requested, b.funded)));
  const W = 720;
  const H = 232;
  const padB = 28;
  const padL = 52;
  // Headroom for the topmost gridline's label, which sits ON the line and was
  // clipped by the viewBox edge without it.
  const padT = 10;
  const innerW = W - padL;
  const innerH = H - padB - padT;
  const slot = innerW / Math.max(1, buckets.length);
  // 2px surface gap between adjacent fills, per the mark spec.
  const barW = Math.max(4, Math.min(56, slot / 2 - 3));

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Amount requested versus amount funded over time"
      >
        {/* Recessive grid — four lines, not ten. */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1={padL}
              x2={W}
              y1={padT + innerH - t * innerH}
              y2={padT + innerH - t * innerH}
              className="stroke-ink-200 dark:stroke-brand-800"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={padT + innerH - t * innerH + 3}
              textAnchor="end"
              className="fill-ink-500 font-mono dark:fill-ink-400"
              style={{ fontSize: 9 }}
            >
              {money(max * t)}
            </text>
          </g>
        ))}

        {buckets.map((b, i) => {
          const x = padL + i * slot;
          const rh = (b.requested / max) * innerH;
          const fh = (b.funded / max) * innerH;
          const dim = hover !== null && hover !== i;
          return (
            <g key={b.label}>
              {/* 4px rounded data-end, anchored to the baseline. */}
              <rect
                x={x + slot / 2 - barW - 2}
                y={padT + innerH - rh}
                width={barW}
                height={rh}
                rx={3}
                fill={SERIES.requested}
                opacity={dim ? 0.35 : 1}
              />
              <rect
                x={x + slot / 2 + 2}
                y={padT + innerH - fh}
                width={barW}
                height={fh}
                rx={3}
                fill={SERIES.funded}
                opacity={dim ? 0.35 : 1}
              />
              <text
                x={x + slot / 2}
                y={H - 8}
                textAnchor="middle"
                className="fill-ink-500 font-mono dark:fill-ink-400"
                style={{ fontSize: 9 }}
              >
                {b.label}
              </text>
              <rect
                x={x}
                y={0}
                width={slot}
                height={padT + innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}
      </svg>

      {hover !== null && buckets[hover] && (
        <div className="pointer-events-none absolute right-2 top-2 border border-ink-200 bg-white px-3 py-2 font-mono text-[11px] shadow-xl dark:border-brand-800 dark:bg-brand-950">
          <p className="mb-1 uppercase tracking-widest text-ink-500 dark:text-ink-400">
            {buckets[hover].label}
          </p>
          {(
            [
              ["Requested", SERIES.requested, buckets[hover].requested],
              ["Funded", SERIES.funded, buckets[hover].funded],
            ] as const
          ).map(([name, color, value]) => (
            <p
              key={name}
              className="flex items-center gap-2 text-ink-900 dark:text-ink-100"
            >
              <span
                className="inline-block h-2 w-2 rounded-[2px]"
                style={{ background: color }}
              />
              {name} <span className="tabular-nums">{money(value)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function OpsConsole({ data }: { data: ConsoleData }) {
  const [grain, setGrain] = useState<Grain>("monthly");
  const buckets = data[grain];

  const { won, lost } = useMemo(
    () =>
      buckets.reduce(
        (acc, b) => ({ won: acc.won + b.won, lost: acc.lost + b.lost }),
        { won: 0, lost: 0 },
      ),
    [buckets],
  );

  const decided = won + lost;
  const winRate = decided > 0 ? Math.round((won / decided) * 100) : null;
  const groupMax = Math.max(1, ...data.groups.map((g) => g.count));

  // Same gutter as Container, which the pipeline and lenders use — without
  // lg:px-14 the console's panels sat 32px wider than every other admin screen
  // at the width these are actually read at.
  return (
    <div className="px-6 sm:px-10 lg:px-14">
      {/* --------------------------------------------------------- GREETING */}
      {/*
        THE GOLD COMES FROM THE SITE, NOT FROM NOWHERE. accent-* is the same
        warm cream-gold the marketing hero's CTA and the prequal background
        use, so the console reads as the back office of THIS company rather
        than a generic dark admin template. It is used on chrome only —
        headings, rules, brackets, the active nav item. The series and status
        colours stay as they are: those are data encodings, validated against
        this surface, and tinting them to match a brand would break the thing
        that makes the chart readable.

        The rule below fades out rather than running edge to edge, which keeps
        it reading as a highlight under the greeting instead of a divider
        chopping the page in half.
      */}
      <header className="relative mb-8 flex flex-wrap items-end justify-between gap-4 pb-6">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-accent-600/70 via-ink-200 to-transparent dark:from-accent-400/60 dark:via-brand-800"
        />
        <div>
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-accent-700 dark:text-accent-300">
            <Activity className="h-3 w-3" strokeWidth={2} />
            FLS Operations Console
          </p>
          {/* The one place the gold is allowed to carry the type itself: a
              greeting is chrome, not data, and it is what makes the screen
              feel like an instrument someone owns. */}
          <h1 className="mt-3 bg-gradient-to-r from-ink-900 to-ink-700 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl dark:from-accent-100 dark:to-accent-400">
            Welcome back, Master Teto.
          </h1>
          <p className="mt-2 font-mono text-[12px] text-ink-500 dark:text-ink-400">
            {data.totals.inPipeline} files live · {data.totals.withLender} with a
            lender · {data.totals.conditional} awaiting your call
          </p>

          {/* The day's line. Sits under the status readout rather than in a
              panel of its own: it is a grace note, and giving it a bordered
              box would have it competing with numbers that actually need
              reading. The gold rule ties it to the header treatment above. */}
          <figure className="mt-5 flex max-w-xl gap-3">
            <span
              aria-hidden="true"
              className="w-px shrink-0 bg-gradient-to-b from-accent-600/80 to-transparent dark:from-accent-400/70"
            />
            <div>
              <blockquote className="text-[13px] italic leading-relaxed text-ink-600 dark:text-ink-300">
                “{data.quote.text}”
              </blockquote>
              <figcaption className={`mt-1.5 ${MICRO}`}>
                — {data.quote.author}
              </figcaption>
            </div>
          </figure>
        </div>

        {/* Filters in one row above the charts, per the interaction spec. */}
        <div
          className="flex border border-ink-200 dark:border-brand-800"
          role="group"
          aria-label="Time grain"
        >
          {(Object.keys(GRAIN_LABELS) as Grain[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGrain(g)}
              aria-pressed={grain === g}
              className={`px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                grain === g
                  ? "bg-accent-50 text-accent-700 dark:bg-accent-600/20 dark:text-accent-300"
                  : "text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-100"
              }`}
            >
              {GRAIN_LABELS[g]}
            </button>
          ))}
        </div>
      </header>

      {/* ---------------------------------------------------------- METRICS */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Deals won"
          value={String(won)}
          sub={winRate === null ? "No decisions yet" : `${winRate}% of decided files`}
          color={STATUS.good}
          Icon={BadgeCheck}
        />
        <Metric
          label="Deals lost"
          value={String(lost)}
          sub="Declined or withdrawn"
          color={STATUS.critical}
          Icon={CircleSlash}
        />
        <Metric
          label="Amount funded"
          value={money(data.totals.amountFunded)}
          sub="Sum of funded lender offers"
          color={SERIES.funded}
          Icon={Banknote}
        />
        <Metric
          label="Amount requested"
          value={money(data.totals.amountRequested)}
          sub="Across every live file"
          color={SERIES.requested}
          Icon={TrendingUp}
        />
      </div>

      {/* ----------------------------------------------------------- CHARTS */}
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Panel title="Requested vs funded" hint={`BY ${GRAIN_LABELS[grain]}`}>
          {/* Legend always present for two series. */}
          <div className="mb-4 flex items-center gap-5 font-mono text-[10px] uppercase tracking-widest">
            {(
              [
                ["Requested", SERIES.requested],
                ["Funded", SERIES.funded],
              ] as const
            ).map(([name, color]) => (
              <span
                key={name}
                className="flex items-center gap-2 text-ink-600 dark:text-ink-400"
              >
                <span
                  className="h-2 w-2 rounded-[2px]"
                  style={{ background: color }}
                />
                {name}
              </span>
            ))}
          </div>
          {buckets.length === 0 ? (
            <p className={`py-12 text-center ${MICRO}`}>No data in range</p>
          ) : (
            <VolumeChart buckets={buckets} />
          )}
        </Panel>

        <Panel title="Pipeline" hint="LIVE FILES">
          <ul className="space-y-3">
            {data.groups.map((g) => (
              <li key={g.label}>
                <div className="mb-1.5 flex items-baseline justify-between font-mono text-[11px]">
                  <span className="uppercase tracking-widest text-ink-500 dark:text-ink-400">
                    {g.label}
                  </span>
                  <span className="tabular-nums text-ink-900 dark:text-ink-100">
                    {g.count}
                  </span>
                </div>
                {/* Sequential magnitude: one hue, length carries the value. */}
                <div className="h-1.5 w-full bg-ink-100 dark:bg-brand-800">
                  <div
                    className="h-full rounded-r-[2px]"
                    style={{
                      width: `${(g.count / groupMax) * 100}%`,
                      background: SERIES.requested,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-start gap-2 border-t border-ink-200 pt-4 dark:border-brand-800">
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              style={{ color: STATUS.warning }}
              strokeWidth={2}
            />
            <p className="text-[12px] leading-snug text-ink-500 dark:text-ink-400">
              <span className="font-mono tabular-nums text-ink-900 dark:text-ink-100">
                {data.totals.conditional}
              </span>{" "}
              conditionally approved or countered — these need you to accept or
              decline before they move.
            </p>
          </div>
        </Panel>
      </div>

      {/* The table view for all of this is the pipeline itself — one click
          away rather than duplicated here. */}
      <p className={`mt-6 flex items-center gap-2 ${MICRO}`}>
        <Crosshair className="h-3 w-3" strokeWidth={2} />
        Work the files in Pipeline · this screen is read-only
      </p>
    </div>
  );
}
