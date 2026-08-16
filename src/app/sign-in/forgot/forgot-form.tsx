"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Field, Input } from "@/components/ui";
import { requestPasswordReset, type ForgotState } from "./actions";

/**
 * Requesting a reset link.
 *
 * The confirmation deliberately does not say whether an account was found. It
 * reads as reassurance and is also the whole security property — see the action.
 */
export function ForgotForm() {
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(
    requestPasswordReset,
    {},
  );

  if (state.sent) {
    return (
      <div className="rounded-lg bg-success-50 p-5">
        <p className="text-base font-semibold text-success-700">
          Check your email
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-700">
          If there is an account with that address, a link to set a new password
          is on its way. It expires in an hour, and it only works once.
        </p>
        <p className="mt-3 text-sm text-ink-600">
          Nothing arrived?{" "}
          <Link href="/sign-in/forgot" className="font-semibold text-brand-700 hover:underline">
            Try again
          </Link>{" "}
          — and check the spam folder before you do.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <Field
        label="Email address"
        htmlFor="email"
        hint="The address you sign in with."
        required
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
        />
      </Field>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-danger-700">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send me a reset link"}
      </Button>
    </form>
  );
}
