"use client";

import { useEffect, useRef } from "react";

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
  const zoneRef = useRef<HTMLInputElement>(null);
  const offsetRef = useRef<HTMLInputElement>(null);

  // Writes to the inputs directly rather than through state.
  //
  // The previous version called setState inside this effect, which
  // react-hooks/set-state-in-effect rejects: it renders once with an empty
  // value, then immediately again with the real one. Two fields on a hidden
  // input is harmless in practice, but it was the only lint error in the repo
  // and a CI gate that is red from the first commit is a gate everyone learns
  // to ignore.
  //
  // Populating a DOM node from a browser-only API is squarely what effects are
  // for — synchronising with an external system — so this is the shape the rule
  // is steering towards, not a workaround for it.
  useEffect(() => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
      // getTimezoneOffset returns minutes *behind* UTC, so Pacific is +480.
      // Negating gives the conventional sign: Pacific is UTC-8, i.e. -480.
      const offset = String(-new Date().getTimezoneOffset());

      if (zoneRef.current) zoneRef.current.value = zone;
      if (offsetRef.current) offsetRef.current.value = offset;
    } catch {
      // No zone reported. The columns are nullable for exactly this case.
    }
  }, []);

  return (
    <>
      <input
        ref={zoneRef}
        type="hidden"
        name="applicant_timezone"
        defaultValue=""
      />
      <input
        ref={offsetRef}
        type="hidden"
        name="applicant_utc_offset_minutes"
        defaultValue=""
      />
    </>
  );
}
