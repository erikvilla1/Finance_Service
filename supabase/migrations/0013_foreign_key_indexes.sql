-- =============================================================================
-- 0013 — INDEX FOREIGN KEYS
--
-- Postgres indexes the *referenced* side of a foreign key automatically, never
-- the referencing side. Without these, deleting a profile or a product forces a
-- sequential scan of every child table to check the constraint, and joins from
-- the parent do the same.
--
-- Harmless at six rows. Not harmless once the pipeline holds a few thousand
-- applications with answers and documents hanging off each one.
-- =============================================================================

create index if not exists application_answers_question_idx on public.application_answers(question_id);
create index if not exists application_status_history_changed_by_idx on public.application_status_history(changed_by);
create index if not exists applications_business_idx on public.applications(business_id);
create index if not exists applications_category_idx on public.applications(category_id);
create index if not exists applications_product_idx on public.applications(product_id);
create index if not exists consents_profile_idx on public.consents(profile_id);
create index if not exists crm_notes_author_idx on public.crm_notes(author_profile_id);
create index if not exists crm_tasks_created_by_idx on public.crm_tasks(created_by);
create index if not exists document_requests_type_idx on public.document_requests(document_type_key);
create index if not exists document_requests_requested_by_idx on public.document_requests(requested_by);
create index if not exists documents_type_idx on public.documents(document_type_key);
create index if not exists documents_uploaded_by_idx on public.documents(uploaded_by);
create index if not exists documents_verified_by_idx on public.documents(verified_by);
create index if not exists qualification_rulesets_product_idx on public.qualification_rulesets(product_id);
create index if not exists question_rules_product_idx on public.question_rules(product_id);
