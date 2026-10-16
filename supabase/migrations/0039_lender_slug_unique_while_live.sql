-- -----------------------------------------------------------------------------
-- A removed lender's name can be used again.
--
-- Robert can now remove a lender from the admin (a soft delete: deleted_at is
-- set, the row stays, and every submission that went to them keeps its
-- record). With the plain UNIQUE (slug) from 0031, removing "United Capital
-- Source" and adding it back later — the obvious thing to do after entering
-- the wrong details — failed on the slug the removed row still held.
--
-- The uniqueness now applies among live rows only. Removed rows keep their
-- slug for the history, and a new row may take it.
-- -----------------------------------------------------------------------------

alter table public.lenders
  drop constraint if exists lenders_slug_key;

create unique index if not exists lenders_slug_live_key
  on public.lenders (slug)
  where deleted_at is null;
