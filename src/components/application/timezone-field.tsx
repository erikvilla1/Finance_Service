"use client";

import { useSyncExternalStore } from "react";

/** Nothing to subscribe to: both values are fixed for the life of the page. */
const NEVER_CHANGES = () => () => {};

/**
 * Reports the applicant's timezone with the submission.
 *
 * Only the browser knows this — there is no reliable server-side equivalent.
 * IP geolocation guesses, and guesses wrong often enough to be worse than
 * nothing when the output is "is it a reasonable hour to call this person".
 *
 * Fails silently by design. Hardened browsers can refuse the API, and a missing
 * timezone must never block an application.
 */
export function TimezoneField() {
  /**
   * Read during render through useSyncExternalStore rather than set from an
   * effect. Nothing here ever changes for the life of the page, so subscribe is
   * a no-op — the hook is being used for its two-snapshot shape, which is what
   * lets the server render an empty value and the client render the real one
   * without a setState in an effect body.
   */
  const zone = useSyncExternalStore(
    NEVER_CHANGES,
    () => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
      } catch {
        // Hardened browsers can refuse the API. The columns are nullable for
        // exactly this case.
        return "";
      }
    },
    () => "",
  );

  const offset = useSyncExternalStore(
    NEVER_CHANGES,
    () => {
      try {
        // getTimezoneOffset returns minutes *behind* UTC, so Pacific is +480.
        // Negating gives the conventional sign: Pacific is UTC-8, i.e. -480.
        return String(-new Date().getTimezoneOffset());
      } catch {
        return "";
      }
    },
    () => "",
  );

  return (
    <>
      <input type="hidden" name="applicant_timezone" value={zone} />
      <input type="hidden" name="applicant_utc_offset_minutes" value={offset} />
    </>
  );
}
