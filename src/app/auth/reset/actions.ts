"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assessPassword, PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";

/**
 * Setting a new password.
 *
 * THE RECOVERY LINK IS THE AUTHORISATION. Supabase will only change a password
 * for an authenticated session, and clicking the emailed link creates one —
 * /auth/confirm exchanges the token and forwards here. So there is no "current
 * password" field and no separate token to check: possession of a live session
 * that arrived this way is the proof.
 *
 * Which means the session check below is not a formality. Without it this action
 * would change the password of whoever happened to be signed in, which on a
 * shared machine is somebody else's account.
 */

export type ResetState = { error?: string };

export async function updatePassword(
  _prevState: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (password !== confirm) {
    return { error: "Those passwords don't match." };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      error: `Your password needs to be at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  }

  // The same assessment the strength meter shows, applied again here. A meter
  // is guidance; this is the rule, and the form is not the only way to POST.
  const assessment = assessPassword(password);

  if (!assessment.meetsPolicy) {
    const missing = assessment.rules
      .filter((rule) => rule.required && !rule.met)
      .map((rule) => rule.label)
      .join(", ");

    return { error: `That password needs: ${missing}.` };
  }

  if (assessment.guessable) {
    return {
      error:
        "That password is one of the first things an attacker tries. Choose something less predictable.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "That reset link has expired or has already been used. Request a new one and try again.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    // Supabase rejects a password matching the previous one, and — once leaked
    // password protection is on — one found in a breach corpus. Both are worth
    // repeating verbatim, since both tell the person something they can act on.
    return { error: error.message };
  }

  // The recovery session is a real session, so they are already signed in.
  // Sending them to the dashboard rather than back to sign-in avoids asking for
  // the password they typed thirty seconds ago.
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
