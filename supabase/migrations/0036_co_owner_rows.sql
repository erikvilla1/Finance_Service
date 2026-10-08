-- =============================================================================
-- 0036  Additional owners can be removed by the applicant
-- =============================================================================
--
-- The owner section now grows additional-owner lines whenever the primary
-- share is under 100% (client review, Notion 09.27), stored as the
-- non-primary rows of application_owners. A line that can be added and never
-- removed is a line that fills with corrections — so, as 0025 did for the debt
-- schedule, applicants may delete their own rows, within the same edit window.
--
-- NEVER THE PRIMARY ROW. The primary owner's record is what the account, the
-- notifications and the signed document hang off; the policy admits only
-- is_primary = false, so no form can take it away, and staff keep the full
-- table as before.
-- =============================================================================

create policy "users delete own co-owner records" on public.application_owners
  for delete
  using (
    is_primary = false
    and exists (
      select 1 from public.applications a
      where a.id = application_id
        and (
          (a.profile_id = (select auth.uid()) and public.customer_may_edit(a.status))
          or (select public.is_staff())
        )
    )
  );
