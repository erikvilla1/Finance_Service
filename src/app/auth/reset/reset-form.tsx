"use client";

import { useActionState, useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { PasswordStrength } from "@/components/application/password-strength";
import { assessPassword } from "@/lib/auth/password-policy";
import { updatePassword, type ResetState } from "./actions";

/**
 * Choosing a new password.
 *
 * Reuses the strength meter and the policy from account creation rather than
 * restating either. Two places that decide what a good password is will
 * eventually disagree, and the one that disagrees quietly is the reset flow,
 * because nobody tests it until they need it.
 */
export function ResetForm() {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    updatePassword,
    {},
  );

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const assessment = assessPassword(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  const ready = assessment.meetsPolicy && !assessment.guessable && confirm === password;

  return (
    <form action={formAction} className="space-y-5">
      <Field label="New password" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          autoFocus
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>

      {password.length > 0 && <PasswordStrength value={password} />}

      <Field
        label="Confirm new password"
        htmlFor="confirm_password"
        error={mismatch ? "These don't match yet." : undefined}
        required
      >
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </Field>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-danger-700">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={!ready || pending} className="w-full">
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
