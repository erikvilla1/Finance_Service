-- =============================================================================
-- 0003 — PROFILES, BUSINESSES, APPLICATIONS
--
-- Field map from docs/BUSINESS_CONTEXT.md §6, extracted from Robert's actual
-- application PDFs.
--
-- PII handling (spec §20, §28; BUSINESS_CONTEXT §12): sensitive owner/guarantor
-- data is segregated into its own table with its own RLS policy so that a bug
-- in application access cannot leak it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PROFILES — extends auth.users
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        public.user_role not null default 'customer',
  full_name   text,
  email       text,
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create a profile on signup. Defaults to 'customer' — staff roles must be
-- granted explicitly by an admin (spec §22: admin roles must be explicit).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- BUSINESSES — core business block, asked on every product
-- -----------------------------------------------------------------------------
create table public.businesses (
  id                     uuid primary key default gen_random_uuid(),
  owner_profile_id       uuid references public.profiles(id) on delete set null,

  legal_name             text not null,
  dba                    text,
  entity_type            public.entity_type,
  state_of_incorporation text,

  -- Tax ID is regulated. Stored only when operationally necessary; prefer
  -- collecting at submission time rather than at prequal.
  ein_last4              text,

  business_start_date    date,
  industry               text,
  naics_code             text,

  address_line1          text,
  address_line2          text,
  city                   text,
  state                  text,
  postal_code            text,
  country                text not null default 'US',

  billing_same_as_physical boolean not null default true,
  billing_address_line1  text,
  billing_address_line2  text,
  billing_city           text,
  billing_state          text,
  billing_postal_code    text,

  phone                  text,
  email                  text,
  website                text,

  -- rent | mortgage | owned_free_clear
  premises_status        text,
  premises_monthly_payment numeric(12, 2),

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz
);

create index businesses_owner_idx on public.businesses(owner_profile_id);

-- -----------------------------------------------------------------------------
-- APPLICATIONS
-- -----------------------------------------------------------------------------
create table public.applications (
  id              uuid primary key default gen_random_uuid(),
  reference_code  text not null unique default public.generate_application_reference(),

  profile_id      uuid references public.profiles(id) on delete set null,
  business_id     uuid references public.businesses(id) on delete set null,

  -- Dual taxonomy, mirroring the catalog
  category_id     uuid references public.product_categories(id),
  product_id      uuid references public.financing_products(id),
  track           public.product_track,

  -- Goal-first entry, before the customer knows the product name
  financing_goal  text,

  requested_amount numeric(14, 2),
  use_of_funds     text,

  -- Banded lead metadata. Mirrors the shape US Fund Advisors already sends so
  -- Robert's mental model transfers on day one (BUSINESS_CONTEXT §6).
  revenue_band         public.revenue_band,
  credit_band          public.credit_band,
  time_in_business     public.time_in_business_band,
  urgency              public.urgency_band,
  industry             text,

  -- Financial snapshot (asked on every product)
  gross_annual_sales           numeric(14, 2),
  avg_monthly_card_volume      numeric(14, 2),
  has_existing_mca             boolean,
  existing_debt_balance        numeric(14, 2),
  has_open_judgments_or_liens  boolean,
  has_bankruptcy               boolean,
  bankruptcy_discharged        boolean,

  status          public.application_status not null default 'draft',
  assigned_to     uuid references public.profiles(id) on delete set null,

  -- Attribution
  source          text,
  channel         text,
  utm             jsonb not null default '{}'::jsonb,

  -- Funnel timestamps, feeding the spec §19 dashboard metrics
  submitted_at    timestamptz,
  first_contact_at timestamptz,
  decision_at     timestamptz,
  funded_at       timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index applications_profile_idx on public.applications(profile_id);
create index applications_status_idx on public.applications(status) where deleted_at is null;
create index applications_assigned_idx on public.applications(assigned_to);
create index applications_track_idx on public.applications(track);
create index applications_created_idx on public.applications(created_at desc);

-- -----------------------------------------------------------------------------
-- ANSWERS — everything the dynamic engine collects
-- -----------------------------------------------------------------------------
create table public.application_answers (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  question_key   text not null,
  question_id    uuid references public.application_questions(id) on delete set null,
  value          jsonb,
  is_pii         boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (application_id, question_key)
);

create index application_answers_app_idx on public.application_answers(application_id);

-- -----------------------------------------------------------------------------
-- OWNERS / GUARANTORS — SEGREGATED SENSITIVE TABLE
--
-- Collected for each owner holding 20% or more.
--
-- DELIBERATE OMISSION: full SSN is not stored. Platform spec §20 says do not
-- store sensitive information unnecessarily, and a full SSN at rest is the
-- single highest-liability field in this system. Last four is enough to
-- identify a file; the full value should be collected at lender-submission time
-- and passed through, not persisted. Revisit only with a compliance review.
-- -----------------------------------------------------------------------------
create table public.application_owners (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,

  full_name       text not null,
  title           text,
  ownership_pct   numeric(5, 2),

  ssn_last4       text,
  date_of_birth   date,

  home_address_line1 text,
  home_address_line2 text,
  home_city       text,
  home_state      text,
  home_postal_code text,

  home_phone      text,
  mobile_phone    text,
  email           text,

  -- Band, not exact score, during early qualification (spec §8 STEP 6)
  credit_band     public.credit_band,

  is_primary      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint ownership_pct_is_valid
    check (ownership_pct is null or (ownership_pct >= 0 and ownership_pct <= 100)),
  constraint ssn_last4_is_four_digits
    check (ssn_last4 is null or ssn_last4 ~ '^[0-9]{4}$')
);

create index application_owners_app_idx on public.application_owners(application_id);

comment on table public.application_owners is
  'Regulated PII. Tighter RLS than applications. Full SSN intentionally not stored — see migration comment.';

-- -----------------------------------------------------------------------------
-- QUALIFICATION RESULTS — the prequal output (spec §26, §27)
-- -----------------------------------------------------------------------------
create table public.qualification_results (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,

  outcome         public.qualification_outcome not null,

  -- [{"product_id":"...","slug":"...","confidence":"potential_match","reasons":[...]}]
  product_matches jsonb not null default '[]'::jsonb,

  -- Indicative only. Never rendered without "subject to lender approval".
  -- Populated only when the underlying product has terms_verified = true.
  indicative_amount_min numeric(14, 2),
  indicative_amount_max numeric(14, 2),
  indicative_terms      jsonb not null default '{}'::jsonb,

  missing_information jsonb not null default '[]'::jsonb,
  risk_flags          jsonb not null default '[]'::jsonb,
  review_required     boolean not null default true,

  -- Audit trail. Spec §26: "Store the rules used to produce each result."
  ruleset_version integer,
  rules_evaluated jsonb not null default '[]'::jsonb,
  engine_version  text,

  created_at      timestamptz not null default now()
);

create index qualification_results_app_idx on public.qualification_results(application_id);

-- -----------------------------------------------------------------------------
-- TRIGGERS
-- -----------------------------------------------------------------------------
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.applications
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.application_answers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.application_owners
  for each row execute function public.set_updated_at();
