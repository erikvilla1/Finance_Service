-- =============================================================================
-- 0025 — QUALIFICATION RULESET v3: THE FLOORS WE LEFT BEHIND
--
-- WHAT THIS FIXES. Migration 0017 took United Capital Source's revenue
-- multiples and their credit gates, and took neither of their volume floors.
-- The result was a ruleset that implemented half of a competitor's model and
-- called it the model:
--
--     ucs_revenue_based  ->  credit_score >= 500, and nothing else.
--
-- A business with $3,000 a month in deposits and two months of trading passed
-- that rule and was shown a modelled range. No lender in that network would
-- look at it. Because it is the lowest gate in the ruleset, it is also the rule
-- most applicants clear — so the least-underwritten rule was doing the most
-- work.
--
-- PROVENANCE — same source, same standing as 0017. UCS publish these as
-- company-wide eligibility minimums on their own application page and product
-- hub (captured 2026-08-12):
--
--     • ~$8,000 per month in business bank deposits (~$100k annually)
--     • 6+ months in business; under 3 months disqualified outright
--     • 500+ credit score, some network lenders to 475
--     • a business account at an established US bank — PayPal, Chime and
--       CashApp accounts are explicitly excluded
--
-- These are stated requirements rather than reverse-engineered ones, which puts
-- them on firmer ground than the multiples in 0017. They are still a
-- competitor's figures and still not Robert's. Everything in the 0017 header
-- about provenance applies here unchanged.
--
-- WHAT THIS DOES NOT FIX. Adding these floors does not make the model more
-- accurate — it is still one source, one sample, unvalidated. It makes the
-- model internally consistent, which is a different and smaller claim. Half of
-- a coherent model is not a conservative version of it; it is a different model
-- that nobody designed.
--
-- -----------------------------------------------------------------------------
-- WHY THERE IS NO TIME-IN-BUSINESS FLOOR HERE
--
-- UCS require 6+ months. The time_in_business enum cannot express that: its
-- lowest band is 'startup_under_1y', which spans 0 to 12 months. The two
-- available options were both wrong —
--
--   gte '1_2y'  would reject a nine-month business that UCS would fund, making
--               our model stricter than the one we are copying, in a band where
--               a large share of prequal traffic sits.
--   no floor    leaves a one-month business matching, which is the defect this
--               migration exists to close.
--
-- So the revenue floor is applied and the time floor is not. The revenue floor
-- is the stronger filter of the two anyway — a business under six months old
-- rarely clears $8,000 a month in deposits — so most of what the time gate
-- would catch is caught here regardless.
--
-- Expressing it properly needs the enum split into 'under_6m' and '6m_1y',
-- which is a schema change plus question_options plus TIME_IN_BUSINESS_ORDER
-- and TIME_IN_BUSINESS_LABELS in bands.ts, and is deliberately not bundled into
-- a ruleset migration.
-- -----------------------------------------------------------------------------
--
-- WHY ONLY TWO RULES CHANGE. ucs_revenue_based and ucs_equipment are the only
-- gates that carry no volume or history condition at all. The other four
-- already require at least a year in business on top of a higher credit score,
-- so an applicant clearing those is not the applicant this is aimed at.
-- Attaching an $8,000 floor to SBA as well would be inventing a threshold to
-- look thorough.
--
-- WHY A NEW VERSION RATHER THAN AN UPDATE. Same reason v1 was retired rather
-- than deleted: qualification_results rows record ruleset_version, and results
-- already produced were produced under v2. Editing v2 in place would silently
-- rewrite the rules that past decisions were made under.
-- =============================================================================

with universal as (
  select '{
    "placeholder": false,
    "notes": "v3 — v2 plus the UCS volume floors omitted in 0017. See migration 0025 header. Multiples and credit gates unchanged from v2; provenance per 0017.",
    "rules": [
      {
        "id": "ucs_revenue_based",
        "description": "Revenue-based financing needs a 500 credit score and at least $8,000 a month in deposits",
        "when": { "all": [
          { "field": "credit_score", "op": "gte", "value": 500 },
          { "field": "avg_monthly_revenue", "op": "gte", "value": 8000 }
        ] },
        "then": {
          "matchProducts": ["revenue-based-financing"],
          "sizeFromMonthlyRevenue": { "minMultiple": 0.5, "maxMultiple": 1.5 }
        }
      },
      {
        "id": "ucs_equipment",
        "description": "Equipment financing needs a 550 credit score and at least $8,000 a month in deposits",
        "when": { "all": [
          { "field": "credit_score", "op": "gte", "value": 550 },
          { "field": "avg_monthly_revenue", "op": "gte", "value": 8000 }
        ] },
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
  3,
  u.body,
  true,
  'v3 universal ruleset. v2 plus the UCS deposit floors omitted in 0017 — see migration 0025 header.'
from universal u
cross join (
  select unnest(enum_range(null::public.product_track)) as track
) t;

-- Retire v2. Kept, not deleted: qualification_results rows produced under it
-- record ruleset_version = 2, and the rules they were decided by have to remain
-- readable for those decisions to be auditable.
update public.qualification_rulesets
   set is_active = false
 where version = 2;
