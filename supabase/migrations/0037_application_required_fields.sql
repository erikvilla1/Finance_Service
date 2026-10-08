-- =============================================================================
-- 0037  Application form: what the client wants required (review, 10-08)
-- =============================================================================
--
-- Business: state of incorporation and start date. Financials: once a
-- bankruptcy is reported, its year and whether it was discharged (both only
-- appear after a "yes", so required-when-shown). Owner: date of birth and the
-- home address. Landlord details ask only when the premises are rented — a
-- mortgage has no landlord. And a question the lender form needs that nothing
-- asked: the desired loan amount, which the prequal captures as a range for
-- working capital, not a figure (mapping.ts routes it to
-- applications.requested_amount).
--
-- Applied to production through the Supabase connector on 2026-10-08.
-- =============================================================================

update public.application_questions
   set is_required = true
 where is_active
   and key in (
     'business_state_of_incorporation',
     'business_start_date',
     'fin_bankruptcy_year',
     'fin_bankruptcy_discharged',
     'owner_date_of_birth',
     'owner_home_address_line1',
     'owner_home_city',
     'owner_home_state',
     'owner_home_postal_code'
   );

update public.question_rules
   set description = 'Ask for landlord details only when the premises are rented',
       conditions = '{"all":[{"key":"business_premises_status","op":"eq","value":"rent"}]}'
 where name = 'landlord_details_followup';

insert into public.application_questions
  (key, module, track, label, help_text, question_type, is_required, is_pii, sort_order, validation)
select 'fin_requested_amount', 'financial_snapshot', null, 'Desired loan amount',
       'The amount you are asking for. Your best estimate is fine; it can be refined with your specialist.',
       'currency', true, false, 295, '{"min":1}'
 where not exists (select 1 from public.application_questions where key = 'fin_requested_amount');
