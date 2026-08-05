"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately vague. Distinguishing "no such account" from "wrong
    // password" tells an attacker which addresses are registered.
    return { error: "That email address and password don't match an account." };
  }

  const destination = next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
