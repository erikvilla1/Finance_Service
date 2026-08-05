"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, ErrorState, Field, Input } from "@/components/ui";
import { signIn, type SignInState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<SignInState, FormData>(signIn, {});

  return (
    <form action={formAction} className="mt-6 space-y-5">
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && (
        <ErrorState title="Couldn't sign you in" description={state.error} />
      )}

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

      <Field label="Password" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <SubmitButton />
    </form>
  );
}
