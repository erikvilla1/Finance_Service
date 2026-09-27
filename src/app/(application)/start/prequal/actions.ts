"use server";

import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { notifyStaff } from "@/lib/email/notifications";
import { MATCH_STATE_STAFF_LABEL } from "@/lib/matching/copy";
import { match } from "@/lib/matching/engine";
import { findObjective } from "@/lib/matching/objectives";
import { questionsFor } from "@/lib/matching/questions";
import { readAnswers } from "@/lib/matching/form";
import type {
  Answers,
  FieldDef,
  MatchResult,
  MatchState,
  ObjectiveId,
} from "@/lib/matching/types";
import type {
  CreditBand,
  DepositTrend,
  PriorDefaultStatus,
  ProductTrack,
  QualificationOutcome,
  TimeInBusinessBand,
} from "@/types/database";

/**
 * Tier-one submission for the objective questionnaire (spec v1.1).
 *
 * Runs on the service role because the applicant is anonymous — there is no
 * auth.uid() to satisfy the RLS insert policy. That is deliberate: the write
 * path stays in server code we control and validate, rather than exposing
 * table-level insert to the anon role.
 *
 * STORAGE, WITHOUT A MIGRATION. The new engine's lead record (spec §13) is
 * written into the tables that already exist:
 *
 *   applications          the columns staff views and tier two already read,
 *                         mapped from the new answers where they mean the same
 *                         thing (and left null where they don't, rather than
 *                         forced into a band that would misstate them)
 *   application_answers   every answer, keyed by question id
 *   qualification_results product_matches = the customer view,
 *                         rules_evaluated = the staff view (internal routes,
 *                         metrics, evaluated objectives), engine_version "3.x"
 *
 * The result and admin pages branch on engine_version, so applications scored
 * by the previous engine still render as they did.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres unique_violation. Raised by applications_submission_token_idx. */
const UNIQUE_VIOLATION = "23505";

// -----------------------------------------------------------------------------
// Mapping onto the existing application columns
// -----------------------------------------------------------------------------

/** The underwriting track tier two loads its modules for. */
const TRACK: Record<ObjectiveId, ProductTrack | null> = {
  working_capital: "working_capital",
  equipment: "equipment",
  commercial_real_estate: "cre",
  investment_real_estate: "cre",
  business_acquisition: "sba",
  accounts_receivable: "ar_factoring",
  debt_refinance: "working_capital",
  startup: "unsecured",
  unsure: null,
};

/**
 * Only where the new band sits wholly inside an old one. "740+" spans two old
 * bands, so it is left null rather than guessed; the exact answer is in
 * application_answers either way.
 */
const CREDIT_BAND: Record<string, CreditBand> = {
  lt_500: "below_600",
  "500_549": "below_600",
  "550_599": "below_600",
  "600_619": "600_649",
  "620_649": "600_649",
  "650_679": "650_679",
  "680_699": "680_719",
  "700_719": "680_719",
  "720_739": "720_759",
  not_sure: "unknown",
};

/** Same rule: "5+ years" spans 5-10 and 10+, so it is left null. */
const TIB_BAND: Record<string, TimeInBusinessBand> = {
  startup_pre_revenue: "startup_under_1y",
  lt_3m: "startup_under_1y",
  "3_6m": "startup_under_1y",
  "6_12m": "startup_under_1y",
  "1_2y": "1_2y",
  "2_5y": "2_5y",
};

const DEPOSIT_TREND: Record<string, DepositTrend> = {
  growing: "consistent_growing",
  consistent: "consistent_growing",
  seasonal: "seasonal_irregular",
  declining: "declining",
};

/** The spec's four states onto the database's existing outcome enum. */
const OUTCOME: Record<MatchState, QualificationOutcome> = {
  strong: "potential_match",
  potential: "potential_match",
  specialist_review: "requires_review",
  no_current_match: "no_match_identified",
};

const str = (value: Answers[string]) => (typeof value === "string" ? value : null);
const num = (value: Answers[string]) => (typeof value === "number" ? value : null);
const list = (value: Answers[string]) => (Array.isArray(value) ? value : []);

function priorDefaultStatus(events: string[]): PriorDefaultStatus | null {
  if (events.length === 0) return null;
  if (events.includes("bk_active") || events.includes("current_financing_default")) {
    return "active_recent";
  }
  if (
    events.includes("bk_discharged") ||
    events.includes("prior_business_default") ||
    events.includes("foreclosure_short_sale")
  ) {
    return "discharged_resolved";
  }
  return events.length === 1 && events[0] === "none" ? "none" : null;
}

