-- =============================================================================
-- 0010 — CRM: NOTES, TASKS, STATUS HISTORY
--
-- The CRM scope question logged as open in docs/BUSINESS_CONTEXT.md §14.1 is
-- now settled: built in-house, not an off-the-shelf tool. The platform is
-- replacing Airtable outright, so the pipeline lives here.
--
-- Deliberately still small. Spec §18 lists a long feature set; this adds only
-- what the pipeline view actually needs — notes, tasks, and an audit of status
-- changes. Communications and lender submissions come later.
-- =============================================================================

create table public.crm_notes (
  id                uuid primary key default gen_random_uuid(),
  application_id    uuid not null references public.applications(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  body              text not null,
  is_pinned         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index crm_notes_app_idx on public.crm_notes(application_id, created_at desc);

comment on table public.crm_notes is
  'Internal only. Never exposed to customers - platform spec section 18.';

create table public.crm_tasks (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  assigned_to    uuid references public.profiles(id) on delete set null,
  created_by     uuid references public.profiles(id) on delete set null,
  title          text not null,
  details        text,
  due_date       date,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index crm_tasks_app_idx on public.crm_tasks(application_id);
create index crm_tasks_open_idx on public.crm_tasks(assigned_to, due_date)
  where completed_at is null;

-- -----------------------------------------------------------------------------
-- STATUS HISTORY
--
-- Spec §18 wants audit history on the pipeline, and §19's "average time to
-- first contact" and "average time to funding" metrics are uncomputable without
-- it. Recording it in a trigger rather than in application code means a status
-- changed by any route — admin UI, SQL, a future API — still gets captured.
-- -----------------------------------------------------------------------------
create table public.application_status_history (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  from_status    public.application_status,
  to_status      public.application_status not null,
  changed_by     uuid references public.profiles(id) on delete set null,
  note           text,
  created_at     timestamptz not null default now()
);
create index application_status_history_app_idx
  on public.application_status_history(application_id, created_at desc);

comment on table public.application_status_history is
  'Append-only pipeline audit. Answers "who moved this and when" without trusting memory.';

create or replace function public.record_status_change()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if new.status is distinct from old.status then
    insert into public.application_status_history
      (application_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger track_status_changes
  after update on public.applications
  for each row execute function public.record_status_change();

revoke execute on function public.record_status_change() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- RLS — staff only, all three tables
--
-- Spec §18: "Never expose internal CRM data to customers." There is no
-- customer-facing policy on any of these, which is the point.
-- -----------------------------------------------------------------------------
alter table public.crm_notes enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.application_status_history enable row level security;

create policy "staff read notes" on public.crm_notes
  for select using (public.is_staff());
create policy "staff write notes" on public.crm_notes
  for insert with check (public.is_staff());

-- Notes are a record of what a specialist thought at a point in time, so only
-- the author may revise their own. No delete policy at all.
create policy "authors edit own notes" on public.crm_notes
  for update using (public.is_staff() and author_profile_id = auth.uid())
  with check (public.is_staff() and author_profile_id = auth.uid());

create policy "staff manage tasks" on public.crm_tasks
  for all using (public.is_staff()) with check (public.is_staff());

-- Read-only even to staff. Written by the trigger, never by hand.
create policy "staff read status history" on public.application_status_history
  for select using (public.is_staff());

create trigger set_updated_at before update on public.crm_notes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.crm_tasks
  for each row execute function public.set_updated_at();
