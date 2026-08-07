-- =============================================================================
-- 0016 — PREQUAL: FUNDING-APPLICATION FIELDS
--
-- Adds the four sections the referral-partner qualification form collects:
-- business profile, revenue, existing obligations, and current assets.
--
-- Two deliberate departures from earlier decisions, both made knowingly:
--
--  1. EXACT CREDIT SCORE. Migration 0003 and spec §8 STEP 6 chose banded credit
--     on conversion grounds. The prequal engine now gates on thresholds that do
--     not align to band boundaries (500 / 550 / 600 / 620 / 650), and a band
--     cannot answer "is this 620 or more" without discarding half its range.
--     applications.credit_band is RETAINED and kept in sync by trigger, so the
--     CRM views and any downstream consumer reading credit_band keep working.
--
--  2. OBLIGATIONS REUSE 0014. existing_debts already models one row per
--     obligation. This migration does NOT create a second debt table; it adds
--     only the two aggregate figures the prequal form asks for up front.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

-- Direction of deposits over the trailing three months. Used as a risk signal,
-- never as a sole disqualifier.
create type public.deposit_trend as enum (
  'consistent_growing',
  'declining',
  'seasonal_irregular'
);

-- Prior credit events. Three states, matching the funding application.
create type public.prior_default_status as enum (
  'none',
  'discharged_resolved',
  'active_recent'
);

-- Asset classes that matter for secured-product eligibility. 'none' is a real
-- answer, not an absence — it tells the engine the applicant was asked.
create type public.business_asset_type as enum (
  'none',
  'real_estate',
  'equipment',
  'vehicles',
  'inventory',
  'receivables',
  'other'
);

-- -----------------------------------------------------------------------------
-- APPLICATIONS — new prequal columns
-- -----------------------------------------------------------------------------

alter table public.applications
  add column owner_credit_score      integer,
  add column avg_monthly_revenue     numeric(14, 2),
  add column deposit_trend           public.deposit_trend,
  add column total_monthly_debt_payments numeric(14, 2),
  add column prior_default_status    public.prior_default_status;

-- A FICO-range score or nothing. Rejects transcription errors (a 63 or a 6300)
-- before they reach the engine and silently change an eligibility decision.
alter table public.applications
  add constraint owner_credit_score_in_fico_range
  check (owner_credit_score is null
         or (owner_credit_score between 300 and 850));

alter table public.applications
  add constraint avg_monthly_revenue_is_not_negative
  check (avg_monthly_revenue is null or avg_monthly_revenue >= 0);

alter table public.applications
  add constraint total_monthly_debt_payments_is_not_negative
  check (total_monthly_debt_payments is null or total_monthly_debt_payments >= 0);

comment on column public.applications.owner_credit_score is
  'Exact self-reported score. Authoritative for qualification. credit_band is derived from this by trigger and retained for existing consumers.';

comment on column public.applications.avg_monthly_revenue is
  'Self-reported average monthly revenue. Sizes every indicative range the engine produces.';

comment on column public.applications.total_monthly_debt_payments is
  'Aggregate figure asked at prequal. The itemised schedule lives in existing_debts (migration 0014).';

-- -----------------------------------------------------------------------------
-- CREDIT BAND DERIVATION
--
-- A trigger rather than application code, so the invariant holds no matter what
-- writes the row — server action, Erik's webhook, an admin edit, or a backfill.
-- Only fires when a score is present; an application that supplied a band and
-- no score keeps the band it was given.
-- -----------------------------------------------------------------------------

create or replace function public.derive_credit_band()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.owner_credit_score is null then
    return new;
  end if;

  new.credit_band := case
    when new.owner_credit_score >= 760 then '760_plus'
    when new.owner_credit_score >= 720 then '720_759'
    when new.owner_credit_score >= 680 then '680_719'
    when new.owner_credit_score >= 650 then '650_679'
    when new.owner_credit_score >= 600 then '600_649'
    else 'below_600'
  end::public.credit_band;

  return new;
end;
$$;

create trigger derive_credit_band_from_score
  before insert or update of owner_credit_score on public.applications
  for each row execute function public.derive_credit_band();

comment on function public.derive_credit_band() is
  'Keeps applications.credit_band consistent with owner_credit_score so consumers written against the banded column continue to work.';

