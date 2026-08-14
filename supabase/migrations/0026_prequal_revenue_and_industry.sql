-- =============================================================================
-- 0026 — ONE REVENUE QUESTION, AND AN INDUSTRY YOU CAN ACTUALLY MATCH ON
--
-- Two changes to the tier-one question set. Neither changes a single
-- qualification result: revenue_band and industry are both absent from every
-- rule in ruleset v3.
--
-- -----------------------------------------------------------------------------
-- 1. RETIRE prequal_revenue_band
--
-- The prequal asked for annual sales AND average monthly revenue. Only the
-- monthly figure is in QualificationInput, and only the monthly figure sizes
-- the ranges the engine produces — every multiple in 0017/0025 is a multiple of
-- monthly revenue. The annual band was required, stored, and read by nothing.
--
-- Worse than useless: two revenue questions are two chances to disagree. An
-- applicant reporting $500k–$1m annually and $17,500 monthly has given figures
-- that are out by a factor of three, and nothing in the system notices or
-- cares which one is true.
--
-- NOTHING IS LOST. The full application already asks fin_gross_annual_sales
-- ("Gross annual sales", required, financial_snapshot). The annual figure is
-- still collected — once, at the tier where detail belongs.
--
-- Deactivated rather than deleted: application_answers rows and the
-- applications.revenue_band column reference it on every application submitted
-- so far, and those need to stay readable.
--
-- -----------------------------------------------------------------------------
-- 2. prequal_industry BECOMES A SELECT
--
-- It was a free-text field, which is the worst shape for the one piece of
-- information lender credit boxes filter on most consistently. "Trucking",
-- "trucking co", "OTR freight" and "transportation" are four rows a rules
-- engine cannot compare, and a specialist has to read every one.
--
-- Also promoted to required. It is one click, and it is the field most likely
-- to become load-bearing the moment real lender rules land — restricted
-- industry lists are the first filter on nearly every credit box.
--
-- WHY THE OPTION VALUES ARE HUMAN-READABLE. Every other banded question here
-- stores a slug ('500k_1m', 'active_recent') because a Postgres enum or a
-- validation Set constrains it. industry has neither: the column is free text,
-- the server action only truncates it to 120 characters, and no rule reads it.
-- Storing 'transportation_trucking' would buy nothing and would show up exactly
-- like that on the admin print view, which reads app.industry directly. When a
-- rule does start matching on industry, match on these strings or add an enum
-- then — do not slugify now for a consumer that does not exist.
-- =============================================================================

update public.application_questions
   set is_active = false
 where key = 'prequal_revenue_band'
   and module = 'prequal';

-- --------------------------------------------------------------------------
-- Industry: text -> select, optional -> required
-- --------------------------------------------------------------------------

update public.application_questions
   set question_type = 'select',
       is_required   = true,
       help_text     = 'Pick the closest. It helps narrow which lenders are a fit.'
 where key = 'prequal_industry'
   and module = 'prequal';

-- Idempotent: re-running this migration must not double the option list.
delete from public.question_options
 where question_id = (
   select id from public.application_questions
    where key = 'prequal_industry' and module = 'prequal'
 );

insert into public.question_options (question_id, value, label, sort_order)
select q.id, o.value, o.value, o.sort_order
from public.application_questions q
cross join (values
  ('Construction',                      10),
  ('Trucking & Transportation',         20),
  ('Healthcare & Medical',              30),
  ('Professional Services',             40),
  ('Retail',                            50),
  ('Restaurants & Food Service',        60),
  ('Manufacturing',                     70),
  ('Wholesale & Distribution',          80),
  ('Real Estate',                       90),
  ('Automotive',                       100),
  ('Technology & Software',            110),
  ('Agriculture',                      120),
  ('Personal & Consumer Services',     130),
  ('Hospitality & Lodging',            140),
  ('Staffing & Employment',            150),
  ('Other',                            160)
) as o(value, sort_order)
where q.key = 'prequal_industry' and q.module = 'prequal';

comment on column public.applications.industry is
  'Self-reported, chosen from a fixed list (migration 0026). Stored as the display string because no enum or rule constrains it yet.';
