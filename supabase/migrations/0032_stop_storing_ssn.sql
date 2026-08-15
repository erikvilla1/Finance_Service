-- =============================================================================
-- 0032 — WE DO NOT HOLD SOCIAL SECURITY NUMBERS, IN ANY FORM
--
-- The funding application has always treated the full SSN as a signer field:
-- typed on the executed document, rendered into the PDF, never written to a
-- column. That part was right and is unchanged.
--
-- What was inconsistent is that the application form separately asked for the
-- last four digits and stored them in `application_owners.ssn_last4` — and
-- nothing read them. Not the lender package, which takes the full number from
-- the signer. Not the completeness check. Not the pipeline. The column was
-- collected on the strength of a note in fields.ts saying we hold `ssn_last4`
-- only, and then never used for anything.
--
-- So it was regulated personal data, gathered from every applicant, sitting in
-- a table, serving no purpose. The cheapest way to protect data is not to have
-- it.
--
-- DEACTIVATING A QUESTION USUALLY NEEDS A CONVERSATION. CONTRIBUTING says so,
-- and for good reason — `prequal_credit_band` was switched off once and silently
-- starved the qualification engine of credit data. This one is safe and the
-- check was run: `grep -rn ssn_last4 src/` finds the mapping that writes it, the
-- validation message for it, and a comment. No reader anywhere.
--
-- The full SSN flow is untouched: the signer types it, buildFundingApplicationPdf
-- draws it into the document, and it leaves scope. buildMergePayload excludes
-- signer fields structurally, so no future change can start sending what we do
-- not hold.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. STOP ASKING
--
-- Deactivated rather than deleted. The row records that this was once asked,
-- and existing application_answers rows keep their foreign key. Turning it back
-- on would be a one-line change if a lender ever demands it — but it would need
-- a reason, and there is no reader today.
-- -----------------------------------------------------------------------------

update public.application_questions
   set is_active = false
 where key = 'owner_ssn_last4';

-- -----------------------------------------------------------------------------
-- 2. DROP WHAT WAS ALREADY COLLECTED
--
-- Deactivating the question stops new ones arriving; it does nothing about the
-- ones already there. Data you have decided not to hold is not made safe by
-- deciding to stop collecting more of it.
--
-- The column stays. Dropping it would break `application_owners` row types
-- across the app for a column that is now uniformly null, and leaving it empty
-- makes the decision visible to the next person reading the schema.
-- -----------------------------------------------------------------------------

update public.application_owners
   set ssn_last4 = null
 where ssn_last4 is not null;

comment on column public.application_owners.ssn_last4 is
  'Deliberately unused as of 0032. We do not store Social Security numbers in any form — the full number is typed by the signer on the executed document and never persisted. Kept as a column rather than dropped so the decision is visible; do not start writing to it without a reason and a compliance review.';

-- -----------------------------------------------------------------------------
-- 3. THE SAME LOGIC DOES NOT APPLY TO ein_last4
--
-- A Tax ID identifies a business, not a person. The last four is what lets a
-- specialist match a file to a lender's reference on a phone call, it is on
-- Robert's paper form for that reason, and it carries none of the risk that
-- makes an SSN worth refusing. Left exactly as it is.
-- -----------------------------------------------------------------------------
