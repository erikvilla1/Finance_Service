-- =============================================================================
-- 0005 — ROW LEVEL SECURITY
--
-- Platform spec §21: strict RLS. Customers access only their own records.
-- Internal employees access only what their role permits. Never rely on
-- frontend authorization alone.
--
-- Model:
--   • Config tables      → public read when active/published, admin write
--   • Customer records   → owner reads own, staff read all
--   • Sensitive PII      → owner reads own, staff only (no anon path at all)
--   • Qualification      → read-only to clients; written server-side only
--   • Audit log          → admin read, append-only, never written from a client
--
-- Anonymous prequalification is handled by server actions using the service
-- role, not by an anon INSERT policy. That keeps the write path in code we
-- control and validate, rather than exposing table-level insert to the world.
-- =============================================================================

alter table public.product_categories        enable row level security;
alter table public.financing_products        enable row level security;
alter table public.application_questions     enable row level security;
alter table public.question_options          enable row level security;
alter table public.question_rules            enable row level security;
alter table public.qualification_rulesets    enable row level security;
alter table public.document_type_definitions enable row level security;
alter table public.profiles                  enable row level security;
alter table public.businesses                enable row level security;
alter table public.applications              enable row level security;
alter table public.application_answers       enable row level security;
alter table public.application_owners        enable row level security;
alter table public.qualification_results     enable row level security;
alter table public.document_requests         enable row level security;
alter table public.documents                 enable row level security;
alter table public.consents                  enable row level security;
alter table public.audit_logs                enable row level security;

-- -----------------------------------------------------------------------------
-- CONFIG TABLES — readable by anyone, writable by admins
-- -----------------------------------------------------------------------------

create policy "categories are publicly readable when active"
  on public.product_categories for select
  using (is_active = true or public.is_staff());

create policy "admins manage categories"
  on public.product_categories for all
  using (public.is_admin()) with check (public.is_admin());

-- Unpublished products are visible to staff only. Combined with the
-- published_products_must_be_verified constraint, unverified terms cannot reach
-- a customer.
create policy "published products are publicly readable"
  on public.financing_products for select
  using ((is_published = true and deleted_at is null) or public.is_staff());

create policy "admins manage products"
  on public.financing_products for all
  using (public.is_admin()) with check (public.is_admin());

create policy "active questions are publicly readable"
  on public.application_questions for select
  using (is_active = true or public.is_staff());

create policy "admins manage questions"
  on public.application_questions for all
  using (public.is_admin()) with check (public.is_admin());

create policy "question options are publicly readable"
  on public.question_options for select
  using (true);

create policy "admins manage question options"
  on public.question_options for all
  using (public.is_admin()) with check (public.is_admin());

create policy "active question rules are publicly readable"
  on public.question_rules for select
  using (is_active = true or public.is_staff());

create policy "admins manage question rules"
  on public.question_rules for all
  using (public.is_admin()) with check (public.is_admin());

-- Qualification thresholds are competitively sensitive and must not be
-- enumerable by applicants — otherwise the form can be gamed.
create policy "staff read qualification rulesets"
  on public.qualification_rulesets for select
  using (public.is_staff());

create policy "admins manage qualification rulesets"
  on public.qualification_rulesets for all
  using (public.is_admin()) with check (public.is_admin());

create policy "document definitions are publicly readable"
  on public.document_type_definitions for select
  using (is_active = true or public.is_staff());

create policy "admins manage document definitions"
  on public.document_type_definitions for all
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- PROFILES
-- -----------------------------------------------------------------------------

create policy "users read own profile"
  on public.profiles for select
  using (id = auth.uid() or public.is_staff());

-- Note: role escalation is prevented at the application layer plus the
-- role-change guard trigger below.
create policy "users update own profile"
  on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy "admins manage profiles"
  on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- Hard stop on privilege escalation: a non-admin cannot change their own role,
-- even though they can update the rest of their profile.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an administrator may change a user role';
  end if;
  return new;
end;
$$;

create trigger guard_role_changes
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- -----------------------------------------------------------------------------
-- BUSINESSES
-- -----------------------------------------------------------------------------

create policy "users read own businesses"
  on public.businesses for select
  using (owner_profile_id = auth.uid() or public.is_staff());

create policy "users insert own businesses"
  on public.businesses for insert
  with check (owner_profile_id = auth.uid());

create policy "users update own businesses"
  on public.businesses for update
  using (owner_profile_id = auth.uid() or public.is_staff())
  with check (owner_profile_id = auth.uid() or public.is_staff());

-- -----------------------------------------------------------------------------
-- APPLICATIONS
-- -----------------------------------------------------------------------------

