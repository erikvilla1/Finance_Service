-- =============================================================================
-- 0004 — DOCUMENTS, CONSENTS, AUDIT LOG
--
-- Platform spec §23: private object storage, signed time-limited URLs, never
-- public URLs for sensitive documents.
-- BUSINESS_CONTEXT §8: the document checklist is where deals currently die, so
-- the request/fulfil loop is modelled explicitly rather than inferred.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- DOCUMENT REQUESTS — what the specialist asked for
-- -----------------------------------------------------------------------------
create table public.document_requests (
  id                uuid primary key default gen_random_uuid(),
  application_id    uuid not null references public.applications(id) on delete cascade,
  document_type_key text not null references public.document_type_definitions(key),

  is_required       boolean not null default true,
  status            public.document_status not null default 'requested',
  instructions      text,

  requested_by      uuid references public.profiles(id) on delete set null,
  requested_at      timestamptz not null default now(),
  due_date          date,

  -- Drives the portal's progress bar and the automated reminders
  reminder_count    integer not null default 0,
  last_reminder_at  timestamptz,
  satisfied_at      timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (application_id, document_type_key)
);

create index document_requests_app_idx on public.document_requests(application_id);
create index document_requests_status_idx on public.document_requests(status);

-- -----------------------------------------------------------------------------
-- DOCUMENTS — what the customer uploaded
-- -----------------------------------------------------------------------------
create table public.documents (
  id                  uuid primary key default gen_random_uuid(),
  application_id      uuid not null references public.applications(id) on delete cascade,
  document_request_id uuid references public.document_requests(id) on delete set null,
  document_type_key   text references public.document_type_definitions(key),

  -- Path within the private storage bucket. Never a public URL.
  storage_path        text not null,
  file_name           text not null,
  mime_type           text,
  size_bytes          bigint,

  uploaded_by         uuid references public.profiles(id) on delete set null,
  status              public.document_status not null default 'uploaded',
  verification_note   text,
  verified_by         uuid references public.profiles(id) on delete set null,
  verified_at         timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create index documents_app_idx on public.documents(application_id);
create index documents_request_idx on public.documents(document_request_id);

-- -----------------------------------------------------------------------------
-- CONSENTS
--
-- Robert's existing application PDFs already carry compliant FCRA authorization
-- language. BUSINESS_CONTEXT §12: reuse it, do not improvise. This table records
-- which version was shown and accepted, which is the part that matters if it is
-- ever questioned.
-- -----------------------------------------------------------------------------
create table public.consents (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid references public.applications(id) on delete cascade,
  profile_id      uuid references public.profiles(id) on delete set null,

  consent_type    public.consent_type not null,
  granted         boolean not null,

  -- Which wording the person actually saw
  text_version    text not null,
  text_hash       text,

  granted_at      timestamptz not null default now(),
  ip_address      inet,
  user_agent      text,

  created_at      timestamptz not null default now()
);

create index consents_app_idx on public.consents(application_id);
create index consents_type_idx on public.consents(consent_type);

-- -----------------------------------------------------------------------------
-- AUDIT LOG
--
-- Spec §28 and §39: audit logs for important internal actions.
-- BUSINESS_CONTEXT §12: audit logging on PII access is non-negotiable from v1.
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id                uuid primary key default gen_random_uuid(),
  actor_profile_id  uuid references public.profiles(id) on delete set null,
  actor_role        public.user_role,

  action            text not null,
  entity_type       text not null,
  entity_id         uuid,

  -- Redact before writing. Never store raw PII in the audit trail itself.
  changes           jsonb not null default '{}'::jsonb,
  metadata          jsonb not null default '{}'::jsonb,

  ip_address        inet,
  user_agent        text,
  created_at        timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index audit_logs_actor_idx on public.audit_logs(actor_profile_id);
create index audit_logs_created_idx on public.audit_logs(created_at desc);

comment on table public.audit_logs is
  'Append-only. No update or delete policy exists by design.';

-- -----------------------------------------------------------------------------
-- PRIVATE STORAGE BUCKET
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'application-documents',
  'application-documents',
  false,
  26214400, -- 25 MB
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/csv'
  ]
)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- TRIGGERS
-- -----------------------------------------------------------------------------
create trigger set_updated_at before update on public.document_requests
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.documents
  for each row execute function public.set_updated_at();
