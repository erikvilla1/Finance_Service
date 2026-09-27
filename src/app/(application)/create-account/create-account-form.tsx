"use client";

import Link from "next/link";
import { useActionState, useRef, useState, type FormEvent } from "react";
import { ArrowRight, CircleAlert } from "lucide-react";
import { Field, Input } from "@/components/ui";
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
  // Controlled so they survive the form reset React does after the action
  // runs; an error shouldn't make anyone type both passwords again or
  // re-tick the terms.
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);

  /*
    OUR OWN MESSAGES, NOT THE BROWSER'S BUBBLE.

    The fields keep `required`, `type="email"` and `minLength`, so the
    browser still refuses an incomplete form (and does all of it without
    JavaScript). With JavaScript we cancel each `invalid` event, which stops
    the browser drawing its floating bubble, and show a message under the
    field instead, in the page's own type, with the field outlined and the
    first one focused. A message clears as soon as its field changes.
  */
  const [errors, setErrors] = useState<Record<string, string>>({});
  const focusedFirst = useRef(false);

  const clear = (name: string) =>
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });

  function messageFor(field: HTMLInputElement): string {
    const { validity } = field;
    switch (field.name) {
      case "email":
        return validity.valueMissing
          ? "Enter your email address."
          : "Enter a valid email address, like you@company.com.";
      case "password":
        return validity.valueMissing
          ? "Choose a password."
          : `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
      case "confirm_password":
        return validity.valueMissing
          ? "Type your password again to confirm it."
          : `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
      case "terms_accepted":
        return "Please agree to the Terms of Use and Privacy Policy to continue.";
      default:
        return field.validationMessage;
    }
  }

  function handleInvalid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const field = event.target as HTMLInputElement;
    setErrors((prev) => ({ ...prev, [field.name]: messageFor(field) }));
    // Invalid events arrive in document order; focus only the first.
    if (!focusedFirst.current) {
      focusedFirst.current = true;
      field.focus();
      requestAnimationFrame(() => {
        focusedFirst.current = false;
      });
    }
  }

  // Runs only once every field is valid. Catches a mismatch before the round
  // trip; the server still checks it too.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirm !== password) {
      event.preventDefault();
      setErrors((prev) => ({ ...prev, confirm_password: "Those passwords don't match." }));
      (event.currentTarget.elements.namedItem("confirm_password") as HTMLInputElement | null)?.focus();
    }
  }

  return (
    <form
      action={formAction}
      onInvalidCapture={handleInvalid}
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <input
        type="hidden"
        name="application_token"
        value={applicationToken}
      />

      {/*
        A QUIET NOTICE, NOT A BANNER. One line with an icon, in the card's own
        rhythm, rather than a large pink panel with a heading and a button
        pushing the form down. When the address is already registered, the
        way on is a plain link inside the notice.
      */}
      {state.error && (
        <div
          role="alert"
          className="animate-rise flex items-start gap-2.5 rounded-xl bg-danger-50 px-3.5 py-3 text-sm leading-relaxed text-danger-700 ring-1 ring-inset ring-danger-600/15"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.25} />
          <p>
            {state.error}
            {state.emailInUse && (
              <>
                {" "}
                <Link
                  href="/sign-in?next=/dashboard"
                  className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-brand-900 underline-offset-4 hover:underline"
                >
                  Sign in instead
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </p>
        </div>
      )}

      <Field label="Full name" htmlFor="full_name">
        <Input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          placeholder="Jordan Reyes"
          defaultValue={state.values?.fullName}
        />
      </Field>

      <Field label="Email address" htmlFor="email" required error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
          defaultValue={state.values?.email}
          aria-invalid={errors.email ? true : undefined}
          onChange={() => clear("email")}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        required
        hint={`At least ${PASSWORD_MIN_LENGTH} characters, including a number or symbol.`}
        error={errors.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
          value={password}
          aria-invalid={errors.password ? true : undefined}
          onChange={(e) => {
            setPassword(e.target.value);
            clear("password");
          }}
        />
      </Field>

      {/* Only once there is something to assess. An empty meter under an empty
          field is four grey bars telling the applicant they have failed at a
          task they have not started. */}
      {password.length > 0 && <PasswordStrength value={password} />}

      <Field
        label="Confirm password"
        htmlFor="confirm_password"
        required
        error={errors.confirm_password}
      >
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
          value={confirm}
          aria-invalid={errors.confirm_password ? true : undefined}
          onChange={(e) => {
            setConfirm(e.target.value);
            clear("confirm_password");
          }}
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
      <div>
        <div className="flex items-start gap-3">
          <input
            id="terms_accepted"
            name="terms_accepted"
            type="checkbox"
            required
            checked={agreed}
            aria-invalid={errors.terms_accepted ? true : undefined}
            aria-describedby={errors.terms_accepted ? "terms_error" : undefined}
            onChange={(e) => {
              setAgreed(e.target.checked);
              clear("terms_accepted");
            }}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-ink-300 text-brand-900 accent-brand-900 aria-invalid:outline-2 aria-invalid:outline-offset-2 aria-invalid:outline-danger-600"
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
        {errors.terms_accepted && (
          <p id="terms_error" role="alert" className="mt-2 text-sm font-medium text-danger-700">
            {errors.terms_accepted}
          </p>
        )}
      </div>

      <SubmitButton pendingLabel="Creating your account…" fullWidth>
        Create account and continue
      </SubmitButton>

      <p className="text-center text-sm leading-relaxed text-ink-500">
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
