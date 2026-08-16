"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ButtonLink, ErrorState, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/application/submit-button";
import { PasswordStrength } from "@/components/application/password-strength";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import { LegalDialogLink } from "@/components/legal/legal-dialog";
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
        hint={`At least ${PASSWORD_MIN_LENGTH} characters, including a number or symbol.`}
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

      {/*
        A NATIVE CHECKBOX, NOT THE RADIX ONE.

        The supplied component needs @radix-ui/react-checkbox, a `cn` helper
        that does not exist here, and a separate Label component — three
        additions to render a control the platform already ships. It also draws
        its own tick as an inline SVG inside a div, which means reimplementing
        focus, the space key, form participation and the indeterminate state
        that this form has no use for.

        A real <input type="checkbox"> posts itself in FormData, is keyboard
        operable for free, is announced correctly by screen readers, and — the
        part that matters on this form — is subject to native `required`, so a
        browser blocks submission before any of our code runs.

        THE TWO LINKS OPEN A DIALOG rather than navigating — see legal-dialog.tsx.
        They are still real anchors to the real pages underneath, so cmd-click
        and no-JS both behave as they always did.

        THE LABEL WORDING IS RECORDED. It is TERMS_OF_USE_V1.body in
        consent-text.ts, verbatim, and the server writes that version and a hash
        of it to the consents table. Changing this sentence without adding a new
        version there would leave records claiming people agreed to words they
        were never shown.
      */}
      <div className="flex items-start gap-3">
        <input
          id="terms_accepted"
          name="terms_accepted"
          type="checkbox"
          required
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-ink-300 text-brand-900 accent-brand-900"
        />
        <label
          htmlFor="terms_accepted"
          className="cursor-pointer text-sm leading-relaxed text-ink-700"
        >
          I agree to the{" "}
          <LegalDialogLink
            document="terms"
            className="font-semibold text-brand-700 underline underline-offset-2"
          >
            Terms of Use
          </LegalDialogLink>{" "}
          and the{" "}
          <LegalDialogLink
            document="privacy"
            className="font-semibold text-brand-700 underline underline-offset-2"
          >
            Privacy Policy
          </LegalDialogLink>
          .
        </label>
      </div>

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
