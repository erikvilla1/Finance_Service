-- Fields the funding application form requires that the schema did not hold.

alter table public.businesses
  add column preferred_contact_phone text,
  add column landlord_name text,
  add column landlord_phone text;

comment on column public.businesses.landlord_name is
  'Required by the funding application when premises are rented or mortgaged.';

alter table public.applications
  add column credit_card_processor text,
  add column judgment_lien_balance numeric(14,2),
  add column bankruptcy_year integer;

alter table public.applications
  add constraint bankruptcy_year_is_plausible
  check (bankruptcy_year is null or (bankruptcy_year between 1900 and 2200));

-- Owners: the form asks for first and last name separately, and full_name alone
-- cannot be split reliably (compound surnames, multiple given names).
alter table public.application_owners
  add column first_name text,
  add column last_name text;

comment on column public.application_owners.full_name is
  'Retained as the display name. first_name / last_name exist because the funding application asks for them separately and splitting a full name is unreliable.';

-- Existing obligations. The paper form has room for exactly two lenders; a
-- table removes that ceiling and makes the debt schedule queryable.
create table public.existing_debts (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  lender_name    text not null,
  balance        numeric(14,2),
  monthly_payment numeric(14,2),
  original_amount numeric(14,2),
  debt_type      text,
  position       integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index existing_debts_app_idx on public.existing_debts(application_id);

comment on table public.existing_debts is
  'One row per obligation. The paper form allows two; funders routinely want the full schedule.';

alter table public.existing_debts enable row level security;

create policy "users read own debts" on public.existing_debts
  for select using (exists (select 1 from public.applications a
    where a.id = application_id and (a.profile_id = (select auth.uid()) or (select public.is_staff()))));

create policy "users write own debts" on public.existing_debts
  for insert with check (exists (select 1 from public.applications a
    where a.id = application_id and ((a.profile_id = (select auth.uid()) and a.status = 'draft') or (select public.is_staff()))));

create policy "users update own debts" on public.existing_debts
  for update using (exists (select 1 from public.applications a
    where a.id = application_id and ((a.profile_id = (select auth.uid()) and a.status = 'draft') or (select public.is_staff()))));

create trigger set_updated_at before update on public.existing_debts
  for each row execute function public.set_updated_at();
