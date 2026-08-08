-- =============================================================================
-- 0017 — RECONCILE: PREQUAL COLUMNS APPLIED WITHOUT A MIGRATION FILE
--
-- These objects already exist in the live database. They were applied directly
-- while building the prequal, so the running schema and the repository had
-- drifted: anyone creating a fresh database from supabase/migrations/ would get
-- a schema the application code no longer matches.
--
-- Written idempotently (IF NOT EXISTS / exception guards) so it is a no-op
-- against the live database and correct against an empty one. Nothing here
-- changes existing data.
--
-- Recorded rather than reverted — the columns are in use and the prequal
-- depends on them. This is the repository catching up to reality, and migration
-- 0016 sits on top of it to keep credit_band populated from owner_credit_score.
-- =============================================================================

do $$
begin
  create type public.deposit_trend as enum
    ('consistent_growing', 'declining', 'seasonal_irregular');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.prior_default_status as enum
    ('none', 'discharged_resolved', 'active_recent');
exception
  when duplicate_object then null;
end $$;

alter table public.applications
  add column if not exists owner_credit_score integer,
  add column if not exists avg_monthly_revenue numeric(14, 2),
  add column if not exists deposit_trend public.deposit_trend,
  add column if not exists total_monthly_debt_payments numeric(14, 2),
  add column if not exists prior_default_status public.prior_default_status,
  add column if not exists submission_token uuid;

comment on column public.applications.owner_credit_score is
  'Self-reported by the applicant. Never a pulled score - FLS does not run credit. credit_band is derived from this by the trigger in migration 0016.';

comment on column public.applications.avg_monthly_revenue is
  'Self-reported monthly deposits from the prequal. Distinct from gross_annual_sales, which the full application collects.';

comment on column public.applications.submission_token is
  'Used by the prequal flow. Note applications.public_token already exists for anonymous result links - check which one a feature needs before adding a third.';
