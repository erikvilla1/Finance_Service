-- =============================================================================
-- 0022 — AN APPLICANT CAN FINISH THE APPLICATION THEY STARTED
--
-- Every customer write policy in 0005 is gated on `status = 'draft'`. That was
-- correct when the only thing a customer could write was the prequal, which
-- happens in one sitting. It stops being correct the moment there is a form
-- they fill in over several days.
--
-- THE FAILURE IT PRODUCES. An applicant starts the full application. Robert
-- sees the lead and moves it to 'contacted' — which is his job, and the whole
-- point of the pipeline. The applicant comes back that evening and saves. The
-- UPDATE matches no rows, PostgREST reports success, and the form politely
-- clears itself. Nothing errors. They fill it in again, and it happens again.
--
-- Worse, the two statuses that most obviously mean "we are waiting on you" —
-- 'information_requested' and 'documents_requested' — were among the ones that
-- locked them out. We would have been asking for information through a form
-- that silently discarded it.
--
-- THE WINDOW. Editable while the file is still being gathered; closed once it
-- is being packaged. That boundary already exists in the codebase as the
-- new/working groups in src/lib/crm.ts, and this deliberately matches it rather
-- than inventing a second vocabulary for the same idea:
--
--   editable   draft, submitted, initial_review,
--              contact_attempted, contacted,
--              information_requested, documents_requested, documents_received
--
--   closed     under_review, potential_match, submitted_to_funder,
--              approved, declined, withdrawn, funded, closed
--
-- Once a specialist is assembling the package, the version they are reading has
-- to be the version that exists. Changes after that point are a conversation.
--
-- WIDENING A POLICY IS NOT FREE. The old rule kept a customer out of their own
-- status column by accident: they could only write while 'draft', and the check
-- constraint let them move to 'submitted' and no further. Widening the window
-- without replacing that accident would let a customer set their own file to
-- 'documents_received'. Section 3 closes it deliberately.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. THE WINDOW, DEFINED ONCE
--
-- As a function rather than repeated in five policies. Five copies of a list is
-- five places to update when a status is added, and the one that gets missed
-- fails silently in exactly the way described above.
--
-- IMMUTABLE and depending only on its argument, so the planner can inline it
-- rather than calling it per row.
-- -----------------------------------------------------------------------------

create or replace function public.customer_may_edit(status public.application_status)
returns boolean
language sql
immutable
parallel safe
set search_path = public, pg_temp as $$
  select status in (
    'draft',
    'submitted',
    'initial_review',
    'contact_attempted',
    'contacted',
    'information_requested',
    'documents_requested',
    'documents_received'
  );
$$;

comment on function public.customer_may_edit(public.application_status) is
  'Whether an applicant may still edit their own application at this stage. Matches the new/working grouping in src/lib/crm.ts: open while the file is being gathered, closed once it is being packaged.';

-- Callable by design: it is referenced inside RLS policy expressions, which are
-- evaluated as the calling role. It takes a status and returns a boolean about
-- nothing in particular — there is no data behind it to leak.

-- -----------------------------------------------------------------------------
-- 2. THE POLICIES
--
-- Same shape as 0012 left them, including the `(select auth.uid())` wrapping
-- that migration added so the subquery is evaluated once per statement rather
-- than once per row. Only the status test changes.
-- -----------------------------------------------------------------------------

drop policy if exists "users update own draft applications" on public.applications;
create policy "users update own editable applications" on public.applications
  for update
  using (
    (profile_id = (select auth.uid()) and public.customer_may_edit(status))
    or (select public.is_staff())
  )
  with check (
    (profile_id = (select auth.uid()) and public.customer_may_edit(status))
    or (select public.is_staff())
  );

drop policy if exists "users write own draft answers" on public.application_answers;
create policy "users write own answers" on public.application_answers
  for insert
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and (
          (a.profile_id = (select auth.uid()) and public.customer_may_edit(a.status))
          or (select public.is_staff())
        )
    )
  );

drop policy if exists "users update own draft answers" on public.application_answers;
create policy "users update own answers" on public.application_answers
  for update
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and (
          (a.profile_id = (select auth.uid()) and public.customer_may_edit(a.status))
          or (select public.is_staff())
        )
    )
  );

drop policy if exists "users write own guarantor records" on public.application_owners;
create policy "users write own guarantor records" on public.application_owners
  for insert
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and (
          (a.profile_id = (select auth.uid()) and public.customer_may_edit(a.status))
          or (select public.is_staff())
        )
    )
  );

drop policy if exists "users update own guarantor records" on public.application_owners;
create policy "users update own guarantor records" on public.application_owners
  for update
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and (
          (a.profile_id = (select auth.uid()) and public.customer_may_edit(a.status))
          or (select public.is_staff())
        )
    )
  );

-- -----------------------------------------------------------------------------
-- 3. WHAT A CUSTOMER STILL MAY NOT TOUCH
--
-- RLS grants access to a ROW, never to a COLUMN. With the window widened, the
-- update policy above would happily accept a customer writing their own
-- `status`, `profile_id` or `assigned_to` — the first lets them march their file
-- through the pipeline, the second hands it to someone else, the third assigns
-- Robert's work.
--
-- Column privileges cannot express this either: staff and customers are the same
-- database role (`authenticated`), separated only by is_staff() inside policies.
-- So it is a trigger, on the same reasoning as prevent_role_escalation() in 0005.
--
-- draft -> submitted stays permitted. It was allowed before this migration and
-- is the one status change that is genuinely the applicant's to make.
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
  --
  -- This exemption is load-bearing. claim.ts sets profile_id on the service
  -- role, and without it every account creation would fail on the reassignment
  -- check below.
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

  return new;
end;
$$;

drop trigger if exists guard_customer_application_fields on public.applications;

create trigger guard_customer_application_fields
  before update on public.applications
  for each row execute function public.guard_customer_application_fields();

revoke execute on function public.guard_customer_application_fields()
  from public, anon, authenticated;

comment on function public.guard_customer_application_fields() is
  'Keeps status, profile_id and assigned_to out of a customer''s reach now that they can update their application beyond draft. Exempts requests with no auth.uid(), which is how the service role claims an anonymous prequal.';
