-- =============================================================================
-- 0031 — LENDERS, AND WHERE FILES ACTUALLY WENT
--
-- Twenty-three tables and not one of them is a lender. The only record that a
-- file left the building is `applications.status = 'submitted_to_funder'`: one
-- flag, no name, no date, nothing that came back.
--
-- BUSINESS_CONTEXT §2 says Robert "has direct access to 115+ lenders and matches
-- each borrower to a custom lender — a real differentiator in commercial
-- finance." That matching is the thing he is good at, and the platform has been
-- unable to record any of it.
--
-- THREE THINGS THE SINGLE FLAG CANNOT SAY
--
--   Which lender. The differentiator is which one he picked and why.
--
--   How many. Files go to several. "Sent to three, one declined, two pending"
--   is the normal state of a live deal and the flag can only say "sent".
--
--   That a decline is not the end. §2 again: "a denial is not a forever no."
--   With a decline as a property of the whole application, the only honest thing
--   the customer-facing status mapping could do was hide it — which is why
--   customerStatus() maps 'declined' to "we're reviewing your options". Once a
--   decline belongs to a submission, the file stays alive and goes elsewhere,
--   which is what actually happens.
--
-- STAFF ONLY, WITHOUT EXCEPTION. Not a privacy nicety — the lender list is the
-- business. An applicant who can see which funders hold their file can take it
-- to them directly, and a competitor who gets a login learns Robert's entire
-- book. There is no customer-facing policy on either table, and no reason to
-- add one later.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. WHERE A SUBMISSION HAS GOT TO
--
-- Deliberately not reusing application_status. That enum describes a deal;
-- this describes one conversation with one funder, and a file can be declined
-- by one lender and in review with another on the same afternoon.
-- -----------------------------------------------------------------------------

create type public.lender_submission_status as enum (
  'prepared',    -- package assembled, not yet sent
  'sent',
  'in_review',   -- they have acknowledged and are working it
  'countered',   -- an offer, but not the one asked for
  'approved',
  'declined',
  'withdrawn',   -- we pulled it, usually because another funder won
  'funded'
);

-- -----------------------------------------------------------------------------
-- 2. THE LENDERS
--
-- `tracks` as an array rather than a join table. A lender takes a handful of
-- the five product tracks, the set is read far more than it is written, and a
-- join table here would add a second table and a second set of policies to
-- express "SBA and CRE".
-- -----------------------------------------------------------------------------

create table public.lenders (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique,

  contact_name      text,
  contact_email     text,
  contact_phone     text,

  -- Which tracks they write. Empty means unknown rather than none — the
  -- submission form treats it as "show anyway" rather than hiding the lender.
  tracks            public.product_track[] not null default '{}',

  amount_min        numeric(14,2),
  amount_max        numeric(14,2),
  min_fico          integer,

  -- How Robert gets a package to them. Free text on purpose: the real answer is
  -- "email Dave" as often as it is a portal, and an enum would force a lie.
  submission_method text,
  portal_url        text,

  -- What he knows about their appetite. The part that makes the match good and
  -- the part no schema can anticipate.
  notes             text,

  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create index lenders_active_idx on public.lenders(is_active) where deleted_at is null;
create index lenders_tracks_idx on public.lenders using gin(tracks);

-- -----------------------------------------------------------------------------
-- 3. THE SUBMISSIONS
--
-- One row per application per lender per attempt. Not unique on
-- (application_id, lender_id): a file declined in March and re-submitted in
-- June after the business improved is two submissions, and collapsing them
-- would erase the history that makes the second one worth making.
-- -----------------------------------------------------------------------------

create table public.lender_submissions (
  id                uuid primary key default gen_random_uuid(),
  application_id    uuid not null references public.applications(id) on delete cascade,
  lender_id         uuid not null references public.lenders(id) on delete restrict,

  status            public.lender_submission_status not null default 'prepared',

  submitted_at      timestamptz,
  submitted_by      uuid references public.profiles(id) on delete set null,

  responded_at      timestamptz,
  -- Why they said no, in their words. The single most reusable piece of
  -- information in the business: it tells the next submission what to fix, and
  -- over time it tells Robert which lender to stop sending certain files to.
  decline_reason    text,

  offered_amount    numeric(14,2),
  offered_terms     text,
  notes             text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index lender_submissions_app_idx on public.lender_submissions(application_id);
create index lender_submissions_lender_idx on public.lender_submissions(lender_id);
create index lender_submissions_status_idx on public.lender_submissions(status);

comment on table public.lender_submissions is
  'One row per attempt with one funder. A file declined and later re-submitted is two rows on purpose — collapsing them erases the history that makes the second attempt worth making.';

-- -----------------------------------------------------------------------------
-- 4. TRIGGERS
-- -----------------------------------------------------------------------------

create trigger set_updated_at before update on public.lenders
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.lender_submissions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. POLICIES — STAFF, AND ONLY STAFF
--
-- No customer policy of any kind. Both tables are invisible to an applicant:
-- not restricted to their own rows, absent. The lender list is the business.
--
-- `on delete restrict` on lender_id above belongs to the same thought — a
-- lender with submissions against them cannot be deleted out from under the
-- history.
-- -----------------------------------------------------------------------------

alter table public.lenders enable row level security;
alter table public.lender_submissions enable row level security;

create policy "staff read lenders" on public.lenders
  for select using ((select public.is_staff()));

create policy "staff manage lenders" on public.lenders
  for all using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy "staff read submissions" on public.lender_submissions
  for select using ((select public.is_staff()));

create policy "staff manage submissions" on public.lender_submissions
  for all using ((select public.is_staff()))
  with check ((select public.is_staff()));
