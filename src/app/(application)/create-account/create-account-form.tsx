"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ButtonLink, ErrorState, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/application/submit-button";
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
        hint="At least 8 characters."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <Field label="Confirm password" htmlFor="confirm_password" required>
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          minLength={8}
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
