"use server";

import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { evaluate, ENGINE_VERSION } from "@/lib/qualification/engine";
import type {
  CandidateProduct,
  QualificationInput,
  Ruleset,
} from "@/lib/qualification/types";
import { findGoal } from "@/lib/products/goals";
import type {
  BusinessAssetType,
  CreditBand,
  DepositTrend,
  PriorDefaultStatus,
  ProductTrack,
  RevenueBand,
  TimeInBusinessBand,
  UrgencyBand,
} from "@/types/database";

/**
 * Tier-one prequalification submission.
 *
 * Runs on the service role because the applicant is anonymous — there is no
 * auth.uid() to satisfy the RLS insert policy. That is deliberate: the write
 * path stays in server code we control and validate, rather than exposing
 * table-level insert to the anon role.
 *
 * Everything collected here is banded and non-PII (spec §8 STEP 6). Name,
 * address, SSN, and financial detail come later, after the applicant has seen
 * a reason to keep going.
 */

const CREDIT_BANDS = new Set([
  "below_600", "600_649", "650_679", "680_719", "720_759", "760_plus", "unknown",
]);
const REVENUE_BANDS = new Set([
  "under_100k", "100k_250k", "250k_500k", "500k_1m", "1m_5m", "5m_plus", "unknown",
]);
const TIB_BANDS = new Set([
  "startup_under_1y", "1_2y", "2_5y", "5_10y", "10y_plus",
]);
const URGENCY_BANDS = new Set([
  "immediately", "within_30_days", "within_90_days", "just_exploring",
]);
const DEPOSIT_TRENDS = new Set([
  "consistent_growing", "declining", "seasonal_irregular",
]);
const PRIOR_DEFAULT_STATUSES = new Set([
  "none", "discharged_resolved", "active_recent",
]);
const ASSET_TYPES = new Set([
  "none", "real_estate", "equipment", "vehicles", "inventory", "receivables",
  "other",
]);

function pick<T extends string>(
  value: FormDataEntryValue | null,
  allowed: Set<string>,
): T | null {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw && allowed.has(raw) ? (raw as T) : null;
}

/**
 * Currency and number fields, parsed defensively.
 *
 * Strips formatting the applicant may have typed ("$138,000") and rejects
 * anything that isn't a finite non-negative number. Returns null rather than
 * 0 for absent input — 0 is a meaningful answer for a debt balance and must not
 * be manufactured from a blank field.
 */
function parseAmount(value: FormDataEntryValue | null): number | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  const parsed = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Credit score, constrained to the FICO range.
 *
 * Out-of-range values are dropped rather than clamped: a 63 is far more likely
 * to be a typo than a real 630, and silently promoting it would change which
 * products the applicant is shown.
 */
function parseCreditScore(value: FormDataEntryValue | null): number | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  const parsed = Number(raw.replace(/[^0-9]/g, ""));
  if (!Number.isInteger(parsed)) return null;
  return parsed >= 300 && parsed <= 850 ? parsed : null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres unique_violation. Raised by applications_submission_token_idx. */
const UNIQUE_VIOLATION = "23505";

