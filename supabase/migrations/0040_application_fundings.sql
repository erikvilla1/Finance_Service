-- -----------------------------------------------------------------------------
-- The funding record.
--
-- Marking an application "funded" stamped a timestamp and nothing else. There
-- was nowhere to write what actually happened: how much, through whom, on
-- what date, and what FLS earned. Those four facts are the business (the
-- pipeline's "funded" count is a count of them), and Robert kept them in his
-- head or a spreadsheet.
--
-- A SEPARATE TABLE, NOT COLUMNS ON applications. The applicant can read their
-- own application row, and the commission is not theirs to see. This table
-- has staff policies only, like lenders: an applicant querying it gets
-- nothing, not a filtered view.
--
-- ONE ROW PER APPLICATION (the primary key is the application). A file funds
-- once; a re-funding months later is a new application in this model, the
-- way a re-submission is a new lender_submissions row.
--
-- lender_id is SET NULL on delete, not RESTRICT: lenders are soft-deleted
-- (0039) so this will rarely fire, and a funding record must outlive the
-- lender row regardless.
-- -----------------------------------------------------------------------------

create table public.application_fundings (
  application_id    uuid primary key references public.applications(id) on delete cascade,
  lender_id         uuid references public.lenders(id) on delete set null,

  funded_amount     numeric(14,2),
  funded_on         date,
  -- What FLS collected, gross. Separate from any lender/ISO split that
  -- happened before it reached FLS; that detail belongs in notes until it
  -- needs a column.
  commission_amount numeric(14,2),
  notes             text,

  recorded_by       uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.application_fundings is
  'What happened when a file funded: amount, lender, date, FLS commission. Staff only; the applicant never sees the commission.';

alter table public.application_fundings enable row level security;

create policy "staff read fundings" on public.application_fundings
  for select using ((select public.is_staff()));

create policy "staff manage fundings" on public.application_fundings
  for all using ((select public.is_staff()))
  with check ((select public.is_staff()));

create trigger application_fundings_touch
  before update on public.application_fundings
  for each row execute function public.set_updated_at();
