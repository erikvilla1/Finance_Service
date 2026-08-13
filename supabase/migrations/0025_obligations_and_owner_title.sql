-- =============================================================================
-- 0025 — CLOSE THE TWO GAPS BETWEEN "FINISHED" AND "SENDABLE"
--
-- An applicant completed every question and every document and was told, twice
-- and in green, that they were done. The lender package for the same file read
-- 34 of 36. Both were honest; the form simply does not collect two things the
-- funding application requires.
--
--   Primary owner Title      required by the lender form, optional as a question
--   Existing obligations     required whenever the applicant says they have an
--                            existing advance or loan — and stored in a table
--                            that no screen in the product writes to
--
-- The second is the more serious: `existing_debts` has existed since 0003 with
-- policies, a foreign key and a completeness rule pointing at it, and no way for
-- anybody to put a row in it. Every applicant who answers "yes, I have existing
-- debt" has been permanently unable to finish.
--
-- Telling the applicant they are finished when the file cannot be sent is worse
-- than telling them there is one more thing to do, so both gaps close here
-- rather than the message being softened.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TITLE IS REQUIRED, BECAUSE THE LENDER REQUIRES IT
--
-- FUNDING_APPLICATION_FIELDS marks primary_owner_title required. The question
-- feeding it did not, so a finished form could leave it blank and the shortfall
-- only surfaced on a screen the applicant never sees.
-- -----------------------------------------------------------------------------

update public.application_questions
   set is_required = true,
       help_text = coalesce(help_text, 'For example: Owner, President, Managing Member.')
 where key = 'owner_title'
   and is_active;

-- -----------------------------------------------------------------------------
-- 2. THE EDIT WINDOW 0022 MISSED
--
-- 0022 widened the customer write window on applications, answers and owners
-- from `status = 'draft'` to customer_may_edit(). existing_debts was left
-- behind, purely because nothing wrote to it and so nothing failed.
--
-- The same silent failure applies: past draft, an insert would match no policy,
-- report success, and store nothing.
-- -----------------------------------------------------------------------------

drop policy if exists "users write own debts" on public.existing_debts;
create policy "users write own debts" on public.existing_debts
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

drop policy if exists "users update own debts" on public.existing_debts;
create policy "users update own debts" on public.existing_debts
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
-- 3. A DEBT ROW CAN BE REMOVED
--
-- No delete policy existed. A repeatable list you can add to and never remove
-- from is a list that fills with corrections — someone mistypes a lender, adds
-- it again correctly, and the schedule now shows two loans that are one.
--
-- Hard delete rather than soft: these rows carry no history worth keeping and
-- the table has no deleted_at column. The audit trail for the file lives in
-- application_status_history and audit_logs.
-- -----------------------------------------------------------------------------

create policy "users delete own debts" on public.existing_debts
  for delete
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
