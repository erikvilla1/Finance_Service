-- =============================================================================
-- 0002 — PRODUCT CATALOG & DYNAMIC QUESTION ENGINE
--
-- Resolves the taxonomy conflict in docs/BUSINESS_CONTEXT.md §14.2 with a dual
-- model:
--   • category  → goal-based, drives site navigation and the goal selector
--   • track     → underwriting-based, drives prequal rules and document lists
-- A product has exactly one of each. Neither grouping is a superset of the
-- other, and both are needed.
--
-- Platform spec §9: questions and rules are configuration, never hard-coded
-- into components.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CATEGORIES — how customers navigate (platform spec §6)
-- -----------------------------------------------------------------------------
create table public.product_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  headline    text,
  description text,
  icon        text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.product_categories is
  'Goal-based grouping for customer navigation. See BUSINESS_CONTEXT §14.2.';

-- -----------------------------------------------------------------------------
-- PRODUCTS
-- -----------------------------------------------------------------------------
create table public.financing_products (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  category_id  uuid not null references public.product_categories(id),
  track        public.product_track not null,

  -- Customer-facing copy
  headline     text,
  summary      text,
  who_its_for  text,

  -- Indicative program terms.
  -- WARNING: every value here is UNVERIFIED until terms_verified = true.
  -- Sourced from marketing brochures that contain contradictory figures.
  -- See BUSINESS_CONTEXT.md §5 critical notice.
  amount_min       numeric(14, 2),
  amount_max       numeric(14, 2),
  min_fico         integer,
  rate_note        text,
  term_note        text,
  program_notes    text,

  -- Verification gate
  terms_verified   boolean not null default false,
  verified_at      timestamptz,
  verified_by      text,
  source_note      text,

  -- Publication
  is_published     boolean not null default false,
  has_live_application boolean not null default false,

  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,

  -- Structural enforcement of the platform spec's #1 copy rule: unverified
  -- program terms cannot be published. This is deliberately a hard constraint
  -- rather than a convention, because an unverified rate on a live page is a
  -- compliance problem, not a cosmetic one.
  constraint published_products_must_be_verified
    check (is_published = false or terms_verified = true),

  constraint amount_range_is_ordered
    check (amount_min is null or amount_max is null or amount_min <= amount_max)
);

create index financing_products_category_idx on public.financing_products(category_id);
create index financing_products_track_idx on public.financing_products(track);
create index financing_products_published_idx on public.financing_products(is_published)
  where deleted_at is null;

comment on column public.financing_products.terms_verified is
  'False until Robert confirms the figures. Blocks publication via CHECK constraint.';

-- -----------------------------------------------------------------------------
-- QUESTIONS — the adaptive application (BUSINESS_CONTEXT §6)
--
-- One unified intake: a shared core plus product-specific modules. Building it
-- as six separate forms would make the prequalification impossible to compute,
-- because the engine reads the same core fields regardless of product.
-- -----------------------------------------------------------------------------
create table public.application_questions (
  id            uuid primary key default gen_random_uuid(),

  -- Stable identifier used by rules and stored answers. Never renumber.
  key           text not null unique,

  -- Scope: a question applies globally, to a track, or to one product.
  module        text not null,
  track         public.product_track,
  product_id    uuid references public.financing_products(id),

  label         text not null,
  help_text     text,
  placeholder   text,
  question_type public.question_type not null,
  is_required   boolean not null default false,

  -- Marks fields that carry regulated personal information. Drives redaction in
  -- logs and analytics. Platform spec §30: never send financial data to
  -- analytics platforms.
  is_pii        boolean not null default false,

  -- Zod-compatible constraints: {"min":0,"max":1000000,"pattern":"..."}
  validation    jsonb not null default '{}'::jsonb,

  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index application_questions_module_idx on public.application_questions(module);
create index application_questions_track_idx on public.application_questions(track);
create index application_questions_product_idx on public.application_questions(product_id);

comment on column public.application_questions.module is
  'core_business | financial_snapshot | owner | equipment | ar | cre | sba | prequal';

create table public.question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.application_questions(id) on delete cascade,
  value       text not null,
  label       text not null,
  sort_order  integer not null default 0,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  unique (question_id, value)
);

-- -----------------------------------------------------------------------------
-- CONDITIONAL DISPLAY RULES
--
-- Controls which questions appear. Distinct from qualification rules below:
-- these shape the form, those score the applicant.
-- -----------------------------------------------------------------------------
create table public.question_rules (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,

  track       public.product_track,
  product_id  uuid references public.financing_products(id),

  -- {"all":[{"key":"time_in_business","op":"in","value":["startup_under_1y"]}]}
  conditions  jsonb not null,

  -- {"show_questions":["startup_program_interest"],"require_documents":["tax_returns_2y"]}
  effect      jsonb not null,

  priority    integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- QUALIFICATION RULESETS
--
-- Versioned JSON that the prequalification engine evaluates. Robert can tune
-- these without a deploy. Platform spec §26 requires the rules used for each
-- result to be stored for audit — see qualification_results.rules_evaluated.
--
-- Rulesets are seeded INACTIVE with placeholder thresholds. They stay inactive
-- until the Phase-0 session produces real numbers (BUSINESS_CONTEXT §13.1).
-- -----------------------------------------------------------------------------
create table public.qualification_rulesets (
  id          uuid primary key default gen_random_uuid(),
  track       public.product_track not null,
  product_id  uuid references public.financing_products(id),
  version     integer not null default 1,

  ruleset     jsonb not null,

  is_active   boolean not null default false,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (track, product_id, version)
);

comment on table public.qualification_rulesets is
  'Versioned prequal thresholds. Seeded inactive with placeholders until Robert confirms real numbers.';

-- -----------------------------------------------------------------------------
-- DOCUMENT TYPE DEFINITIONS (BUSINESS_CONTEXT §5.2)
--
-- The universal set applies to nearly every deal; track-specific types layer on.
-- -----------------------------------------------------------------------------
create table public.document_type_definitions (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique,
  label         text not null,
  description   text,
  is_universal  boolean not null default false,
  track         public.product_track,
  is_pii        boolean not null default true,
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- TRIGGERS
-- -----------------------------------------------------------------------------
create trigger set_updated_at before update on public.product_categories
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.financing_products
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.application_questions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.question_rules
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.qualification_rulesets
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.document_type_definitions
  for each row execute function public.set_updated_at();
