-- =============================================================================
-- 0017 — QUALIFICATION RULESET v2
--
-- ⚠️  PROVENANCE — READ BEFORE CHANGING ANY NUMBER IN THIS FILE
--
-- These thresholds and multiples are NOT Robert's. They were reverse-engineered
-- from a single worked example on a competitor's public referral-partner
-- qualification tool (United Capital Source, captured 2026-08-03), where a
-- business with $138,000 average monthly revenue and a 630 credit score
-- produced these exact ranges:
--
--     Revenue-based / MCA   $69,000 – $207,000     =  0.5x – 1.5x monthly revenue
--     Term loan            $138,000 – $414,000     =  1.0x – 3.0x
--     Line of credit        $69,000 – $276,000     =  0.5x – 2.0x
--     Equipment             $41,400 – $165,600     =  0.3x – 1.2x
--     SBA                  $414,000 – $1,104,000   =  3.0x – 8.0x
--
-- The credit gates are stated on that form directly: 500+ MCA, 550+ equipment,
-- 620+ LOC and real estate, 650+ SBA; 600+ for term loans appears in the result
-- copy. Time-in-business minimums likewise come from the result copy.
--
-- INFERRED, NOT OBSERVED — flagged so nobody mistakes them for evidence:
--   • The real-estate-secured multiple (3.0x – 8.0x) was never displayed; the
--     sample failed that product for want of a listed asset. It is assumed
--     equal to SBA because both are collateral-backed.
--   • The SBA time-in-business minimum (2-5 years) is not on the form. It comes
--     from BUSINESS_CONTEXT §5.1, which is itself marked UNVERIFIED.
--
-- CONSEQUENCE: every figure this ruleset produces is a modelled estimate built
-- on a competitor's undisclosed formula. The result page labels it illustrative
-- and review_required stays hard-coded true in the engine. Replace this file
-- wholesale once Robert supplies his own numbers — do not incrementally tune it
-- and thereby lose track of which numbers are his and which are inferred.
--
-- Superseding v1: the version-1 rulesets are placeholders with zero rules and
-- are left in place, inactive, as a record.
-- =============================================================================

-- The rules are product-scoped, not track-scoped: a business asking about
-- equipment should still be told it may qualify for a line of credit, which is
-- what the referral-partner tool does. The same universal ruleset is therefore
-- written to every track, and the engine no longer filters candidates by track.
-- qualification_rulesets.track is NOT NULL, so "universal" is expressed as
-- "identical across all tracks" rather than as a null row.

with universal as (
  select '{
    "placeholder": false,
    "notes": "v2 — derived from the United Capital Source referral-partner tool, 2026-08-03. See migration 0017 header for provenance and inferred values.",
    "rules": [
      {
        "id": "ucs_revenue_based",
        "description": "Revenue-based financing is available from a 500 credit score",
        "when": { "all": [ { "field": "credit_score", "op": "gte", "value": 500 } ] },
        "then": {
          "matchProducts": ["revenue-based-financing"],
          "sizeFromMonthlyRevenue": { "minMultiple": 0.5, "maxMultiple": 1.5 }
        }
      },
      {
        "id": "ucs_equipment",
        "description": "Equipment financing is available from a 550 credit score",
        "when": { "all": [ { "field": "credit_score", "op": "gte", "value": 550 } ] },
        "then": {
          "matchProducts": ["equipment-leasing"],
          "sizeFromMonthlyRevenue": { "minMultiple": 0.3, "maxMultiple": 1.2 }
        }
      },
      {
        "id": "ucs_term_loan",
        "description": "Term loans need a 600 credit score and at least a year in business",
        "when": { "all": [
          { "field": "credit_score", "op": "gte", "value": 600 },
          { "field": "time_in_business", "op": "gte", "value": "1_2y" }
        ] },
        "then": {
          "matchProducts": ["unsecured-term-loans"],
          "sizeFromMonthlyRevenue": { "minMultiple": 1.0, "maxMultiple": 3.0 }
        }
      },
      {
        "id": "ucs_line_of_credit",
        "description": "Lines of credit need a 620 credit score and at least a year in business",
        "when": { "all": [
          { "field": "credit_score", "op": "gte", "value": 620 },
          { "field": "time_in_business", "op": "gte", "value": "1_2y" }
        ] },
        "then": {
          "matchProducts": ["unsecured-credit-lines"],
          "sizeFromMonthlyRevenue": { "minMultiple": 0.5, "maxMultiple": 2.0 }
        }
      },
      {
        "id": "ucs_real_estate_secured",
        "description": "Real-estate-secured lending needs a 620 credit score, a year in business, and real property to pledge",
        "when": { "all": [
          { "field": "credit_score", "op": "gte", "value": 620 },
          { "field": "time_in_business", "op": "gte", "value": "1_2y" },
          { "field": "has_real_estate_asset", "op": "eq", "value": true }
        ] },
        "then": {
          "matchProducts": ["commercial-real-estate-financing"],
          "sizeFromMonthlyRevenue": { "minMultiple": 3.0, "maxMultiple": 8.0 }
        }
      },
      {
        "id": "ucs_sba",
        "description": "SBA lending needs a 650 credit score and an established operating history",
        "when": { "all": [
          { "field": "credit_score", "op": "gte", "value": 650 },
          { "field": "time_in_business", "op": "gte", "value": "2_5y" }
        ] },
        "then": {
          "matchProducts": ["sba-loan-program"],
          "sizeFromMonthlyRevenue": { "minMultiple": 3.0, "maxMultiple": 8.0 }
        }
      },
      {
        "id": "risk_declining_deposits",
        "description": "Declining deposits over the trailing three months",
        "when": { "all": [ { "field": "deposit_trend", "op": "eq", "value": "declining" } ] },
        "then": { "riskFlags": ["declining_deposits"], "forceReview": true }
      },
      {
        "id": "risk_active_default",
        "description": "An active or recent default or bankruptcy",
        "when": { "all": [ { "field": "prior_default_status", "op": "eq", "value": "active_recent" } ] },
        "then": { "riskFlags": ["active_default_or_bankruptcy"], "forceReview": true }
      },
      {
        "id": "info_missing_revenue",
        "description": "Average monthly revenue is required to size any range",
        "when": { "all": [ { "field": "avg_monthly_revenue", "op": "is_absent" } ] },
        "then": { "requireInformation": ["avg_monthly_revenue"], "forceReview": true }
      },
      {
        "id": "info_missing_credit_score",
        "description": "A credit score is required to assess eligibility",
        "when": { "all": [ { "field": "credit_score", "op": "is_absent" } ] },
        "then": { "requireInformation": ["credit_score"], "forceReview": true }
      }
    ]
  }'::jsonb as body
)
insert into public.qualification_rulesets (track, version, ruleset, is_active, notes)
select
  t.track,
  2,
  u.body,
  true,
  'v2 universal ruleset. Numbers reverse-engineered from a competitor tool, not supplied by Robert — see migration 0017 header.'
from universal u
cross join (
  select unnest(enum_range(null::public.product_track)) as track
) t;

-- Retire v1. Kept for the record rather than deleted: it documents that the
-- engine deliberately refused to produce matches before real rules existed.
update public.qualification_rulesets
   set is_active = false
 where version = 1;

comment on table public.qualification_rulesets is
  'Versioned prequal thresholds. v2 figures are modelled from a competitor tool and are illustrative only — never present them as FLS terms without Robert''s confirmation.';
