-- =============================================================================
-- 0018 — PREQUAL: SUBMISSION IDEMPOTENCY
--
-- Fixes duplicate applications from repeated submission of the tier-one form.
--
-- THE BUG. submitPrequal performs six sequential round trips before it
-- redirects. During that window the page is visually unchanged, so applicants
-- click again — and every click was a complete, independent submission. Nothing
-- in the schema could catch it: reference_code and public_token are both unique
-- but both DEFAULTED, so a second insert simply mints a second of each. The
-- result was two applications, two reference codes, and two leads in the CRM
-- that a specialist had to manually recognise as one person.
--
-- THE FIX. Each render of the prequal form mints a token and carries it in a
-- hidden field. The token is written with the application and constrained to be
-- unique, so a repeat submission of the same form fails the constraint instead
-- of inserting. The action catches that failure, resolves the token to the
-- application that already exists, and sends the applicant to their result.
--
-- WHY A TOKEN AND NOT A CONTENT HASH. Two people can legitimately submit
-- identical answers — same goal, same bands, same round-numbered amount — and
-- deduplicating on content would silently merge two real leads into one. That
-- is a worse failure than the one being fixed: a duplicate is visible and can
-- be merged, a swallowed applicant is not. The token is per form render, so it
-- identifies a SUBMISSION rather than a person or a set of answers.
--
-- NULLABLE ON PURPOSE. Every application written before this migration has no
-- token, and applications created through other paths (staff entry, future
-- import) have no form render to mint one. The index is partial so those rows
-- coexist rather than collide.
-- =============================================================================

alter table public.applications
  add column if not exists submission_token uuid;

comment on column public.applications.submission_token is
  'Idempotency key minted per prequal form render. Unique where present, so a repeated submission of the same form is rejected rather than duplicated. Null for applications not created through the public prequal form.';

-- Partial rather than a plain unique constraint. Postgres already treats NULLs
-- as distinct, so a full unique index would also work — but stating the
-- predicate makes the intent explicit to the next reader and keeps the index
-- limited to rows that actually carry a token.
create unique index if not exists applications_submission_token_idx
  on public.applications (submission_token)
  where submission_token is not null;
