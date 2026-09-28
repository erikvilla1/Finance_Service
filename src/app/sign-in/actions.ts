"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { landingPathFor } from "@/lib/auth/landing";

/**
 * Staff and customer sign-in.
 *
 * Platform spec §22 requires MFA for internal users. Supabase supports TOTP
 * enrolment and it must be turned on before any real staff account exists —
 * this is password-only and is not sufficient for production.
 */

export type SignInState = { error?: string };

export async function signIn(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) {
    return { error: "Enter your email address and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Deliberately vague. Distinguishing "no such account" from "wrong
    // password" tells an attacker which addresses are registered.
    return { error: "That email address and password don't match an account." };
  }

  // Staff to the pipeline, customers to their file — see landingPathFor for
  // why the decision lives there rather than inline. The user comes off the
  // sign-in response rather than a second getUser(): the session was just
  // minted, so asking the auth server again only re-fetches what is in hand.
  const home = data.user
    ? await landingPathFor(supabase, data.user.id)
    : "/dashboard";

  // An explicit `next` still wins — someone bounced off a deep link should
  // land back on it rather than on whichever home their role implies.
  const destination = next.startsWith("/") && !next.startsWith("//")
    ? next
    : home;

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
