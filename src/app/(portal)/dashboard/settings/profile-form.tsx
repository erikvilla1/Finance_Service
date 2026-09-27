"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, Mail } from "lucide-react";
import { Field, Input } from "@/components/ui";
import { NAME_MAX, type ProfileErrors } from "@/lib/profile-form";
import { updateProfile, type ProfileState } from "./actions";

/**
 * Name and phone, editable in place.
 *
 * Save only lights up once something has changed, and Cancel puts the saved
 * values back, so it's always clear whether what's on screen is what's
 * stored. After a save the fields show what was stored, which for a phone
 * number is the tidied form: "3105551234" comes back as "(310) 555-1234".
 */
export function ProfileForm({
  fullName,
  phone,
  email,
}: {
  fullName: string;
  phone: string;
  email: string;
}) {
  const [saved, setSaved] = useState({ fullName, phone });
  const [name, setName] = useState(fullName);
  const [tel, setTel] = useState(phone);
  const [errors, setErrors] = useState<ProfileErrors>({});

  const [state, action, pending] = useActionState<ProfileState, FormData>(async (prev, formData) => {
    const result = await updateProfile(prev, formData);
    setErrors(result.fieldErrors ?? {});
    if (result.saved && result.values) {
      setSaved(result.values);
      setName(result.values.fullName);
      setTel(result.values.phone);
    }
    return result;
  }, {});

  const dirty = name !== saved.fullName || tel !== saved.phone;

  return (
    <form
      action={action}
      // The browser's own bubble for an empty required field is replaced with
      // the same inline message the server would give.
      onInvalidCapture={(event) => {
        event.preventDefault();
        const target = event.target as HTMLInputElement;
        if (target.name === "full_name") setErrors((e) => ({ ...e, full_name: "Enter your full name." }));
      }}
      className="mt-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="full_name" error={errors.full_name}>
          <Input
            id="full_name"
            name="full_name"
            autoComplete="name"
            required
            maxLength={NAME_MAX}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (errors.full_name) setErrors((e) => ({ ...e, full_name: undefined }));
            }}
            aria-invalid={errors.full_name ? true : undefined}
          />
        </Field>
        <Field label="Phone" htmlFor="phone" error={errors.phone}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(555) 555-1234"
            value={tel}
            onChange={(event) => {
              setTel(event.target.value);
              if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
            }}
            aria-invalid={errors.phone ? true : undefined}
          />
          <p className="text-xs text-ink-500">Optional. For when a call is quicker than email.</p>
        </Field>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl bg-ink-50/80 px-4 py-3.5 ring-1 ring-inset ring-ink-200/60">
        <Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-500">Email</p>
          <p className="truncate text-sm text-ink-900">{email}</p>
          <p className="mt-1 text-xs text-ink-500">
            This is how you sign in, so it isn&apos;t changed here.{" "}
            <Link href="/dashboard/support" className="font-semibold text-brand-900 underline-offset-4 hover:underline">
              Ask your specialist
            </Link>{" "}
            to update it.
          </p>
        </div>
      </div>

      {state.error && !pending && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-xl bg-danger-50 px-3.5 py-3 text-sm text-danger-700 ring-1 ring-inset ring-danger-600/15"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!dirty || pending}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-900 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgb(0_0_0/0.7)] transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500 disabled:shadow-none"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {dirty && !pending && (
          <button
            type="button"
            onClick={() => {
              setName(saved.fullName);
              setTel(saved.phone);
              setErrors({});
            }}
            className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold text-ink-600 transition-colors hover:bg-ink-900/[0.05] hover:text-ink-900"
          >
            Cancel
          </button>
        )}
        {state.saved && !dirty && !pending && (
          <p role="status" className="animate-fade inline-flex items-center gap-1.5 text-sm font-medium text-success-700">
            <CircleCheck aria-hidden="true" className="h-4 w-4" />
            Saved
          </p>
        )}
      </div>
    </form>
  );
}