create policy "users read own applications"
  on public.applications for select
  using (profile_id = auth.uid() or public.is_staff());

create policy "users create own applications"
  on public.applications for insert
  with check (profile_id = auth.uid());

-- Customers may edit only while the application is still a draft. Once
-- submitted, it is a record — staff own it from that point.
create policy "users update own draft applications"
  on public.applications for update
  using (
    (profile_id = auth.uid() and status = 'draft')
    or public.is_staff()
  )
  with check (
    (profile_id = auth.uid() and status in ('draft', 'submitted'))
    or public.is_staff()
  );

-- -----------------------------------------------------------------------------
-- ANSWERS
-- -----------------------------------------------------------------------------

create policy "users read own answers"
  on public.application_answers for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and (a.profile_id = auth.uid() or public.is_staff())
    )
  );

create policy "users write own draft answers"
  on public.application_answers for insert
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and ((a.profile_id = auth.uid() and a.status = 'draft') or public.is_staff())
    )
  );

create policy "users update own draft answers"
  on public.application_answers for update
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and ((a.profile_id = auth.uid() and a.status = 'draft') or public.is_staff())
    )
  );

-- -----------------------------------------------------------------------------
-- OWNERS / GUARANTORS — tightest policy in the schema
-- -----------------------------------------------------------------------------

create policy "users read own guarantor records"
  on public.application_owners for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and (a.profile_id = auth.uid() or public.is_staff())
    )
  );

create policy "users write own guarantor records"
  on public.application_owners for insert
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and ((a.profile_id = auth.uid() and a.status = 'draft') or public.is_staff())
    )
  );

create policy "users update own guarantor records"
  on public.application_owners for update
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and ((a.profile_id = auth.uid() and a.status = 'draft') or public.is_staff())
    )
  );

-- -----------------------------------------------------------------------------
-- QUALIFICATION RESULTS — read-only to everyone; written by the server only
-- -----------------------------------------------------------------------------

create policy "users read own qualification results"
  on public.qualification_results for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and (a.profile_id = auth.uid() or public.is_staff())
    )
  );

-- -----------------------------------------------------------------------------
-- DOCUMENTS
-- -----------------------------------------------------------------------------

create policy "users read own document requests"
  on public.document_requests for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and (a.profile_id = auth.uid() or public.is_staff())
    )
  );

create policy "staff manage document requests"
  on public.document_requests for all
  using (public.is_staff()) with check (public.is_staff());

create policy "users read own documents"
  on public.documents for select
  using (
    deleted_at is null
    and exists (
      select 1 from public.applications a
      where a.id = application_id
        and (a.profile_id = auth.uid() or public.is_staff())
    )
  );

create policy "users upload own documents"
  on public.documents for insert
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and (a.profile_id = auth.uid() or public.is_staff())
    )
  );

create policy "staff update documents"
  on public.documents for update
  using (public.is_staff()) with check (public.is_staff());

-- -----------------------------------------------------------------------------
-- CONSENTS — append-only from the customer's side
--
-- No UPDATE or DELETE policy exists. A consent record that can be edited is
-- worthless as evidence.
-- -----------------------------------------------------------------------------

create policy "users read own consents"
  on public.consents for select
  using (
    profile_id = auth.uid()
    or public.is_staff()
    or exists (
      select 1 from public.applications a
      where a.id = application_id and a.profile_id = auth.uid()
    )
  );

create policy "users record own consents"
  on public.consents for insert
  with check (
    profile_id = auth.uid()
    or exists (
      select 1 from public.applications a
      where a.id = application_id and a.profile_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- AUDIT LOG — admin read only, no client writes
-- -----------------------------------------------------------------------------

create policy "admins read audit logs"
  on public.audit_logs for select
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- STORAGE — private bucket, path-scoped to the application
--
-- Convention: application-documents/{application_id}/{filename}
-- -----------------------------------------------------------------------------

create policy "users read own application files"
  on storage.objects for select
  using (
    bucket_id = 'application-documents'
    and (
      public.is_staff()
      or exists (
        select 1 from public.applications a
        where a.id::text = (storage.foldername(name))[1]
          and a.profile_id = auth.uid()
      )
    )
  );

create policy "users upload to own application folder"
  on storage.objects for insert
  with check (
    bucket_id = 'application-documents'
    and (
      public.is_staff()
      or exists (
        select 1 from public.applications a
        where a.id::text = (storage.foldername(name))[1]
          and a.profile_id = auth.uid()
      )
    )
  );

create policy "staff manage application files"
  on storage.objects for update
  using (bucket_id = 'application-documents' and public.is_staff());

create policy "staff delete application files"
  on storage.objects for delete
  using (bucket_id = 'application-documents' and public.is_staff());
