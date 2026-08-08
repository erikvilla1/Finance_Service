-- =============================================================================
-- 0020 — ONE TRIGGER, ONE RULE: THE SCORE IS AUTHORITATIVE
--
-- Resolves the collision Kai identified. Two migrations had each defined
-- public.derive_credit_band() with its own trigger attached, so both fired on
-- every insert and the live function body was whichever migration ran last.
--
-- It also settles the semantics question, and not in favour of the version
-- written here originally. The `credit_band is null` guard was meant to protect
-- a form that still submitted bands directly — but no such form exists any
-- more, and the guard had a real cost:
--
--   insert score 650  -> band 650_679   correct
--   correct  score 780 -> band 650_679   STALE AND WRONG
--
-- A specialist would have seen "650-679" next to a 780 score, with nothing
-- indicating which to believe. Recomputing whenever a score is present cannot
-- produce that state. When no score is present an explicitly supplied band is
-- still left alone, so nothing that writes bands directly breaks.
--
-- Supersedes the function defined in 0019. That migration is left as written
-- rather than edited, because it has already been applied and rewriting applied
-- history hides what actually happened.
-- =============================================================================

drop trigger if exists derive_credit_band_from_score on public.applications;
drop trigger if exists keep_credit_band_in_sync on public.applications;

create or replace function public.derive_credit_band()
returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  if new.owner_credit_score is not null then
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

-- Repair any row whose band no longer matches its score.
update public.applications
   set credit_band = case
     when owner_credit_score >= 760 then '760_plus'::public.credit_band
     when owner_credit_score >= 720 then '720_759'::public.credit_band
     when owner_credit_score >= 680 then '680_719'::public.credit_band
     when owner_credit_score >= 650 then '650_679'::public.credit_band
     when owner_credit_score >= 600 then '600_649'::public.credit_band
     else 'below_600'::public.credit_band
   end
 where owner_credit_score is not null
   and credit_band is distinct from (case
     when owner_credit_score >= 760 then '760_plus'::public.credit_band
     when owner_credit_score >= 720 then '720_759'::public.credit_band
     when owner_credit_score >= 680 then '680_719'::public.credit_band
     when owner_credit_score >= 650 then '650_679'::public.credit_band
     when owner_credit_score >= 600 then '600_649'::public.credit_band
     else 'below_600'::public.credit_band
   end);

comment on function public.derive_credit_band() is
  'Single source of truth for credit_band. The score is authoritative: whenever owner_credit_score is present the band is recomputed, so a corrected score cannot leave a stale band behind. When no score is present an explicitly supplied band is left alone.';
