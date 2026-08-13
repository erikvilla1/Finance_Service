-- =============================================================================
-- 0022 — IF THE ENGINE READS IT, THE FORM ASKS FOR IT
--
-- Migration 0016 added ten fields to the prequal and marked most of them
-- optional. Migration 0017 then wrote a ruleset that reads three of them. Those
-- two decisions were made a commit apart and never reconciled, and the result is
-- a form that can produce a materially wrong answer while looking like it
-- worked:
--
--   prequal_asset_type -> has_real_estate_asset is one of three conditions on
--     ucs_real_estate_secured. Left blank, commercial real estate cannot match.
--     An applicant who arrived through a property goal is shown a set of options
--     with the product they came for missing from it, and nothing anywhere
--     reports an error.
--
--   prequal_prior_defaults -> prior_default_status raises risk_active_default
--     and forces manual review. Left blank, an active default reaches a
--     specialist unflagged.
--
--   prequal_deposit_trend -> risk_declining_deposits, same shape of problem.
--
-- A missing input to a rules engine is not a neutral absence. It silently
-- selects the branch where the condition is false, which is indistinguishable
-- from a confident "no".
--
-- WHY REQUIRED RATHER THAN DEFAULTED. Defaulting asset_type to 'none' would make
-- the same wrong answer, just without admitting it. Every one of these three has
-- an option that is true for any applicant — "No assets to offer", "None",
-- and a deposit trend that is one of growing, seasonal or declining by
-- definition — so requiring an answer asks nobody to guess.
--
-- CONVERSION COST, ACKNOWLEDGED. Spec §8 and BUSINESS_CONTEXT §13 both say every
-- prequal field costs conversion, and this makes three optional fields
-- mandatory. Accepted deliberately: a lead that converts on an incomplete form
-- and is then shown the wrong products is worse than a lead that answered three
-- more selects. The fields the engine does not read stay optional.
-- =============================================================================

update public.application_questions
   set is_required = true
 where key in (
   'prequal_asset_type',
   'prequal_prior_defaults',
   'prequal_deposit_trend'
 )
   and module = 'prequal'
   and is_active;

-- Existing rows are untouched on purpose. Applications submitted before this
-- migration were answered honestly against the form as it stood, and
-- backfilling a value nobody supplied would put a guess where a null correctly
-- records that we never asked.
