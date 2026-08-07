"use client";

import { useEffect, useState } from "react";

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
  const [zone, setZone] = useState("");
  const [offset, setOffset] = useState("");

  useEffect(() => {
    try {
      setZone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
      // getTimezoneOffset returns minutes *behind* UTC, so Pacific is +480.
      // Negating gives the conventional sign: Pacific is UTC-8, i.e. -480.
      setOffset(String(-new Date().getTimezoneOffset()));
    } catch {
      // No zone reported. The columns are nullable for exactly this case.
    }
  }, []);

  return (
    <>
      <input type="hidden" name="applicant_timezone" value={zone} />
      <input type="hidden" name="applicant_utc_offset_minutes" value={offset} />
    </>
  );
}
