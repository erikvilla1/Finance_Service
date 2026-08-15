-- =============================================================================
-- 0030 — A FILE CAN BE SENT FOR SIGNATURE
--
-- The funding application is the document a lender will not proceed without, and
-- there has been no way to sign it. `signed_application` has existed as a
-- checklist item since 0006, satisfied only by an applicant printing the form,
-- signing it, scanning it and uploading the result.
--
-- This adds the one piece of state that flow needs: whether a specialist has
-- asked for the signature yet.
--
-- WHY NOT A STATUS. `application_status` already has sixteen values and every
-- one of them describes where the deal is, not what is outstanding on it. A file
-- can be awaiting signature while sitting at 'contacted', 'documents_received'
-- or 'under_review', and forcing it into that enum would make those two facts
-- fight. It is a timestamp for the same reason `first_contact_at` is one.
--
-- WHY A SPECIALIST DECIDES, RATHER THAN THE FORM COMPLETING ITSELF. Robert knows
-- things about a file that the completeness check does not, and a client signing
-- a document before he has read it is worse than a client waiting a day. The
-- timestamp records who is ready, not what is finished.
-- =============================================================================

alter table public.applications
  add column if not exists signature_requested_at timestamptz,
  add column if not exists signature_requested_by uuid references public.profiles(id) on delete set null;

comment on column public.applications.signature_requested_at is
  'When a specialist released the funding application for signature. Null means the applicant sees no signing page. Not a status: a file can await signature at several different stages.';

-- -----------------------------------------------------------------------------
-- A CUSTOMER CANNOT RELEASE THEIR OWN APPLICATION FOR SIGNATURE
--
-- 0022 widened the customer edit window and added a trigger keeping status,
-- profile_id and assigned_to out of their reach. These two columns belong in
-- that same list for the same reason: RLS grants a row, never a column, so
-- without this an applicant could set the timestamp themselves and sign a
-- document nobody had reviewed.
--
-- Replacing the function rather than adding a second trigger, so the whole rule
-- stays readable in one place.
-- -----------------------------------------------------------------------------

create or replace function public.guard_customer_application_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp as $$
begin
  -- No end user in the request: the service role running the anonymous prequal,
  -- claimApplication() attaching a new account, or a migration. These paths have
  -- no auth.uid() to check and are trusted by construction.
  if auth.uid() is null then
    return new;
  end if;

  if public.is_staff() then
    return new;
  end if;

  if new.profile_id is distinct from old.profile_id then
    raise exception 'An application cannot be moved to another account';
  end if;

  if new.assigned_to is distinct from old.assigned_to then
    raise exception 'Only staff may assign an application';
  end if;

  if new.status is distinct from old.status
     and not (old.status = 'draft' and new.status = 'submitted') then
    raise exception 'Only staff may change the status of an application';
  end if;

  if new.signature_requested_at is distinct from old.signature_requested_at
     or new.signature_requested_by is distinct from old.signature_requested_by then
    raise exception 'Only staff may release an application for signature';
  end if;

  return new;
end;
$$;

comment on function public.guard_customer_application_fields() is
  'Keeps status, profile_id, assigned_to and the signature release out of a customer''s reach now that they can update their application beyond draft. Exempts requests with no auth.uid(), which is how the service role claims an anonymous prequal.';