function optionLabel(fields: FieldDef[], id: string, value: Answers[string]) {
  const field = fields.find((f) => f.id === id);
  return field?.options?.find((option) => option.value === value)?.label ?? null;
}

// -----------------------------------------------------------------------------

/**
 * Validates the answers, runs the engine, stores the lead, alerts staff, and
 * returns the result page's token. Shared by the two entry points below.
 */
async function createLead(formData: FormData): Promise<string> {
  const objective = findObjective(String(formData.get("objective") ?? ""));

  // The objective arrives in a hidden field. Without one there is nothing to
  // score against, so send the applicant back to choose rather than erroring.
  if (!objective) redirect("/start");

  // Idempotency key minted by the page for this form render (migration 0018).
  // Validated rather than trusted: it arrives from the client, and a malformed
  // value must be dropped rather than sent to Postgres as a uuid.
  const tokenRaw = String(formData.get("submission_token") ?? "").trim();
  const submissionToken = UUID_PATTERN.test(tokenRaw) ? tokenRaw : null;

  const fields = questionsFor(objective.id);
  const answers = readAnswers(fields, formData);
  const result: MatchResult = match(objective.id, answers);

  // Reported by the browser. Validated rather than trusted — this arrives from
  // the client, so a bad value should be dropped, not stored.
  const timezoneRaw = String(formData.get("applicant_timezone") ?? "").trim();
  const applicantTimezone =
    timezoneRaw && /^[A-Za-z]+\/[A-Za-z_+-]+(\/[A-Za-z_+-]+)?$/.test(timezoneRaw)
      ? timezoneRaw.slice(0, 64)
      : null;

  const offsetRaw = Number(formData.get("applicant_utc_offset_minutes"));
  const applicantOffset =
    Number.isInteger(offsetRaw) && offsetRaw >= -840 && offsetRaw <= 840
      ? offsetRaw
      : null;

  const events = list(answers.credit_events);
  const bankruptcyKnown = events.length > 0 && !(events.length === 1 && events[0] === "other_not_sure");
  const hasBankruptcy = events.includes("bk_active") || events.includes("bk_discharged");
  const debtTypes = list(answers.debt_types);
  const positions = str(answers.open_positions_count);

  // The exact figure where the branch asks for one (equipment cost less the
  // down payment, the loan requested on a property, ...). Working capital and
  // startup only ask for a range, and a range is not an amount: null, with
  // the range kept in application_answers.
  const downPayment = num(answers.equipment_down_payment) ?? 0;
  const equipmentCost = num(answers.equipment_cost);
  const requestedAmount =
    (equipmentCost != null ? Math.max(equipmentCost - downPayment, 0) : null) ??
    num(answers.cre_requested_loan) ??
    num(answers.re_requested_loan) ??
    num(answers.acq_requested_financing) ??
    num(answers.ar_amount_requested) ??
    num(answers.debt_total_balance);

  const useOfFunds =
    optionLabel(fields, "use_of_funds", answers.use_of_funds) ??
    optionLabel(fields, "unsure_use", answers.unsure_use);

  const industry = str(answers.industry);

  const supabase = createServiceRoleClient();

  // ---------------------------------------------------------------------------
  // Persist the lead. This is the whole point of tier one: an owned, structured
  // record that exists whether or not the applicant finishes.
  // ---------------------------------------------------------------------------
  const { data: application, error: insertError } = await supabase
    .from("applications")
    .insert({
      financing_goal: objective.label,
      track: TRACK[objective.id],
      requested_amount: requestedAmount && requestedAmount > 0 ? requestedAmount : null,
      use_of_funds: useOfFunds,
      credit_band: CREDIT_BAND[str(answers.owner_credit_range) ?? ""] ?? null,
      time_in_business: TIB_BAND[str(answers.time_in_business) ?? ""] ?? null,
      industry: industry ? industry.slice(0, 120) : null,
      avg_monthly_revenue: num(answers.avg_monthly_revenue) ?? num(answers.ar_monthly_sales),
      deposit_trend: DEPOSIT_TREND[str(answers.deposit_trend) ?? ""] ?? null,
      existing_debt_balance:
        num(answers.current_financing_balance) ?? num(answers.debt_total_balance) ??
        (positions === "0" ? 0 : null),
      total_monthly_debt_payments:
        num(answers.monthly_debt_payments) ?? num(answers.debt_total_monthly_payment),
      prior_default_status: priorDefaultStatus(events),
      has_bankruptcy: bankruptcyKnown ? hasBankruptcy : null,
      bankruptcy_discharged: hasBankruptcy
        ? events.includes("bk_discharged") && !events.includes("bk_active")
        : null,
      has_existing_mca: debtTypes.includes("mca") ? true : positions === "0" ? false : null,
      applicant_timezone: applicantTimezone,
      applicant_utc_offset_minutes: applicantOffset,
      status: "draft",
      source: "website",
      channel: "prequal",
      submission_token: submissionToken,
    })
    .select("id, public_token")
    .single();

  // ---------------------------------------------------------------------------
  // Duplicate submission.
  //
  // A unique violation on submission_token means this exact form render has
  // already been submitted — the applicant clicked twice, the browser retried,
  // or they came back and resubmitted. The first submission won and is already
  // committed, so send them to it. Robert gets one lead instead of two.
  // ---------------------------------------------------------------------------
  if (insertError?.code === UNIQUE_VIOLATION && submissionToken) {
    const { data: existing } = await supabase
      .from("applications")
      .select("public_token")
      .eq("submission_token", submissionToken)
      .maybeSingle();

    // The result page tolerates a qualification_results row that has not
    // landed yet, so redirecting here is safe even while the first request is
    // still finishing its remaining writes.
    if (existing) return existing.public_token;
  }

  if (insertError || !application) {
    throw new Error("Could not start your application. Please try again.");
  }

  // Every answer, keyed by question id: the "universal_profile" and
  // "branch_inputs" of the spec's lead record, and what staff read.
  const answerRows = Object.entries(answers).map(([key, value]) => ({
    application_id: application.id,
    question_key: key,
    value: value as never,
    is_pii: false,
  }));
  answerRows.push({
    application_id: application.id,
    question_key: "objective",
    value: objective.id as never,
    is_pii: false,
  });
  await supabase.from("application_answers").insert(answerRows);

  // Only a documented sizing formula produces a range (spec §7), and only the
  // top product's range is summarised on the row; every product keeps its own.
  const topRange = result.productMatches.find((m) => m.estimatedRange)?.estimatedRange ?? null;

  // Written on the service role by design — a qualification result the
  // applicant could edit would be worthless as a record (spec §26).
  await supabase.from("qualification_results").insert({
    application_id: application.id,
    outcome: OUTCOME[result.overallState],
    product_matches: result.productMatches as never,
    indicative_amount_min: topRange?.min ?? null,
    indicative_amount_max: topRange?.max ?? null,
    missing_information: result.missingItems as never,
    risk_flags: [] as never,
    // Every lead is reviewed by a specialist before terms (spec §18).
    review_required: true,
    ruleset_version: null,
    rules_evaluated: {
      objectiveId: result.objectiveId,
      evaluatedObjectives: result.evaluatedObjectives,
      overallState: result.overallState,
      nextAction: result.nextAction,
      calculatedMetrics: result.calculatedMetrics,
      internalRoutes: result.internalRoutes,
    } as never,
    engine_version: result.engineVersion,
  });

  // THE EARLIEST ALERT, AND THE MOST PERISHABLE. Nobody has an account yet,
  // and plenty never will; a person who asked about financing this morning is
  // a different prospect from the same person on Thursday. Triageable from a
  // lock screen: the objective, the amount and the result are in the message.
  const amountLabel =
    requestedAmount && requestedAmount > 0
      ? `$${requestedAmount.toLocaleString("en-US")} requested`
      : optionLabel(fields, "requested_amount_range", answers.requested_amount_range) ??
        "No amount given";
  const topRoute = result.internalRoutes.find((route) => route.state !== "no_current_match");

  await notifyStaff(
    application.id,
    "New prequal submitted",
    [
      objective.label,
      amountLabel,
      `Result: ${MATCH_STATE_STAFF_LABEL[result.overallState]}`,
      topRoute ? `Top route: ${topRoute.programId}` : "No automated route",
    ].join(" · "),
  );

  return application.public_token;
}

/**
 * The form's own action: what runs when the browser posts the form natively
 * (no JavaScript), and redirects straight to the result.
 */
export async function submitPrequal(formData: FormData) {
  redirect(`/start/result/${await createLead(formData)}`);
}

/**
 * The same submission for the scripted path (PrequalStage), which returns the
 * token instead of redirecting so the page can finish its progress bar and
 * loading state before navigating, rather than being yanked away the moment
 * the server answers.
 */
export async function submitPrequalForResult(formData: FormData): Promise<{ token: string }> {
  return { token: await createLead(formData) };
}
