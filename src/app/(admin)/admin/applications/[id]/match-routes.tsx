import { Badge } from "@/components/ui";
import { MATCH_STATE_STAFF_LABEL } from "@/lib/matching/copy";
import { FAMILY_COPY } from "@/lib/matching/families";
import { findObjective } from "@/lib/matching/objectives";
import { LENDERS, PROGRAMS } from "@/lib/matching/programs";
import type {
  CalculatedMetrics,
  InternalRoute,
  MatchState,
  ObjectiveId,
  ProductMatch,
} from "@/lib/matching/types";

/**
 * Staff view of a spec v1.1 result: what the customer was shown, then the
 * lender routes behind it (spec §10, §13). Lender names live here and only
 * here.
 *
 * Each route carries its source and rule confidence so a specialist can tell
 * a documented credit box from a 2020 appetite sheet before relying on it
 * (spec §11), and the rules that failed, were soft, or are still pending a
 * lender's current guide.
 */

export interface StoredMatch {
  objectiveId?: ObjectiveId;
  evaluatedObjectives?: ObjectiveId[];
  overallState?: MatchState;
  nextAction?: string;
  calculatedMetrics?: CalculatedMetrics;
  internalRoutes?: InternalRoute[];
}

const STATE_TONE: Record<MatchState, "success" | "brand" | "warning" | "neutral"> = {
  strong: "success",
  potential: "success",
  specialist_review: "warning",
  no_current_match: "neutral",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  documented: "Documented",
  confirmed_legacy: "Confirmed legacy",
  provisional: "Provisional",
  manual_only: "Manual only",
};

const LENDER_NAME = new Map(LENDERS.map((lender) => [lender.id, lender.name]));
const PROGRAM = new Map(PROGRAMS.map((program) => [program.id, program]));

const METRIC_LABEL: Record<keyof CalculatedMetrics, string> = {
  ltv: "LTV",
  ltc: "LTC",
  arvLeverage: "Loan / ARV",
  dscr: "DSCR",
  depositToCost: "Deposits / equipment cost",
};

const pct = (value: number) => `${Math.round(value * 1000) / 10}%`;

export function MatchRoutes({
  stored,
  matches,
  missing,
}: {
  stored: StoredMatch;
  matches: ProductMatch[];
  missing: string[];
}) {
  const routes = stored.internalRoutes ?? [];
  const viable = routes.filter((route) => route.state !== "no_current_match");
  const excluded = routes.filter((route) => route.state === "no_current_match");
  const metrics = Object.entries(stored.calculatedMetrics ?? {}) as [keyof CalculatedMetrics, number][];
  const inferred =
    stored.objectiveId === "unsure" && stored.evaluatedObjectives?.length
      ? stored.evaluatedObjectives.map((id) => findObjective(id)?.label ?? id).join(", ")
      : null;

  return (
    <div className="mt-4 space-y-5">
      {stored.overallState && (
        <p className="text-sm text-ink-600 dark:text-ink-300">
          Overall{" "}
          <span className="font-medium text-ink-900 dark:text-ink-100">
            {MATCH_STATE_STAFF_LABEL[stored.overallState]}
          </span>
          {inferred && (
            <>
              {" · evaluated as "}
              <span className="font-medium text-ink-900 dark:text-ink-100">{inferred}</span>
            </>
          )}
        </p>
      )}

      {matches.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            Shown to the customer
          </h3>
          <ul className="mt-2 space-y-2">
            {matches.map((match) => (
              <li
                key={match.productFamily}
                className="flex items-center justify-between gap-3 rounded-lg bg-ink-50 dark:bg-white/[0.04] px-3 py-2"
              >
                <span className="text-sm text-ink-900 dark:text-ink-100">
                  {FAMILY_COPY[match.productFamily]?.label ?? match.productFamily}
                  {!match.primary && <span className="text-ink-500 dark:text-ink-400"> · related</span>}
                </span>
                <Badge tone={STATE_TONE[match.state]}>
                  {MATCH_STATE_STAFF_LABEL[match.state]}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {metrics.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            Calculated
          </h3>
          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {metrics.map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <dt className="text-ink-500 dark:text-ink-400">{METRIC_LABEL[key] ?? key}</dt>
                <dd className="font-mono text-ink-900 dark:text-ink-100">
                  {key === "dscr" ? `${value.toFixed(2)}x` : pct(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {missing.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            Still needed
          </h3>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink-700 dark:text-ink-200">
            {missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {viable.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            Lender routes, best first
          </h3>
          <ol className="mt-2 space-y-2">
            {viable.map((route) => (
              <RouteRow key={`${route.programId}-${route.routeRank}`} route={route} />
            ))}
          </ol>
        </div>
      )}

      {excluded.length > 0 && (
        <details className="border-t border-ink-100 dark:border-white/10 pt-4">
          <summary className="cursor-pointer text-sm font-medium text-brand-700">
            Excluded — {excluded.length} route{excluded.length === 1 ? "" : "s"}
          </summary>
          <ol className="mt-3 space-y-2">
            {excluded.map((route) => (
              <RouteRow key={`${route.programId}-${route.routeRank}`} route={route} />
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

function RouteRow({ route }: { route: InternalRoute }) {
  const program = PROGRAM.get(route.programId);
  const notes = [
    ...route.failedRules.map((text) => ({ tone: "text-danger-700", text: `✕ ${text}` })),
    ...route.softFlags.map((text) => ({ tone: "text-warning-700", text: `! ${text}` })),
    ...route.pendingRules.map((text) => ({ tone: "text-ink-500 dark:text-ink-400", text: `… Pending guide: ${text}` })),
    ...route.missingInputs.map((text) => ({ tone: "text-ink-500 dark:text-ink-400", text: `? Missing: ${text}` })),
  ];

  return (
    <li className="rounded-lg border border-ink-100 dark:border-white/10 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 text-sm">
          <span className="font-mono text-xs text-ink-400 dark:text-ink-500">#{route.routeRank}</span>{" "}
          <span className="font-medium text-ink-900 dark:text-ink-100">
            {LENDER_NAME.get(route.lenderId) ?? route.lenderId}
          </span>
          <span className="text-ink-600 dark:text-ink-300">
            {" — "}
            {program?.displayNameInternal ?? route.programId}
          </span>
        </div>
        <Badge tone={STATE_TONE[route.state]}>{MATCH_STATE_STAFF_LABEL[route.state]}</Badge>
      </div>
      <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
        {FAMILY_COPY[route.productFamily]?.label ?? route.productFamily}
        {" · "}
        {CONFIDENCE_LABEL[route.confidence] ?? route.confidence}
        {program && (
          <>
            {" · "}
            {program.source.name}
            {program.source.versionDate && ` (${program.source.versionDate})`}
          </>
        )}
      </p>
      {notes.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {notes.map((note, index) => (
            <li key={index} className={`text-xs ${note.tone}`}>
              {note.text}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
