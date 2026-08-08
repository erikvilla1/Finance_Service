-- =============================================================================
-- 0016 — KEEP credit_band POPULATED
--
-- The prequal changed shape: prequal_credit_band (a select) was deactivated and
-- replaced with prequal_credit_score (a raw number), writing to a new
-- owner_credit_score column.
--
-- That left credit_band unpopulated on every new row — and credit_band is what
-- the qualification engine reads, what the CRM displays, and what the seeded
-- rulesets compare against. Nothing errors; the signal just quietly disappears.
--
-- Deriving it in a trigger rather than in application code is deliberate. Two
-- separate forms write applications, and a rule enforced in one of them is a
-- rule the other can miss. Here it holds no matter who writes the row, or how.
--
-- Direction is one-way on purpose: an explicitly set band is never overwritten,
-- so a form that still submits bands keeps working unchanged.
-- =============================================================================

create or replace function public.derive_credit_band()
returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  if new.owner_credit_score is not null and new.credit_band is null then
    new.credit_band := case
      when new.owner_credit_score >= 760 then '760_plus'::public.credit_band
      when new.owner_credit_score >= 720 then '720_759'::public.credit_band
      when new.owner_credit_score >= 680 then '680_719'::public.credit_band
      when new.owner_credit_score >= 650 then '650_679'::public.credit_band
      when new.owner_credit_score >= 600 then '600_649'::public.credit_band
      else 'below_600'::public.credit_band
    end;
  end if;
  return new;
end;
$$;

create trigger keep_credit_band_in_sync
  before insert or update on public.applications
  for each row execute function public.derive_credit_band();

revoke execute on function public.derive_credit_band() from public, anon, authenticated;

update public.applications
   set credit_band = case
     when owner_credit_score >= 760 then '760_plus'::public.credit_band
     when owner_credit_score >= 720 then '720_759'::public.credit_band
     when owner_credit_score >= 680 then '680_719'::public.credit_band
     when owner_credit_score >= 650 then '650_679'::public.credit_band
     when owner_credit_score >= 600 then '600_649'::public.credit_band
     else 'below_600'::public.credit_band
   end
 where owner_credit_score is not null and credit_band is null;

comment on column public.applications.credit_band is
  'Banded credit. Derived automatically from owner_credit_score by the keep_credit_band_in_sync trigger when not set directly, so the qualification engine and CRM keep working whichever form writes the row.';
