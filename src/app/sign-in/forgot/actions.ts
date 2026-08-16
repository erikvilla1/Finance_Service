"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Asking for a password reset link.
 *
 * THE ANSWER IS THE SAME WHETHER OR NOT THE ACCOUNT EXISTS. Saying "no account
 * with that address" turns this form into a way to test whether someone banks
 * with Robert — and on a lending platform the mere fact of an account is
 * information worth protecting. Sign-in is already vague for the same reason.
 *
 * So the state has no `error` for a missing account, only for a malformed
 * request. Supabase behaves the same way: resetPasswordForEmail resolves
 * successfully for an address it has never seen.
 */

export type ForgotState = { sent?: boolean; error?: string };

export async function requestPasswordReset(
  _prevState: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter the email address you use to sign in." };
  }

  const supabase = await createClient();

  // Where the link lands. /auth/confirm exchanges the token for a session and
  // forwards to `next`, which is the only page that can then set a password —
  // Supabase requires an authenticated session to change one, and a recovery
  // link is how that session is obtained.
  //
  // NEXT_PUBLIC_SITE_URL rather than the request origin, deliberately: this URL
  // ends up in an email, and a rewritten host would send someone somewhere
  // unintended with a valid token in the query string.
  const redirectTo = `${
    process.env.NEXT_PUBLIC_SITE_URL ?? ""
  }/auth/confirm?next=/auth/reset`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  // Rate limiting is the one failure worth reporting, because the useful advice
  // is "wait" rather than "try again". Everything else is swallowed: a broken
  // mail server is not something the person at the keyboard can act on, and
  // saying so only tells them whether the address was found.
  if (error && /rate|too many/i.test(error.message)) {
    return {
      error: "Too many attempts just now. Wait a few minutes and try again.",
    };
  }

  return { sent: true };
}