export async function submitPrequal(formData: FormData) {
  const goalSlug = String(formData.get("goal") ?? "");
  const goal = findGoal(goalSlug);

  // Idempotency key minted by the page for this form render (migration 0018).
  // Validated rather than trusted: it arrives from the client, and a malformed
  // value must be dropped rather than sent to Postgres as a uuid.
  const tokenRaw = String(formData.get("submission_token") ?? "").trim();
  const submissionToken = UUID_PATTERN.test(tokenRaw) ? tokenRaw : null;

  const rawAmount = String(formData.get("prequal_requested_amount") ?? "").trim();
  const parsedAmount = Number(rawAmount.replace(/[^0-9.]/g, ""));
  const requestedAmount =
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : null;

  // Retained for applications submitted before migration 0016 replaced the
  // banded question with an exact score. New submissions leave this null and
  // the database trigger derives the band from the score instead.
  const creditBand = pick<CreditBand>(
    formData.get("prequal_credit_band"), CREDIT_BANDS);
  const revenueBand = pick<RevenueBand>(
    formData.get("prequal_revenue_band"), REVENUE_BANDS);
  const timeInBusiness = pick<TimeInBusinessBand>(
    formData.get("prequal_time_in_business"), TIB_BANDS);
  const urgency = pick<UrgencyBand>(
    formData.get("prequal_urgency"), URGENCY_BANDS);

  const industryRaw = String(formData.get("prequal_industry") ?? "").trim();
  const industry = industryRaw ? industryRaw.slice(0, 120) : null;

  // --- Business profile -------------------------------------------------------
  const legalNameRaw = String(
    formData.get("prequal_legal_business_name") ?? "").trim();
  const legalBusinessName = legalNameRaw ? legalNameRaw.slice(0, 200) : null;
  const creditScore = parseCreditScore(formData.get("prequal_credit_score"));

  // --- Revenue ----------------------------------------------------------------
  const avgMonthlyRevenue = parseAmount(
    formData.get("prequal_avg_monthly_revenue"));
  const depositTrend = pick<DepositTrend>(
    formData.get("prequal_deposit_trend"), DEPOSIT_TRENDS);

  // --- Existing obligations ---------------------------------------------------
  const existingBalance = parseAmount(formData.get("prequal_existing_balance"));
  const monthlyDebtPayments = parseAmount(
    formData.get("prequal_monthly_debt_payments"));
  const priorDefaultStatus = pick<PriorDefaultStatus>(
    formData.get("prequal_prior_defaults"), PRIOR_DEFAULT_STATUSES);

  // --- Current assets ---------------------------------------------------------
  const assetType = pick<BusinessAssetType>(
    formData.get("prequal_asset_type"), ASSET_TYPES);
  const assetValue = parseAmount(formData.get("prequal_asset_value"));
  const assetDebt = parseAmount(formData.get("prequal_asset_debt"));
  const hasRealEstateAsset = assetType === "real_estate";

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

  const track: ProductTrack | null = goal?.likelyTrack ?? null;

  const supabase = createServiceRoleClient();

  // ---------------------------------------------------------------------------
  // Persist the lead. This is the whole point of tier one: an owned, structured
  // record that exists whether or not the applicant finishes.
  // ---------------------------------------------------------------------------
  const { data: application, error: insertError } = await supabase
    .from("applications")
    .insert({
      financing_goal: goal?.label ?? null,
      track,
      requested_amount: requestedAmount,
      credit_band: creditBand,
      owner_credit_score: creditScore,
      revenue_band: revenueBand,
      time_in_business: timeInBusiness,
      urgency,
      industry,
      avg_monthly_revenue: avgMonthlyRevenue,
      deposit_trend: depositTrend,
      existing_debt_balance: existingBalance,
      total_monthly_debt_payments: monthlyDebtPayments,
      prior_default_status: priorDefaultStatus,
      // Derived rather than asked twice: the applicant already told us their
      // prior-default status, so re-asking "any bankruptcies?" on the full
      // application would be a second chance to contradict themselves.
      has_bankruptcy:
        priorDefaultStatus == null ? null : priorDefaultStatus !== "none",
      bankruptcy_discharged:
        priorDefaultStatus == null
          ? null
          : priorDefaultStatus === "discharged_resolved",
      has_existing_mca:
        existingBalance == null ? null : existingBalance > 0,
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
  // committed: Postgres blocks the second insert on the index until the first
  // transaction commits, so by the time this error surfaces the row it conflicts
  // with is readable.
  //
  // Send them to that application rather than surfacing an error. From where the
  // applicant is standing, they asked for their options twice and got them —
  // which is the correct outcome. Robert gets one lead instead of two.
  // ---------------------------------------------------------------------------
  if (insertError?.code === UNIQUE_VIOLATION && submissionToken) {
    const { data: existing } = await supabase
      .from("applications")
      .select("public_token")
      .eq("submission_token", submissionToken)
      .maybeSingle();

    // The result page tolerates a qualification_results row that has not landed
    // yet — it renders the "a specialist will review this" state rather than
    // failing — so redirecting here is safe even while the first request is
    // still finishing its remaining writes.
    if (existing) redirect(`/start/result/${existing.public_token}`);
  }

  if (insertError || !application) {
    throw new Error("Could not start your application. Please try again.");
  }

  // The asset row is only worth writing when something was actually offered.
  // "none" is a real answer, but it does not describe an asset, so it belongs
  // on the application rather than in a table of assets.
  if (assetType && assetType !== "none") {
    await supabase.from("business_assets").insert({
      application_id: application.id,
      asset_type: assetType,
      estimated_value: assetValue,
      debt_owed: assetDebt,
      position: 1,
    });
  }

  // Store the raw answers too, so the dynamic engine has them keyed by question.
  const answers = [
    ["prequal_requested_amount", requestedAmount],
    ["prequal_legal_business_name", legalBusinessName],
    ["prequal_credit_score", creditScore],
    ["prequal_revenue_band", revenueBand],
    ["prequal_time_in_business", timeInBusiness],
    ["prequal_urgency", urgency],
    ["prequal_industry", industry],
    ["prequal_avg_monthly_revenue", avgMonthlyRevenue],
    ["prequal_deposit_trend", depositTrend],
    ["prequal_existing_balance", existingBalance],
    ["prequal_monthly_debt_payments", monthlyDebtPayments],
    ["prequal_prior_defaults", priorDefaultStatus],
    ["prequal_asset_type", assetType],
    ["prequal_asset_value", assetValue],
    ["prequal_asset_debt", assetDebt],
  ] as const;

  await supabase.from("application_answers").insert(
    answers
      .filter(([, value]) => value !== null)
      .map(([key, value]) => ({
        application_id: application.id,
        question_key: key,
        value: value as never,
        is_pii: false,
      })),
  );

  // ---------------------------------------------------------------------------
  // Run the engine.
  // ---------------------------------------------------------------------------
  const { data: productRows } = await supabase
    .from("financing_products")
    .select("slug, name, track, amount_min, amount_max, min_fico, terms_verified")
    .is("deleted_at", null);

  const candidates: CandidateProduct[] = (productRows ?? []).map((row) => ({
    slug: row.slug,
    name: row.name,
    track: row.track,
    amountMin: row.amount_min,
    amountMax: row.amount_max,
    minFico: row.min_fico,
    termsVerified: row.terms_verified,
  }));

  let ruleset: Ruleset | null = null;
  let rulesetVersion: number | null = null;

  // The v2 ruleset is universal — the same rules are written to every track,
  // because eligibility is a property of the product, not of the goal the
  // applicant happened to click. The track only decides which row we read, so
  // an applicant who picked "I'm not sure" (track null) still gets rules rather
  // than falling through to a blanket review.
  const rulesetTrack: ProductTrack = track ?? "working_capital";

  const { data: rulesetRow } = await supabase
    .from("qualification_rulesets")
    .select("ruleset, version")
    .eq("track", rulesetTrack)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (rulesetRow) {
    ruleset = rulesetRow.ruleset as unknown as Ruleset;
    rulesetVersion = rulesetRow.version;
  }

  const input: QualificationInput = {
    track,
    financingGoal: goal?.slug ?? null,
    requestedAmount,
    revenueBand,
    creditBand,
    creditScore,
    timeInBusiness,
    industry,
    avgMonthlyRevenue,
    depositTrend,
    priorDefaultStatus,
    hasRealEstateAsset,
  };

  const result = evaluate(input, candidates, ruleset, rulesetVersion);

  // Written on the service role by design — a qualification result the
  // applicant could edit would be worthless as a record (spec §26).
  await supabase.from("qualification_results").insert({
    application_id: application.id,
    outcome: result.outcome,
    product_matches: result.productMatches as never,
    indicative_amount_min: result.indicativeAmountMin,
    indicative_amount_max: result.indicativeAmountMax,
    missing_information: result.missingInformation as never,
    risk_flags: result.riskFlags as never,
    review_required: result.reviewRequired,
    ruleset_version: result.rulesetVersion,
    rules_evaluated: result.rulesEvaluated as never,
    engine_version: ENGINE_VERSION,
  });

  redirect(`/start/result/${application.public_token}`);
}
