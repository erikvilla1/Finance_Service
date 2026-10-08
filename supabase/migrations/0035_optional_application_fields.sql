-- =============================================================================
-- 0035  Three application questions the client wants optional
-- =============================================================================
--
-- Client review (Notion, 09.27): "Get rid of requirements for application —
-- make DBA optional, make preferred contact phone optional, make 'Do you rent
-- or own your premises?' optional."
--
-- Seeds 0008 and 0015 already created all three with is_required = false, so
-- on a database that has only ever been migrated this is a no-op. It exists
-- because the flag is data, not code: a row edited by hand in the dashboard
-- would carry a required mark the repository knows nothing about, and the
-- client reported seeing one. Making the intent a migration makes it true
-- everywhere this schema runs, and makes the next person who flips it do so
-- in a file with a reason on it.
--
-- The landlord follow-ups keep their rule (asked when the answer is "rent");
-- an optional question that is answered still earns its follow-ups.
-- =============================================================================

update public.application_questions
   set is_required = false
 where key in (
   'business_dba',
   'business_preferred_contact_phone',
   'business_premises_status'
 );
