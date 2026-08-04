-- =============================================================================
-- 0001 — FOUNDATION
-- Extensions, enums, and shared helper functions.
--
-- Platform spec §20: UUID primary keys, created_at/updated_at, soft deletion.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

-- Underwriting track. Prequalification rules and required documents cluster by
-- track, not by marketing category. See docs/BUSINESS_CONTEXT.md §5.1 and §14.2.
create type public.product_track as enum (
  'equipment',
  'working_capital',
  'unsecured',
  'ar_factoring',
  'sba',
  'cre',
  'securities',
  'healthcare',
  'specialty'
);

-- Application pipeline. Mirrors platform spec §18's sixteen stages.
-- NOTE: CRM scope is a deferred decision (BUSINESS_CONTEXT §14.1), so the
-- pipeline lives as a status column on the application rather than as a set of
-- dedicated CRM tables. Revisit after the Phase-0 session with Robert.
create type public.application_status as enum (
  'draft',
  'submitted',
  'initial_review',
  'contact_attempted',
  'contacted',
  'information_requested',
  'documents_requested',
  'documents_received',
  'under_review',
  'potential_match',
  'submitted_to_funder',
  'approved',
  'declined',
  'withdrawn',
  'funded',
  'closed'
);

create type public.user_role as enum (
  'customer',
  'specialist',
  'manager',
  'admin'
);

-- Qualification outcome. Deliberately avoids "approved" — the platform does not
-- make credit decisions. Platform spec §26.
create type public.qualification_outcome as enum (
  'potential_match',
  'requires_review',
  'insufficient_information',
  'no_match_identified'
);

create type public.document_status as enum (
  'requested',
  'uploaded',
  'under_review',
  'accepted',
  'rejected',
  'waived'
);

create type public.question_type as enum (
  'text',
  'textarea',
  'number',
  'currency',
  'percent',
  'select',
  'multiselect',
  'boolean',
  'date',
  'email',
  'phone',
  'address'
);

create type public.entity_type as enum (
  'sole_proprietorship',
  'partnership',
  'llc',
  's_corp',
  'c_corp',
  'nonprofit',
  'trust',
  'other'
);

-- Banded values. Early qualification uses ranges, not exact figures —
-- platform spec §8 STEP 6.
create type public.credit_band as enum (
  'below_600',
  '600_649',
  '650_679',
  '680_719',
  '720_759',
  '760_plus',
  'unknown'
);

create type public.revenue_band as enum (
  'under_100k',
  '100k_250k',
  '250k_500k',
  '500k_1m',
  '1m_5m',
  '5m_plus',
  'unknown'
);

create type public.time_in_business_band as enum (
  'startup_under_1y',
  '1_2y',
  '2_5y',
  '5_10y',
  '10y_plus'
);

create type public.urgency_band as enum (
  'immediately',
  'within_30_days',
  'within_90_days',
  'just_exploring'
);

create type public.consent_type as enum (
  'fcra_authorization',
  'tcpa_sms',
  'e_sign',
  'privacy_policy',
  'terms_of_use',
  'credit_pull'
);

-- -----------------------------------------------------------------------------
-- HELPERS
-- -----------------------------------------------------------------------------

-- Keeps updated_at honest without relying on application code.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Current user's role, read from profiles.
--
-- SECURITY DEFINER so RLS policies can call it without recursing into the
-- profiles policies. search_path is pinned per Supabase security guidance.
--
-- These are plpgsql rather than sql on purpose: a `language sql` body is
-- parsed at creation time, which would require public.profiles to already
-- exist. plpgsql defers that to call time, letting the helpers live here in
-- the foundation migration alongside everything else they support.
create or replace function public.current_user_role()
returns public.user_role
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result public.user_role;
begin
  select role into result from public.profiles where id = auth.uid();
  return result;
end;
$$;

-- Internal staff = anyone who is not a customer.
create or replace function public.is_staff()
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result public.user_role;
begin
  select role into result from public.profiles where id = auth.uid();
  return coalesce(result in ('specialist', 'manager', 'admin'), false);
end;
$$;

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result public.user_role;
begin
  select role into result from public.profiles where id = auth.uid();
  return coalesce(result = 'admin', false);
end;
$$;

-- Human-friendly application reference, e.g. FLS-2026-000042.
create sequence if not exists public.application_reference_seq;

create or replace function public.generate_application_reference()
returns text
language sql
volatile
as $$
  select 'FLS-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.application_reference_seq')::text, 6, '0');
$$;
