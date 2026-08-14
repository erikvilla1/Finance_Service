"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button, ErrorState, Field, Input } from "@/components/ui";
import { signIn, type SignInState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<SignInState, FormData>(signIn, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && (
        <ErrorState title="Couldn't sign you in" description={state.error} />
      )}

      <div className="animate-fade-in-up [animation-delay:150ms]">
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
      </div>

      <div className="animate-fade-in-up [animation-delay:250ms]">
        <Field label="Password" htmlFor="password" required>
          <div className="relative">
            {/*
              Reveal toggle, not a "show password" checkbox below the field.
              Long passwords typed on a phone are the case this exists for, and
              the control has to be inside the field to be found at the moment
              it is wanted.

              type="button" is load-bearing: a bare <button> inside a <form>
              defaults to type="submit", so tapping the eye would post the form
              with a half-typed password and burn a rate-limit attempt.
            */}
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex items-center px-3.5 text-ink-500 transition-colors hover:text-ink-800"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="h-5 w-5" />
              ) : (
                <Eye aria-hidden="true" className="h-5 w-5" />
              )}
            </button>
          </div>
        </Field>
      </div>

      <div className="animate-fade-in-up pt-1 [animation-delay:350ms]">
        <SubmitButton />
      </div>
    </form>
  );
}