-- -----------------------------------------------------------------------------
-- BUSINESS ASSETS — one row per asset
--
-- Modelled as a child table because the funding form is repeatable ("+ ADD
-- ASSET"). The prequal step collects a single row today; nothing here has to
-- change when the full application collects several.
-- -----------------------------------------------------------------------------

create table public.business_assets (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,

  asset_type     public.business_asset_type not null,
  description    text,
  estimated_value numeric(14, 2),
  debt_owed      numeric(14, 2),

  position       integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint business_asset_value_is_not_negative
    check (estimated_value is null or estimated_value >= 0),
  constraint business_asset_debt_is_not_negative
    check (debt_owed is null or debt_owed >= 0)
);

create index business_assets_app_idx on public.business_assets(application_id);

comment on table public.business_assets is
  'Collateral offered, one row per asset. Gates secured-product eligibility. Equity is estimated_value minus debt_owed; neither is verified at prequal.';

-- -----------------------------------------------------------------------------
-- RLS — mirrors existing_debts (0014) exactly.
--
-- Reads: the owning applicant or any staff member.
-- Writes: the owning applicant while the application is still a draft, or staff.
-- Anonymous prequal writes arrive on the service role, which bypasses RLS, so
-- no anon policy is needed or wanted here.
-- -----------------------------------------------------------------------------

alter table public.business_assets enable row level security;

create policy "users read own assets" on public.business_assets
  for select using (exists (select 1 from public.applications a
    where a.id = application_id and (a.profile_id = (select auth.uid()) or (select public.is_staff()))));

create policy "users write own assets" on public.business_assets
  for insert with check (exists (select 1 from public.applications a
    where a.id = application_id and ((a.profile_id = (select auth.uid()) and a.status = 'draft') or (select public.is_staff()))));

create policy "users update own assets" on public.business_assets
  for update using (exists (select 1 from public.applications a
    where a.id = application_id and ((a.profile_id = (select auth.uid()) and a.status = 'draft') or (select public.is_staff()))));

create trigger set_updated_at before update on public.business_assets
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- QUESTIONS — the four sections, rendered from configuration.
--
-- The prequal page reads these rows, so adding them is what puts the fields on
-- the form. No component change is required.
--
-- NOTE ON FORM LENGTH: this takes tier one from 6 questions to 15. That is a
-- real conversion cost on a lead-capture surface and was accepted deliberately
-- to match the referral-partner form. If prequal completion drops, the first
-- thing to try is moving the asset and obligation blocks behind the result.
-- -----------------------------------------------------------------------------

insert into public.application_questions
  (key, module, track, label, help_text, question_type, is_required, is_pii, sort_order, validation) values

-- BUSINESS PROFILE
('prequal_legal_business_name','prequal',null,'Legal business name',null,'text',false,false,5,'{}'),
('prequal_credit_score','prequal',null,'Owner credit score','An estimate is fine. Checking this does not affect your credit.','number',true,false,45,'{"min":300,"max":850}'),

-- REVENUE
('prequal_avg_monthly_revenue','prequal',null,'Average monthly revenue','Across a typical month, before expenses.','currency',true,false,70,'{"min":0}'),
('prequal_deposit_trend','prequal',null,'Deposit trend over the last 3 months',null,'select',false,false,80,'{}'),

-- EXISTING OBLIGATIONS
('prequal_existing_balance','prequal',null,'Current loan or advance balance','Enter 0 if you have no business financing outstanding.','currency',false,false,90,'{"min":0}'),
('prequal_monthly_debt_payments','prequal',null,'Total monthly debt payments','Enter 0 if none.','currency',false,false,100,'{"min":0}'),
('prequal_prior_defaults','prequal',null,'Prior defaults or bankruptcies?',null,'select',false,false,110,'{}'),

-- CURRENT ASSETS
('prequal_asset_type','prequal',null,'Do you have assets that could secure financing?','Only used to check eligibility for secured products.','select',false,false,120,'{}'),
('prequal_asset_value','prequal',null,'Estimated asset value','Leave blank if not applicable.','currency',false,false,130,'{"min":0}'),
('prequal_asset_debt','prequal',null,'Debt owed on that asset','Leave blank if none.','currency',false,false,140,'{"min":0}');

insert into public.question_options (question_id, value, label, sort_order)
select q.id, v.value, v.label, v.sort_order
from (values
  ('prequal_deposit_trend','consistent_growing','Consistent or growing',1),
  ('prequal_deposit_trend','seasonal_irregular','Seasonal or irregular',2),
  ('prequal_deposit_trend','declining','Declining',3),

  ('prequal_prior_defaults','none','None',1),
  ('prequal_prior_defaults','discharged_resolved','Discharged or resolved',2),
  ('prequal_prior_defaults','active_recent','Active or within the last 3 years',3),

  ('prequal_asset_type','none','No assets to offer',1),
  ('prequal_asset_type','real_estate','Real estate',2),
  ('prequal_asset_type','equipment','Equipment',3),
  ('prequal_asset_type','vehicles','Vehicles',4),
  ('prequal_asset_type','inventory','Inventory',5),
  ('prequal_asset_type','receivables','Accounts receivable',6),
  ('prequal_asset_type','other','Something else',7)
) as v(question_key, value, label, sort_order)
join public.application_questions q on q.key = v.question_key;

-- The banded credit question is superseded by the exact score. Deactivated
-- rather than deleted: existing application_answers rows still reference the
-- key, and deleting the question would orphan them.
update public.application_questions
   set is_active = false
 where key = 'prequal_credit_band';

-- Asset detail is pointless when there is no asset. The prequal page renders
-- every question it is given, so this rule only takes effect once conditional
-- display is wired into that page; it is defined here so the intent is recorded.
insert into public.question_rules (name, description, conditions, effect, priority) values
('asset_detail_followup',
 'Ask for asset value and debt only when an asset type was chosen',
 '{"all":[{"key":"prequal_asset_type","op":"is_present"}]}',
 '{"show_questions":["prequal_asset_value","prequal_asset_debt"]}', 10);
