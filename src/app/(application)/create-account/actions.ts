"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { claimApplication } from "@/lib/applications/claim";

/**
 * Account creation at the end of prequalification.
 *
 * The applicant has already seen their indicative options — this is the point
 * where an anonymous prequal record becomes an owned application. The account
 * exists to give them somewhere to come back to, not to gate the estimate,
 * which is why the wall sits here and not before the questions.
 */

export type CreateAccountState = {
  error?: string;
  /** Set when the address is already registered, so the UI can offer sign-in. */
  emailInUse?: boolean;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The floor, imported rather than restated.
 *
 * password-policy.ts is what the strength meter renders from, so declaring the
 * number twice is how the form ends up promising something this function does
 * not check. See that file for what Supabase itself enforces (less than this)
 * and for the leaked-password toggle that is still off.
 */
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";

export async function createAccount(
  _prevState: CreateAccountState,
  formData: FormData,
): Promise<CreateAccountState> {
  const tokenRaw = String(formData.get("application_token") ?? "").trim();
  const applicationToken = UUID_PATTERN.test(tokenRaw) ? tokenRaw : null;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const fullNameRaw = String(formData.get("full_name") ?? "").trim();
  const fullName = fullNameRaw ? fullNameRaw.slice(0, 120) : null;

  if (!email || !password) {
    return { error: "Enter your email address and a password." };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      error: `Your password needs to be at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  }

  if (password !== confirmPassword) {
    return { error: "Those passwords don't match." };
  }

  if (!applicationToken) {
    return {
      error:
        "We couldn't tell which application this account is for. Please start again from your results page.",
    };
  }

  // ---------------------------------------------------------------------------
  // Check the application is claimable BEFORE creating an account.
  //
  // Creating an auth user and then discovering the application is already owned
  // would leave an orphaned account behind and tell the applicant nothing
  // useful. Cheap to check, and it fails loudly here instead of quietly later.
  // ---------------------------------------------------------------------------
  const service = createServiceRoleClient();
  const { data: application } = await service
    .from("applications")
    .select("id, profile_id")
    .eq("public_token", applicationToken)
    .maybeSingle();

  if (!application) {
    return {
      error:
        "We couldn't find that application. Please start again from your results page.",
    };
  }

  if (application.profile_id) {
    return {
      error:
        "An account has already been created for this application. Please sign in instead.",
      emailInUse: true,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      // Where the confirmation link comes back to. Ignored entirely when the
      // project has confirmation switched off, so this is safe either way — and
      // it means turning confirmation on is a toggle, not a code change.
      emailRedirectTo: `${
        process.env.NEXT_PUBLIC_SITE_URL ?? ""
      }/auth/confirm?next=/dashboard`,
    },
  });

  if (error) {
    // Supabase reports an existing address as "User already registered". Unlike
    // sign-in, being specific here is correct: the person is trying to make an
    // account and needs to know why they can't, and the address is one they
    // just typed themselves.
    if (/already registered/i.test(error.message)) {
      return {
        error: "There's already an account with that email address.",
        emailInUse: true,
      };
    }

    if (/password/i.test(error.message)) {
      return { error: "That password isn't strong enough. Try a longer one." };
    }

    return {
      error: "We couldn't create your account just then. Please try again.",
    };
  }

  if (!data.user) {
    return {
      error: "We couldn't create your account just then. Please try again.",
    };
  }

  // Claim regardless of whether a session came back. If the project requires
  // email confirmation the account exists but is not yet signed in, and the
  // application should still be waiting for them when they confirm.
  const claim = await claimApplication(applicationToken, data.user.id);

  if (!claim.ok) {
    return claim.reason === "already_claimed"
      ? {
          error:
            "That application was claimed by another account while you were signing up. Please sign in.",
          emailInUse: true,
        }
      : {
          error:
            "We created your account but couldn't attach your application. Please sign in and contact a specialist.",
        };
  }

  // No session means the project has email confirmation switched on, so there
  // is nothing to sign the applicant into yet. Send them somewhere that says so
  // rather than to a dashboard that would bounce them straight to sign-in.
  if (!data.session) redirect("/create-account/check-your-email");

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
