-- =============================================================================
-- 0012 — RLS PERFORMANCE: EVALUATE HELPERS ONCE, NOT PER ROW
--
-- A bare auth.uid() or is_staff() inside a policy is re-evaluated for EVERY row
-- the query touches. Wrapping the call in a scalar subquery — (select auth.uid())
-- — lets the planner hoist it into an InitPlan and run it once per statement.
--
-- Semantics are identical. Only the plan changes. This was invisible at six
-- rows and would have become the first thing to hurt as the pipeline grew,
-- which is exactly the kind of problem worth fixing while it is still free.
--
-- Every policy referencing auth.uid(), is_staff(), or is_admin() is rewritten
-- below. Access rules are unchanged; verified afterwards by re-running the
-- anonymous-visibility checks.
-- =============================================================================

-- PROFILES -------------------------------------------------------------------
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
  for select using (id = (select auth.uid()) or (select public.is_staff()));

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- BUSINESSES -----------------------------------------------------------------
drop policy if exists "users read own businesses" on public.businesses;
create policy "users read own businesses" on public.businesses
  for select using (owner_profile_id = (select auth.uid()) or (select public.is_staff()));

drop policy if exists "users insert own businesses" on public.businesses;
create policy "users insert own businesses" on public.businesses
  for insert with check (owner_profile_id = (select auth.uid()));

drop policy if exists "users update own businesses" on public.businesses;
create policy "users update own businesses" on public.businesses
  for update using (owner_profile_id = (select auth.uid()) or (select public.is_staff()))
  with check (owner_profile_id = (select auth.uid()) or (select public.is_staff()));

-- APPLICATIONS ---------------------------------------------------------------
drop policy if exists "users read own applications" on public.applications;
create policy "users read own applications" on public.applications
  for select using (profile_id = (select auth.uid()) or (select public.is_staff()));

drop policy if exists "users create own applications" on public.applications;
create policy "users create own applications" on public.applications
  for insert with check (profile_id = (select auth.uid()));

drop policy if exists "users update own draft applications" on public.applications;
create policy "users update own draft applications" on public.applications
  for update using ((profile_id = (select auth.uid()) and status = 'draft') or (select public.is_staff()))
  with check ((profile_id = (select auth.uid()) and status in ('draft','submitted')) or (select public.is_staff()));

-- ANSWERS --------------------------------------------------------------------
drop policy if exists "users read own answers" on public.application_answers;
create policy "users read own answers" on public.application_answers
  for select using (exists (select 1 from public.applications a
    where a.id = application_id and (a.profile_id = (select auth.uid()) or (select public.is_staff()))));

drop policy if exists "users write own draft answers" on public.application_answers;
create policy "users write own draft answers" on public.application_answers
  for insert with check (exists (select 1 from public.applications a
    where a.id = application_id and ((a.profile_id = (select auth.uid()) and a.status = 'draft') or (select public.is_staff()))));

drop policy if exists "users update own draft answers" on public.application_answers;
create policy "users update own draft answers" on public.application_answers
  for update using (exists (select 1 from public.applications a
    where a.id = application_id and ((a.profile_id = (select auth.uid()) and a.status = 'draft') or (select public.is_staff()))));

-- OWNERS / GUARANTORS --------------------------------------------------------
drop policy if exists "users read own guarantor records" on public.application_owners;
create policy "users read own guarantor records" on public.application_owners
  for select using (exists (select 1 from public.applications a
    where a.id = application_id and (a.profile_id = (select auth.uid()) or (select public.is_staff()))));

drop policy if exists "users write own guarantor records" on public.application_owners;
create policy "users write own guarantor records" on public.application_owners
  for insert with check (exists (select 1 from public.applications a
    where a.id = application_id and ((a.profile_id = (select auth.uid()) and a.status = 'draft') or (select public.is_staff()))));

drop policy if exists "users update own guarantor records" on public.application_owners;
create policy "users update own guarantor records" on public.application_owners
  for update using (exists (select 1 from public.applications a
    where a.id = application_id and ((a.profile_id = (select auth.uid()) and a.status = 'draft') or (select public.is_staff()))));

-- QUALIFICATION RESULTS ------------------------------------------------------
drop policy if exists "users read own qualification results" on public.qualification_results;
create policy "users read own qualification results" on public.qualification_results
  for select using (exists (select 1 from public.applications a
    where a.id = application_id and (a.profile_id = (select auth.uid()) or (select public.is_staff()))));

-- DOCUMENTS ------------------------------------------------------------------
drop policy if exists "users read own document requests" on public.document_requests;
create policy "users read own document requests" on public.document_requests
  for select using (exists (select 1 from public.applications a
    where a.id = application_id and (a.profile_id = (select auth.uid()) or (select public.is_staff()))));

