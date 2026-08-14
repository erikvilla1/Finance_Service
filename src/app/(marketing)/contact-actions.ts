"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Contact form submission.
 *
 * Runs on the service role because the sender is anonymous — there is no
 * auth.uid() to satisfy an RLS insert policy, and `contact_submissions` grants
 * insert to nobody by design (migration 0027). The write path stays in server
 * code that validates rather than exposing table-level insert to the anon role.
 *
 * WHAT THIS DOES NOT DO. It does not answer, qualify, quote, or estimate. A
 * message goes in; a specialist replies. Anything that reads as an eligibility
 * determination belongs to the prequal engine, which can produce the specific
 * reasons Regulation B requires for an adverse action. Prose cannot.
 */

export interface ContactResult {
  ok: boolean;
  error?: string;
}

/** Deliberately loose — see the matching CHECK constraint in migration 0027. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres unique_violation, raised by contact_submissions_token_idx. */
const UNIQUE_VIOLATION = "23505";

export async function submitContact(
  _prev: ContactResult | null,
  formData: FormData,
): Promise<ContactResult> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 320);
  const phoneRaw = String(formData.get("phone") ?? "").trim().slice(0, 40);
  const message = String(formData.get("message") ?? "").trim().slice(0, 5000);

  if (!name) return { ok: false, error: "Please tell us your name." };
  if (!EMAIL.test(email)) {
    return { ok: false, error: "That email address doesn't look right." };
  }
  if (!message) {
    return { ok: false, error: "Please add a short message so we know how to help." };
  }

  const tokenRaw = String(formData.get("submission_token") ?? "").trim();
  const submissionToken = UUID.test(tokenRaw) ? tokenRaw : null;

  const zoneRaw = String(formData.get("applicant_timezone") ?? "").trim();
  const applicantTimezone =
    zoneRaw && /^[A-Za-z]+\/[A-Za-z_+-]+(\/[A-Za-z_+-]+)?$/.test(zoneRaw)
      ? zoneRaw.slice(0, 64)
      : null;

  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("contact_submissions").insert({
    name,
    email,
    phone: phoneRaw || null,
    message,
    applicant_timezone: applicantTimezone,
    submission_token: submissionToken,
    source: "website",
  });

  // A duplicate token means this exact form render was already submitted — a
  // double-click, or a browser retry. The first one landed, so from the
  // sender's point of view this succeeded. Reporting an error would invite them
  // to send it a third time.
  if (error && error.code === UNIQUE_VIOLATION) return { ok: true };

  if (error) {
    return {
      ok: false,
      error: "We couldn't send that just now. Please try again in a moment.",
    };
  }

  return { ok: true };
}
