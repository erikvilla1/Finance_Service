-- =============================================================================
-- 0024 — THE CARD PROCESSOR QUESTION STOPS HIDING
--
-- `fin_credit_card_processor` was revealed only once `fin_avg_monthly_card_volume`
-- had a value. Both are optional, and hiding one optional field behind another
-- optional field means it is never answered: nobody volunteers a number they
-- were not asked for, so the follow-up never appears, so the processor name
-- never reaches the lender package.
--
-- The reveal was also invisible until a save, because rules were evaluated on
-- the server at page load. That part is fixed in the application code — all
-- five conditional rules now re-evaluate as the form is filled in. This
-- migration handles the separate question of whether this particular rule
-- should exist at all.
--
-- It should not. Asking "who processes your card payments?" of a business that
-- takes no cards costs them one glance and an empty field. Not asking it of a
-- business that does costs a phone call.
--
-- The other four rules are left alone. Bankruptcy year, discharge status,
-- judgment balance and existing debt balance are all follow-ups that genuinely
-- do not apply until their parent is answered yes, and asking them
-- unconditionally would read as an accusation.
--
-- Deactivated rather than deleted, per CONTRIBUTING: the row records that this
-- was once conditional, and turning it back on is a one-line change.
-- =============================================================================

update public.question_rules
   set is_active = false
 where is_active
   and effect @> '{"show_questions": ["fin_credit_card_processor"]}'::jsonb;
