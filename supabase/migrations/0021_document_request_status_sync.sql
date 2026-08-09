-- =============================================================================
-- 0021 — THE CHECKLIST KEEPS ITSELF HONEST
--
-- BUSINESS_CONTEXT §8: the document checklist is where deals currently die. The
-- request/fulfil loop was modelled in 0004, but nothing ever closed it — a row
-- landing in public.documents left its document_requests row still reading
-- 'requested'. The customer sees "still needed" beside a file they uploaded
-- twenty minutes ago, and the specialist chasing the checklist chases a document
-- that already arrived.
--
-- WHY THIS IS NOT DONE IN THE APPLICATION. Customers have no UPDATE policy on
-- document_requests (0005), and correctly so — a status column a customer can
-- write is a customer who can mark their own documents accepted. That leaves two
-- options: a service-role call on every upload, or the database maintaining its
-- own derived state. The service-role path spreads RLS-bypassing code across the
-- upload flow to maintain a column the database can compute for itself, so:
-- here, once, in a trigger.
--
-- Three things are added:
--   1. A composite foreign key, so a document cannot be filed against another
--      application's request.
--   2. A trigger that recomputes document_requests.status from the documents
--      actually attached to it.
--   3. withdraw_document(), so someone who uploaded the wrong file can take it
--      back before anyone has looked at it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. A DOCUMENT BELONGS TO ITS OWN APPLICATION'S REQUEST
--
-- document_requests.application_id and documents.application_id were free to
-- disagree. The upload path sets both from the same row, but "the current code
-- happens to be careful" is not a constraint, and a mismatch would have the
-- trigger below advancing a checklist item on an application the file was never
-- filed against.
--
-- The unique on (id, application_id) is redundant against the primary key and
-- exists only because a composite foreign key needs something to point at.
-- -----------------------------------------------------------------------------

alter table public.document_requests
  add constraint document_requests_id_application_key
  unique (id, application_id);

alter table public.documents
  add constraint documents_request_same_application_fkey
  foreign key (document_request_id, application_id)
  references public.document_requests(id, application_id)
  on delete set null;

-- -----------------------------------------------------------------------------
-- 2. DERIVE THE REQUEST STATUS FROM THE DOCUMENTS ATTACHED TO IT
--
-- Recomputed from scratch on every change rather than nudged one step at a time.
-- A request can hold several documents — a rejected first attempt, a replacement,
-- a specialist's own copy — and incremental updates get those orderings wrong.
-- Recomputing is idempotent and has no history to be wrong about.
--
-- Precedence, strongest first:
--   accepted     — one accepted document satisfies the request
--   under_review — a specialist has it open
--   uploaded     — something is waiting to be looked at
--   rejected     — everything sent so far was turned down
--   requested    — nothing outstanding has been uploaded
--
-- 'waived' is never overwritten. A waiver is a specialist deciding the document
-- is not needed at all, and a customer uploading something anyway should not
-- quietly reopen a closed item.
--
-- SECURITY DEFINER is required, not decorative: the invoking customer has no
-- UPDATE policy on document_requests, so as an invoker-rights function this
-- would update zero rows and report success.
-- -----------------------------------------------------------------------------

create or replace function public.refresh_document_request_status(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  derived public.document_status;
begin
  if request_id is null then
    return;
  end if;

  select case
    when count(*) filter (where d.status = 'accepted')     > 0 then 'accepted'
    when count(*) filter (where d.status = 'under_review') > 0 then 'under_review'
    when count(*) filter (where d.status = 'uploaded')     > 0 then 'uploaded'
    when count(*) filter (where d.status = 'rejected')     > 0 then 'rejected'
    else 'requested'
  end
    into derived
    from public.documents d
   where d.document_request_id = request_id
     and d.deleted_at is null;

  update public.document_requests r
     set status = derived,
         -- Set when the request is first satisfied, cleared if it stops being
         -- satisfied. A stale satisfied_at on a reopened request would report a
         -- turnaround time that never happened.
         satisfied_at = case
           when derived = 'accepted' then coalesce(r.satisfied_at, now())
           else null
         end
   where r.id = request_id
     and r.status <> 'waived'
     -- Skip no-op writes so updated_at keeps meaning "something changed".
     and (
       r.status is distinct from derived
       or (derived = 'accepted') = (r.satisfied_at is null)
     );
end;
$$;

comment on function public.refresh_document_request_status(uuid) is
  'Recomputes one document_requests row from the documents attached to it. Called by the trigger on public.documents; not intended to be called directly.';

create or replace function public.sync_document_request_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp as $$
begin
  -- Both sides on re-parenting: the request the document left is now one
  -- document lighter and may no longer be satisfied.
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_document_request_status(old.document_request_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_document_request_status(new.document_request_id);
  end if;

  return null; -- AFTER trigger; the return value is discarded
end;
$$;

drop trigger if exists sync_document_request_status on public.documents;

create trigger sync_document_request_status
  after insert or update or delete on public.documents
  for each row execute function public.sync_document_request_status();

-- 0007's rule: trigger functions have no business being reachable as /rpc/.
revoke execute on function public.sync_document_request_status()
  from public, anon, authenticated;
revoke execute on function public.refresh_document_request_status(uuid)
  from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. WITHDRAWING A FILE UPLOADED IN ERROR
--
-- Someone attaches last year's bank statements, notices immediately, and has no
-- way to take them back: customers hold INSERT on documents but not UPDATE, and
-- rightly — a customer with UPDATE on that table can set status = 'accepted'.
--
-- Column-level grants cannot separate the two cases here, because staff and
-- customers are the same database role (`authenticated`) distinguished only by
-- is_staff() inside policies. So the narrow operation gets its own function
-- instead of widening the table.
--
-- Only the owner of the application, only while the file is still 'uploaded' —
-- once a specialist has it open or has ruled on it, withdrawal is a conversation,
-- not a button. Soft delete only: the storage object and the row both stay for
-- the audit trail (spec §28).
-- -----------------------------------------------------------------------------

create or replace function public.withdraw_document(document_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  affected integer;
begin
  update public.documents d
     set deleted_at = now()
   where d.id = document_id
     and d.deleted_at is null
     and d.status = 'uploaded'
     and exists (
       select 1 from public.applications a
        where a.id = d.application_id
          and a.profile_id = auth.uid()
     );

  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

comment on function public.withdraw_document(uuid) is
  'Lets an applicant retract their own upload while it is still awaiting review. Soft delete only. Returns false rather than raising when the document is gone, already reviewed, or belongs to someone else — the caller cannot distinguish those cases, which is the point.';

revoke execute on function public.withdraw_document(uuid) from public, anon;
grant execute on function public.withdraw_document(uuid) to authenticated;

-- The security advisor flags this as a SECURITY DEFINER function reachable at
-- /rpc/withdraw_document by signed-in users, and it is right that it is. Left
-- that way deliberately, on the same reasoning 0007 applied to is_staff(): the
-- function takes one id, authorises against auth.uid() rather than against
-- anything the caller supplies, and returns a bare boolean. Someone POSTing
-- uuids at it directly learns nothing they could not learn from the page, and
-- changes nothing that is not already theirs.

-- -----------------------------------------------------------------------------
-- 4. BRING EXISTING ROWS INTO LINE
--
-- No documents exist yet, so this is a no-op today. It runs anyway: this file
-- has to be correct on a database that has been in use, not just on an empty one.
-- -----------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in select distinct document_request_id
             from public.documents
            where document_request_id is not null
  loop
    perform public.refresh_document_request_status(r.document_request_id);
  end loop;
end;
$$;
