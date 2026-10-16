-- -----------------------------------------------------------------------------
-- The first-run dashboard tour runs once per account.
--
-- It used to be remembered in the browser (localStorage, keyed by user id),
-- which meant a second laptop, a phone, or a cleared cache ran the welcome
-- tour again — over a file that was weeks old and already complete. The
-- client's brief is one showing: right after the account is created, the
-- first time the dashboard opens. So the flag moves onto the profile, where
-- it follows the person rather than the device.
--
-- EXISTING ACCOUNTS ARE MARKED AS HAVING SEEN IT. They are not new, and the
-- tour is a welcome. The walkthrough itself stays available under
-- "How this works" for anyone who wants it again.
--
-- Written by the applicant's own client through "users update own profile"
-- (0012); the role-escalation guard is indifferent to this column.
-- -----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists tour_seen_at timestamptz;

comment on column public.profiles.tour_seen_at is
  'When the first-run dashboard tour was shown. Null means not yet: it runs on the next dashboard visit, then never again.';

update public.profiles
   set tour_seen_at = now()
 where tour_seen_at is null;
