-- =============================================================================
-- 0015 — QUESTIONS FOR THE NEW FUNDING APPLICATION FIELDS
--
-- Configuration, not code (spec §9). Each new column from 0014 gets a question,
-- and the conditional ones only surface when they are actually relevant — the
-- form should never ask a business that owns its premises outright for a
-- landlord's phone number.
-- =============================================================================

insert into public.application_questions
  (key, module, track, label, help_text, question_type, is_required, is_pii, sort_order, validation) values
('business_preferred_contact_phone','core_business',null,'Preferred contact phone','The best number to reach you on.','phone',false,false,205,'{}'),
('business_landlord_name','core_business',null,'Landlord name',null,'text',false,false,245,'{}'),
('business_landlord_phone','core_business',null,'Landlord phone',null,'phone',false,false,246,'{}'),
('fin_credit_card_processor','financial_snapshot',null,'Credit card processor','Leave blank if you do not take card payments.','text',false,false,315,'{}'),
('fin_judgment_lien_balance','financial_snapshot',null,'Total balance of judgments or liens',null,'currency',false,false,355,'{"min":0}'),
('fin_bankruptcy_year','financial_snapshot',null,'Year of the bankruptcy filing',null,'number',false,false,365,'{"min":1900,"max":2200}'),
('owner_first_name','owner',null,'First name',null,'text',true,true,401,'{}'),
('owner_last_name','owner',null,'Last name',null,'text',true,true,402,'{}');

insert into public.question_rules (name, description, conditions, effect, priority) values
('landlord_details_followup',
 'Ask for landlord details only when the premises are rented or mortgaged',
 '{"any":[{"key":"business_premises_status","op":"eq","value":"rent"},{"key":"business_premises_status","op":"eq","value":"mortgage"}]}',
 '{"show_questions":["business_landlord_name","business_landlord_phone"]}', 10),

('judgment_balance_followup',
 'Ask for the balance only when judgments or liens were reported',
 '{"all":[{"key":"fin_open_judgments_liens","op":"eq","value":true}]}',
 '{"show_questions":["fin_judgment_lien_balance"]}', 10),

('bankruptcy_year_followup',
 'Ask for the year only when a bankruptcy was reported',
 '{"all":[{"key":"fin_has_bankruptcy","op":"eq","value":true}]}',
 '{"show_questions":["fin_bankruptcy_year"]}', 10),

('card_processor_followup',
 'Ask for the processor only when card volume was reported',
 '{"all":[{"key":"fin_avg_monthly_card_volume","op":"is_present"}]}',
 '{"show_questions":["fin_credit_card_processor"]}', 10);

-- Superseded by first/last, which is what the funding application asks for.
-- Deactivated rather than deleted so existing answers keep their question link.
update public.application_questions
   set is_active = false
 where key = 'owner_full_name';
