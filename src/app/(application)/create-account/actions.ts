"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
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
import {
  PASSWORD_MIN_LENGTH,
  assessPassword,
} from "@/lib/auth/password-policy";
import {
  TERMS_OF_USE_V1,
  hashConsentText,
} from "@/lib/funding-application/consent-text";
import { notifyStaff } from "@/lib/email/notifications";

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

  /*
    CHECKED HERE, NOT ONLY IN THE BROWSER.

    The input carries `required`, which stops an ordinary submission — but that
    is a hint to the browser, not a guarantee to us. It is bypassed by a form
    submitted with JavaScript, by a direct POST, and by any client that does not
    implement constraint validation.

    An account created without this is an account whose consent record cannot
    honestly be written, so it is refused before anything is created.
  */
  const termsAccepted = formData.get("terms_accepted") != null;

  if (!email || !password) {
    return { error: "Enter your email address and a password." };
  }

  /*
    VALIDATED AGAINST THE POLICY OBJECT, NOT A HAND-WRITTEN COPY OF IT.

    This used to check length alone, which meant password-policy.ts could mark a
    rule required and the server would happily accept passwords that broke it —
    exactly the drift that file exists to prevent, and its own header already
    claimed did not happen. meetsPolicy is every required rule, so adding or
    relaxing one is now a single-line change in one place.

    The message names the rules rather than saying "invalid", because a form
    that rejects a password without saying what is wrong is a form people
    abandon.
  */
  const assessment = assessPassword(password);
  if (!assessment.meetsPolicy) {
    const missing = assessment.rules
      .filter((rule) => rule.required && !rule.met)
      .map((rule) => rule.label.toLowerCase());
    return {
      error: `Your password needs ${missing.join(" and ")}.`,
    };
  }

  if (password !== confirmPassword) {
    return { error: "Those passwords don't match." };
  }

  if (!termsAccepted) {
    return {
      error: "Please agree to the Terms of Use and Privacy Policy to continue.",
    };
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

  /*
    RECORD WHAT THEY AGREED TO.

    Written after the claim, so the row can carry both the profile and the
    application it belongs to — the consents table takes either, and having both
    is what makes the record answer "who agreed, to what, about which file".

    text_version and text_hash come from consent-text.ts rather than from this
    file: the version names the wording and the hash proves it, so if the label
    is ever edited in place the mismatch becomes visible instead of silent.

    IP AND USER AGENT because the privacy policy says they are collected —
    "we record the date and time, the wording you were shown, your IP address,
    and your browser's user-agent string". A policy that describes a record the
    system does not keep is the wrong kind of inaccurate.

    x-forwarded-for is a list when proxies chain; the first entry is the client.
    It is absent in local development, and ip_address is an inet column, so an
    unparseable value has to become null rather than an empty string.

    FAILURE IS LOGGED, NOT FATAL. The account exists and the application is
    already claimed by this point. Refusing to continue would strand someone
    with a working account and an error message, which serves nobody — but a
    missing consent record is a real gap, so it must be loud in the logs rather
    than swallowed.
  */
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || headerList.get("x-real-ip");

    await service.from("consents").insert({
      application_id: application.id,
      profile_id: data.user.id,
      consent_type: TERMS_OF_USE_V1.consentType,
      granted: true,
      text_version: TERMS_OF_USE_V1.version,
      text_hash: await hashConsentText(TERMS_OF_USE_V1.body),
      ip_address: ip || null,
      user_agent: headerList.get("user-agent")?.slice(0, 500) ?? null,
    });
  } catch (consentError) {
    console.error(
      "[create-account] consent record failed for application",
      application.id,
      consentError,
    );
  }

  // The lead now has a person attached to it.
  //
  // BEFORE THE REDIRECTS BELOW, NOT AFTER. redirect() throws NEXT_REDIRECT to
  // unwind the request, so anything after either call never runs.
  //
  // A prequal alert already went out for this file, when it was an anonymous
  // row. This is the follow-up that says who they are — and it is the point at
  // which a specialist can actually reach them, which the first one was not.
  await notifyStaff(
    application.id,
    "Account created",
    `${fullName || email} created an account and claimed this application.`,
  );

  // No session means the project has email confirmation switched on, so there
  // is nothing to sign the applicant into yet. Send them somewhere that says so
  // rather than to a dashboard that would bounce them straight to sign-in.
  if (!data.session) redirect("/create-account/check-your-email");

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
