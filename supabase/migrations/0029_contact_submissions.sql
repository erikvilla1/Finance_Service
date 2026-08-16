-- =============================================================================
-- 0027 — CONTACT SUBMISSIONS
--
-- The site has had a Contact section since it was built and no way to be
-- contacted through it. This is that table.
--
-- SEPARATE FROM `applications`, DELIBERATELY. An application is a financing
-- request the engine has an opinion about; this is a message from someone who
-- may not want financing at all. Folding them together would put rows with no
-- track, no amount and no qualification result into the pipeline Robert works
-- every morning, and he would learn to scroll past them.
--
-- NO AI, NO ELIGIBILITY, NO TERMS. Worth writing down because it will be asked:
-- a conversational assistant on this surface would sit one careless sentence
-- away from an eligibility determination, which under Regulation B is a credit
-- decision requiring specific principal reasons. The prequal engine can produce
-- those; prose cannot. This table exists so contact is a message and a callback,
-- and qualification stays behind the engine.
-- =============================================================================

create type public.contact_status as enum ('new', 'in_progress', 'closed');

create table public.contact_submissions (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  name               text not null,
  -- text, not citext: the extension is not enabled on this database (only
  -- pgcrypto is, per migration 0001) and turning it on for one column would be
  -- a bigger change than the column is worth. Addresses are lower-cased by the
  -- server action before insert, which gets the same comparison behaviour.
  email              text not null,
  phone              text,
  message            text not null,

  status             public.contact_status not null default 'new',
  handled_by         uuid references public.profiles(id) on delete set null,
  handled_at         timestamptz,

  source             text not null default 'website',
  applicant_timezone text,

  -- Same idempotency device as migration 0018 on applications: minted per form
  -- render, so a double-click or a browser retry cannot file the same message
  -- twice. Nullable because a submission that arrives without one is still a
  -- person trying to reach us and must not be dropped.
  submission_token   uuid
);

-- Length ceilings rather than an exhaustive format check. The point is to stop
-- a paste of a whole document reaching the database, not to adjudicate what a
-- valid name looks like — that judgement rejects real people.
alter table public.contact_submissions
  add constraint contact_name_length    check (char_length(name) between 1 and 200),
  add constraint contact_message_length check (char_length(message) between 1 and 5000),
  add constraint contact_phone_length   check (phone is null or char_length(phone) <= 40);

-- Deliberately loose: one @, no spaces, a dot in the domain. Anything stricter
-- rejects addresses that genuinely deliver, and the only way to truly verify an
-- address is to send to it.
alter table public.contact_submissions
  add constraint contact_email_shape
  check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

create unique index contact_submissions_token_idx
  on public.contact_submissions (submission_token)
  where submission_token is not null;

create index contact_submissions_status_idx
  on public.contact_submissions (status, created_at desc);

create trigger set_contact_submissions_updated_at
  before update on public.contact_submissions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
--
-- No insert policy. Submissions arrive from anonymous visitors through a server
-- action on the service role, exactly like the prequal — the write path stays
-- in code we control and validate rather than exposing table-level insert to
-- the anon role. With RLS enabled and no policy granting it, anon and
-- authenticated cannot write here at all.
-- ---------------------------------------------------------------------------
alter table public.contact_submissions enable row level security;

create policy "staff read contact submissions"
  on public.contact_submissions for select
  using (public.is_staff());

create policy "staff update contact submissions"
  on public.contact_submissions for update
  using (public.is_staff()) with check (public.is_staff());

comment on table public.contact_submissions is
  'Messages from the website contact form. Not applications — no track, no amount, no qualification result. Written by a server action on the service role.';
