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
 * REQUIRED VS ADVISORY. Two rules are required — a length floor and one
 * number or symbol. Those two are what the meter lists and what the score is
 * built from.
 *
 * THE OTHER TWO CURRENTLY DO NOTHING. They are neither displayed nor scored,
 * having been dropped from both when the meter moved to three stages. They are
 * kept because they describe what a good password looks like and are the
 * obvious content for a "suggestions" affordance later — but they are dead
 * weight today, and anyone tidying this file should know that rather than
 * assume they are load-bearing.
 *
 * THE SECOND ONE WAS A DELIBERATE CHOICE AGAINST THE GUIDANCE, and that is
 * worth recording rather than quietly implementing. NIST SP 800-63B advises
 * against mandatory composition rules: they push people toward predictable
 * substitutions — Password1! satisfies every rule in this file — while
 * blocking genuinely strong passphrases like "correct horse battery staple",
 * which this now rejects despite being far harder to guess than anything eight
 * characters long.
 *
 * It was asked for, it is defensible on a financial site where an examiner or
 * a partner may expect to see a composition rule, and the meter still caps a
 * guessable password at Weak regardless of which boxes it ticks. But the thing
 * that would actually reduce account takeovers is still the toggle above:
 * leaked-password protection, which remains OFF.
 *
 * ALREADY-EXISTING ACCOUNTS ARE UNAFFECTED. This gates creation, not sign-in,
 * so nobody is locked out of a password they already have.
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
    required: true,
    test: (v) => /\d/.test(v) || SYMBOL.test(v),
  },
];

/**
 * THREE STAGES, NOT FOUR.
 *
 * The meter used to have one segment per rule, which tied the scale to how many
 * rules happen to exist — adding a rule silently changed what "3 bars" meant.
 * Weak / Fair / Strong is a judgement about the password, and it stays stable
 * whatever the rule list does.
 */
const LABELS = ["", "Weak", "Fair", "Strong"] as const;

/** Segments in the meter. Independent of PASSWORD_RULES.length, deliberately. */
export const PASSWORD_SCORE_MAX = 3;

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

  /*
    THE SCORE IS THE VISIBLE CHECKLIST, NOTHING ELSE.

    One stage per required rule met, and the meter lists exactly those rules:

      no checks   -> Weak
      one check   -> Fair
      both checks -> Strong

    It used to reach Strong only by satisfying the two ADVISORY rules as well,
    which the meter no longer displays. That made the top of the scale
    unreachable by following the instructions on screen — the bar stayed at
    Fair with every visible box ticked and nothing to explain why. A meter has
    to be readable from what it shows.

    Written as met + 1 rather than a chain of ternaries so that adding a third
    required rule does not silently strand a stage: it clamps at Strong.

    THE GUESSABLE CAP SURVIVES, and it is the one thing here that overrides the
    checklist. "Password1" ticks both boxes and is among the first strings any
    attack tries. The meter says Weak and prints "Commonly guessed" beside it,
    so the disagreement with the ticks is explained rather than mysterious.
    Delete the `guessable ||` below if that is not wanted — it is the only
    reason a fully ticked password can read Weak.
  */
  const requiredMet = rules.filter(
    (rule) => rule.required && rule.met,
  ).length;

  const score =
    value.length === 0
      ? 0
      : guessable
        ? 1
        : Math.min(requiredMet + 1, PASSWORD_SCORE_MAX);

  return {
    score,
    max: PASSWORD_SCORE_MAX,
    label: LABELS[Math.min(score, LABELS.length - 1)] ?? "",
    rules,
    guessable,
    meetsPolicy,
  };
}
