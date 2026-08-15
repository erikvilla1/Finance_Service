/**
 * Password policy — one definition, used by the meter and by the server.
 *
 * WHY THIS FILE EXISTS. A strength meter that lists requirements the server
 * does not enforce is a lie in one direction; a server that rejects passwords
 * the meter called strong is a lie in the other. Both are the same bug: two
 * copies of a rule. The client renders from this and the server validates
 * against it, so they cannot drift.
 *
 * -----------------------------------------------------------------------------
 * WHAT SUPABASE ACTUALLY ENFORCES, AS OF 2026-08-13
 *
 * Less than this file does. Two things worth knowing:
 *
 *   LEAKED PASSWORD PROTECTION IS OFF. Confirmed by the project's own security
 *   advisor (auth_leaked_password_protection). Supabase can check candidate
 *   passwords against HaveIBeenPwned and currently is not. That single toggle
 *   in Authentication → Policies is worth more than every composition rule
 *   below put together, because the passwords that actually get accounts taken
 *   over are the ones already in a breach corpus, not the ones missing a
 *   symbol.
 *
 *   THE MINIMUM LENGTH IS SUPABASE'S DEFAULT, WHICH IS 6. The app is stricter:
 *   create-account/actions.ts has always rejected anything under 8, and that
 *   check runs before the password reaches Supabase, so 8 is what applies on
 *   the only signup path that exists today. But the two disagree, and anything
 *   that ever creates a user by another route would get 6 through. Raising the
 *   dashboard setting to match closes that.
 *
 * REQUIRED VS ADVISORY. Only length is required, because only length is
 * enforced — raising the bar to include composition rules would lock out
 * accounts that can be created right now, which is not a change to make
 * silently. Everything else scores the password without gating it.
 *
 * That split is also the better policy on the merits. NIST SP 800-63B advises
 * against mandatory composition rules: they push people toward predictable
 * substitutions (Password1!) while blocking genuinely strong passphrases. It
 * recommends length plus breach checking, which is exactly the toggle above.
 * -----------------------------------------------------------------------------
 */

/** The floor the server enforces. Mirrored in create-account/actions.ts. */
export const PASSWORD_MIN_LENGTH = 8;

/** The length this meter stops nagging at. Advisory, not enforced. */
const COMFORTABLE_LENGTH = 12;

/** Punctuation and symbols across the printable ASCII ranges. */
const SYMBOL = /[!-/:-@[-`{-~]/;

/**
 * Patterns a guessing attack tries early: known-common passwords, a character
 * repeated four or more times, and short keyboard or alphabet runs.
 *
 * A stand-in for a breach list, not a substitute for one. Turn on leaked
 * password protection and this becomes a courtesy rather than a defence.
 */
const COMMON =
  /^(?:password|passw0rd|qwerty|letmein|welcome|admin|iloveyou|monkey|dragon|abc123|111111|123123|123456)/i;
const REPEATED = /(.)\1{3,}/;
const SEQUENCE =
  /(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|defg|qwer|wert|erty|asdf)/i;

export interface PasswordRule {
  id: string;
  label: string;
  /** Required rules block submission. Advisory ones only affect the score. */
  required: boolean;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    required: true,
    test: (v) => v.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "longer",
    label: `${COMFORTABLE_LENGTH} or more is stronger`,
    required: false,
    test: (v) => v.length >= COMFORTABLE_LENGTH,
  },
  {
    id: "case",
    label: "Upper and lower case",
    required: false,
    test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v),
  },
  {
    id: "variety",
    label: "A number or symbol",
    required: false,
    test: (v) => /\d/.test(v) || SYMBOL.test(v),
  },
];

const LABELS = ["", "Weak", "Fair", "Good", "Strong"] as const;

export interface PasswordAssessment {
  /** 0 when empty, otherwise 1–4. */
  score: number;
  max: number;
  label: string;
  rules: (PasswordRule & { met: boolean })[];
  /** Matched a pattern a guessing attack tries early. */
  guessable: boolean;
  /** Every REQUIRED rule passes. The only thing that gates submission. */
  meetsPolicy: boolean;
}

export function assessPassword(value: string): PasswordAssessment {
  const rules = PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(value) }));
  const meetsPolicy = rules.every((rule) => !rule.required || rule.met);
  const guessable =
    value.length > 0 &&
    (COMMON.test(value) || REPEATED.test(value) || SEQUENCE.test(value));

  const passed = rules.filter((rule) => rule.met).length;

  // A guessable password is capped at Weak no matter how many boxes it ticks.
  // "Password123!" satisfies every composition rule in this file and is one of
  // the first things anyone tries.
  const score =
    value.length === 0 ? 0 : guessable ? 1 : Math.max(1, passed);

  return {
    score,
    max: PASSWORD_RULES.length,
    label: LABELS[Math.min(score, LABELS.length - 1)] ?? "",
    rules,
    guessable,
    meetsPolicy,
  };
}
