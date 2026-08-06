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
  CreditBand,
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

function pick<T extends string>(
  value: FormDataEntryValue | null,
  allowed: Set<string>,
): T | null {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw && allowed.has(raw) ? (raw as T) : null;
}

export async function submitPrequal(formData: FormData) {
  const goalSlug = String(formData.get("goal") ?? "");
  const goal = findGoal(goalSlug);

  const rawAmount = String(formData.get("prequal_requested_amount") ?? "").trim();
  const parsedAmount = Number(rawAmount.replace(/[^0-9.]/g, ""));
  const requestedAmount =
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : null;

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
      revenue_band: revenueBand,
      time_in_business: timeInBusiness,
      urgency,
      industry,
      applicant_timezone: applicantTimezone,
      applicant_utc_offset_minutes: applicantOffset,
      status: "draft",
      source: "website",
      channel: "prequal",
    })
    .select("id, public_token")
    .single();

  if (insertError || !application) {
    throw new Error("Could not start your application. Please try again.");
  }

  // Store the raw answers too, so the dynamic engine has them keyed by question.
  const answers = [
    ["prequal_requested_amount", requestedAmount],
    ["prequal_credit_band", creditBand],
    ["prequal_revenue_band", revenueBand],
    ["prequal_time_in_business", timeInBusiness],
    ["prequal_urgency", urgency],
    ["prequal_industry", industry],
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

  if (track) {
    const { data: rulesetRow } = await supabase
      .from("qualification_rulesets")
      .select("ruleset, version")
      .eq("track", track)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rulesetRow) {
      ruleset = rulesetRow.ruleset as unknown as Ruleset;
      rulesetVersion = rulesetRow.version;
    }
  }

  const input: QualificationInput = {
    track,
    financingGoal: goal?.slug ?? null,
    requestedAmount,
    revenueBand,
    creditBand,
    timeInBusiness,
    industry,
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