drop policy if exists "staff manage document requests" on public.document_requests;
create policy "staff manage document requests" on public.document_requests
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists "users read own documents" on public.documents;
create policy "users read own documents" on public.documents
  for select using (deleted_at is null and exists (select 1 from public.applications a
    where a.id = application_id and (a.profile_id = (select auth.uid()) or (select public.is_staff()))));

drop policy if exists "users upload own documents" on public.documents;
create policy "users upload own documents" on public.documents
  for insert with check (exists (select 1 from public.applications a
    where a.id = application_id and (a.profile_id = (select auth.uid()) or (select public.is_staff()))));

drop policy if exists "staff update documents" on public.documents;
create policy "staff update documents" on public.documents
  for update using ((select public.is_staff())) with check ((select public.is_staff()));

-- CONSENTS -------------------------------------------------------------------
drop policy if exists "users read own consents" on public.consents;
create policy "users read own consents" on public.consents
  for select using (profile_id = (select auth.uid()) or (select public.is_staff())
    or exists (select 1 from public.applications a where a.id = application_id and a.profile_id = (select auth.uid())));

drop policy if exists "users record own consents" on public.consents;
create policy "users record own consents" on public.consents
  for insert with check (profile_id = (select auth.uid())
    or exists (select 1 from public.applications a where a.id = application_id and a.profile_id = (select auth.uid())));

-- AUDIT ----------------------------------------------------------------------
drop policy if exists "admins read audit logs" on public.audit_logs;
create policy "admins read audit logs" on public.audit_logs
  for select using ((select public.is_admin()));

-- CRM ------------------------------------------------------------------------
drop policy if exists "staff read notes" on public.crm_notes;
create policy "staff read notes" on public.crm_notes
  for select using ((select public.is_staff()));

drop policy if exists "staff write notes" on public.crm_notes;
create policy "staff write notes" on public.crm_notes
  for insert with check ((select public.is_staff()));

drop policy if exists "authors edit own notes" on public.crm_notes;
create policy "authors edit own notes" on public.crm_notes
  for update using ((select public.is_staff()) and author_profile_id = (select auth.uid()))
  with check ((select public.is_staff()) and author_profile_id = (select auth.uid()));

drop policy if exists "staff manage tasks" on public.crm_tasks;
create policy "staff manage tasks" on public.crm_tasks
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists "staff read status history" on public.application_status_history;
create policy "staff read status history" on public.application_status_history
  for select using ((select public.is_staff()));

-- CONFIG TABLES --------------------------------------------------------------
drop policy if exists "categories are publicly readable when active" on public.product_categories;
create policy "categories are publicly readable when active" on public.product_categories
  for select using (is_active = true or (select public.is_staff()));

drop policy if exists "published products are publicly readable" on public.financing_products;
create policy "published products are publicly readable" on public.financing_products
  for select using ((is_published = true and deleted_at is null) or (select public.is_staff()));

drop policy if exists "active questions are publicly readable" on public.application_questions;
create policy "active questions are publicly readable" on public.application_questions
  for select using (is_active = true or (select public.is_staff()));

drop policy if exists "active question rules are publicly readable" on public.question_rules;
create policy "active question rules are publicly readable" on public.question_rules
  for select using (is_active = true or (select public.is_staff()));

drop policy if exists "staff read qualification rulesets" on public.qualification_rulesets;
create policy "staff read qualification rulesets" on public.qualification_rulesets
  for select using ((select public.is_staff()));

drop policy if exists "document definitions are publicly readable" on public.document_type_definitions;
create policy "document definitions are publicly readable" on public.document_type_definitions
  for select using (is_active = true or (select public.is_staff()));

-- STORAGE --------------------------------------------------------------------
drop policy if exists "users read own application files" on storage.objects;
create policy "users read own application files" on storage.objects
  for select using (bucket_id = 'application-documents' and ((select public.is_staff())
    or exists (select 1 from public.applications a
      where a.id::text = (storage.foldername(name))[1] and a.profile_id = (select auth.uid()))));

drop policy if exists "users upload to own application folder" on storage.objects;
create policy "users upload to own application folder" on storage.objects
  for insert with check (bucket_id = 'application-documents' and ((select public.is_staff())
    or exists (select 1 from public.applications a
      where a.id::text = (storage.foldername(name))[1] and a.profile_id = (select auth.uid()))));

drop policy if exists "staff manage application files" on storage.objects;
create policy "staff manage application files" on storage.objects
  for update using (bucket_id = 'application-documents' and (select public.is_staff()));

drop policy if exists "staff delete application files" on storage.objects;
create policy "staff delete application files" on storage.objects
  for delete using (bucket_id = 'application-documents' and (select public.is_staff()));
