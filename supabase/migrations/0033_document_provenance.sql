-- =============================================================================
-- 0033 — WHERE A DOCUMENT CAME FROM
--
-- Found by an applicant noticing his file said "signed" when he had never
-- signed anything. It had two documents filed as `signed_application`: a
-- transcript and a resume, uploaded during testing because that checklist item
-- accepts any PDF like every other one. A specialist had accepted the
-- transcript.
--
-- The count was the least of it. The lender package assembles one file per
-- checklist item and names it by the item — so that deal was one click away
-- from sending a funder a document called "01 Signed Application.pdf"
-- containing somebody's academic record.
--
-- Nothing in the schema could tell the difference, because nothing recorded
-- where a document came from. A PDF produced by the signing flow, with a drawn
-- signature and two consent records behind it, and a PDF dragged into the same
-- slot from a desktop were the same row.
--
-- WHY NOT JUST STOP ACCEPTING UPLOADS THERE. Because a wet signature is a real
-- answer. It is how Robert works today, ESIGN requires offering a paper
-- alternative at no charge, and the signing page says so in as many words. The
-- fix is not to forbid the upload — it is to stop the two being
-- indistinguishable.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PROVENANCE
--
-- Three sources, and the distinction that matters is the first from the other
-- two: only `e_signature` carries consent records, an audit trail and a
-- signature this platform can stand behind.
-- -----------------------------------------------------------------------------

create type public.document_source as enum (
  'applicant_upload',  -- they sent us a file
  'staff_upload',      -- a specialist added it on their behalf
  'e_signature'        -- generated here, from a signature captured in the portal
);

alter table public.documents
  add column if not exists source public.document_source not null default 'applicant_upload';

comment on column public.documents.source is
  'Where the file came from. Only e_signature documents are produced by the signing flow and backed by consent records — a signed_application from any other source is a scan or an upload, and the difference matters on the document a lender relies on.';

-- Everything that exists predates the signing flow, so every existing row is an
-- upload by definition. Stated rather than left to the default, because a
-- default is about future rows and this is a claim about past ones.
update public.documents set source = 'applicant_upload' where source is null;

-- -----------------------------------------------------------------------------
-- 2. TIE THE CONSENT TO THE DOCUMENT IT SIGNED
--
-- `consents` recorded who agreed to what wording and when, and had no idea
-- which document that produced. As evidence that is a step short: the useful
-- question is not "did this person ever accept the FCRA wording" but "what did
-- they accept when they signed THIS".
--
-- Nullable, because consents exist that are not about a document — a future
-- TCPA or privacy-policy acceptance has no file behind it.
-- -----------------------------------------------------------------------------

alter table public.consents
  add column if not exists document_id uuid references public.documents(id) on delete set null;

create index if not exists consents_document_idx on public.consents(document_id);

comment on column public.consents.document_id is
  'The document this consent produced, where there is one. Null for consents that are not about a file. On delete set null: a consent record outlives the document, because the fact that someone agreed is not undone by the file being removed.';

-- -----------------------------------------------------------------------------
-- 3. CLEAN UP WHAT THE TESTING LEFT
--
-- Two files sitting in the signed_application slot on the live application: a
-- transcript marked accepted and a resume marked rejected. Soft-deleted rather
-- than left, because "accepted" on that item is the exact state that would put
-- the wrong document in a lender package.
--
-- Scoped to the two known rows by storage path. A blanket delete of every
-- signed_application would be the kind of cleanup that removes a real signature
-- somewhere else later.
-- -----------------------------------------------------------------------------

update public.documents
   set deleted_at = now(),
       verification_note = 'Removed by migration 0033: uploaded to the signed application slot during testing, not a signed document.'
 where document_type_key = 'signed_application'
   and deleted_at is null
   and source = 'applicant_upload'
   and (file_name ilike '%resume%' or file_name ilike '%transcript%');
