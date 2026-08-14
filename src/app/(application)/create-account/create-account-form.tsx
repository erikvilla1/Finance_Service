"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ButtonLink, ErrorState, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/application/submit-button";
import { PasswordStrength } from "@/components/application/password-strength";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import { createAccount, type CreateAccountState } from "./actions";

export function CreateAccountForm({
  applicationToken,
}: {
  applicationToken: string;
}) {
  const [state, formAction] = useActionState<CreateAccountState, FormData>(
    createAccount,
    {},
  );
  // Controlled only so the meter can read it. The field still posts itself.
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <input
        type="hidden"
        name="application_token"
        value={applicationToken}
      />

      {state.error && (
        <ErrorState
          title="Couldn't create your account"
          description={state.error}
          // The address is already registered, or the application is already
          // owned. Both dead-end without a route onward, and the applicant
          // shouldn't have to go find sign-in themselves.
          action={
            state.emailInUse ? (
              <ButtonLink href="/sign-in?next=/dashboard" variant="secondary">
                Sign in instead
              </ButtonLink>
            ) : undefined
          }
        />
      )}

      <Field
        label="Your name"
        htmlFor="full_name"
        hint="So we know who we're speaking with."
      >
        <Input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          placeholder="Jordan Reyes"
        />
      </Field>

      <Field label="Email address" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        required
        hint={`At least ${PASSWORD_MIN_LENGTH} characters. The rest is advice, not a rule.`}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {/* Only once there is something to assess. An empty meter under an empty
          field is four grey bars telling the applicant they have failed at a
          task they have not started. */}
      {password.length > 0 && <PasswordStrength value={password} />}

      <Field label="Confirm password" htmlFor="confirm_password" required>
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
        />
      </Field>

      <SubmitButton pendingLabel="Creating your account…">
        Create account and continue
      </SubmitButton>

      <p className="text-sm leading-relaxed text-ink-500">
        Already have an account?{" "}
        <Link
          href="/sign-in?next=/dashboard"
          className="font-semibold text-brand-700 underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
