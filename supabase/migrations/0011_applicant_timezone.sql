-- =============================================================================
-- 0011 — APPLICANT TIMEZONE
--
-- Timestamps stay UTC. That is not the problem being solved here, and changing
-- it would break ordering and elapsed-time math across zones.
--
-- The problem is that "created 10:23pm" means something different depending on
-- where the applicant was sitting. Robert works a national pipeline and calls
-- people; knowing whether "now" is 9am or 5am for them is the difference
-- between a good first impression and a wasted attempt.
--
-- Both columns are nullable: a browser that blocks the API, or a lead created
-- through an import, simply has no zone.
-- =============================================================================

alter table public.applications
  add column applicant_timezone text,
  add column applicant_utc_offset_minutes integer;

comment on column public.applications.applicant_timezone is
  'IANA zone reported by the applicant browser, e.g. America/Los_Angeles. Lets staff see the applicant local time before calling. Timestamps stay UTC.';

-- The offset is stored as well as the zone, deliberately. DST rules change by
-- legislation; keeping the offset that applied at submission means a historical
-- local time can still be reconstructed exactly.
comment on column public.applications.applicant_utc_offset_minutes is
  'Offset at submission. Kept alongside the zone so a historical local time can be reconstructed even if DST rules change.';

-- Real offsets run from UTC-12:00 to UTC+14:00. Anything outside that is a bug
-- or a spoofed client, not a place.
alter table public.applications
  add constraint applicant_utc_offset_is_plausible
  check (applicant_utc_offset_minutes is null
         or (applicant_utc_offset_minutes between -840 and 840));
