import { validatePhone } from "./application-form/validate";

/**
 * The applicant's own profile edits: their name and a phone number.
 *
 * Pure so it can be tested, and so the settings form and its server action
 * agree on one set of rules. The phone uses the application form's validator,
 * so a number typed here is stored exactly the way the funding application
 * stores one: "(310) 555-1234".
 *
 * Email isn't here on purpose. It's the sign-in address, and changing it means
 * Supabase Auth re-verifying the new one; until that flow exists it's changed
 * by the specialist.
 */

export const NAME_MAX = 120;

export type ProfileField = "full_name" | "phone";
export type ProfileErrors = Partial<Record<ProfileField, string>>;

export interface ProfileInput {
  fullName: string;
  /** Formatted, or null when left blank (a phone number is optional). */
  phone: string | null;
}

interface FormLike {
  get(name: string): unknown;
}

export function parseProfileForm(form: FormLike): {
  values: ProfileInput;
  errors: ProfileErrors;
} {
  const errors: ProfileErrors = {};

  // Runs of spaces collapse: "Kai  Saucedo " is the same name as "Kai Saucedo".
  const fullName = String(form.get("full_name") ?? "").replace(/\s+/g, " ").trim();
  if (!fullName) errors.full_name = "Enter your full name.";
  else if (fullName.length > NAME_MAX) errors.full_name = `Keep your name under ${NAME_MAX} characters.`;

  const rawPhone = String(form.get("phone") ?? "").trim();
  let phone: string | null = null;
  if (rawPhone) {
    const result = validatePhone(rawPhone);
    if (result.error) errors.phone = result.error;
    else phone = result.value as string;
  }

  return { values: { fullName, phone }, errors };
}
