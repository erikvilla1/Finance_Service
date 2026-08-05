-- =============================================================================
-- 0009 — UNGUESSABLE APPLICATION TOKEN
--
-- The anonymous prequalification result page has to be reachable by someone who
-- has not signed in, which means the identifier ends up in a URL.
--
-- reference_code cannot serve that purpose: it is sequential (FLS-2026-000001,
-- -000002, ...), so anyone holding one link could enumerate every other
-- applicant's result. It stays as the human-readable handle staff use on the
-- phone; public_token is what goes in links.
-- =============================================================================

alter table public.applications
  add column public_token uuid not null default gen_random_uuid();

create unique index applications_public_token_idx on public.applications(public_token);

comment on column public.applications.public_token is
  'Unguessable identifier for anonymous result links. reference_code is sequential and therefore enumerable - never put it in a URL.';
