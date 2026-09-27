"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseProfileForm, type ProfileErrors } from "@/lib/profile-form";

/**
 * Save the applicant's name and phone number.
 *
 * WHO IS SAVED IS THE SESSION, NEVER THE FORM. The row is the signed-in user's
 * own, and "users update own profile" (RLS, 0005/0012) enforces the same thing
 * in the database. Only these two columns are written; the role column is
 * additionally guarded by a trigger.
 *
 * Revalidating the dashboard layout is what makes the new name appear in the
 * sidebar and the greeting as soon as the save lands.
 */

export type ProfileState = {
  saved?: boolean;
  error?: string;
  fieldErrors?: ProfileErrors;
  /** What was stored, formatted, for the form to show. */
  values?: { fullName: string; phone: string };
};

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const { values, errors } = parseProfileForm(formData);
  if (errors.full_name || errors.phone) return { fieldErrors: errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has ended. Sign in again to save your changes." };

  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: values.fullName, phone: values.phone })
    .eq("id", user.id)
    .select("full_name, phone")
    .single();

  if (error || !data) {
    return { error: "We couldn't save that just now. Please try again in a moment." };
  }

  revalidatePath("/dashboard", "layout");
  return { saved: true, values: { fullName: data.full_name ?? "", phone: data.phone ?? "" } };
}
