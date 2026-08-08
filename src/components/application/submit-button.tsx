"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

/**
 * Submit button that reflects in-flight state.
 *
 * The prequal action does several sequential round trips before it redirects,
 * so an unchanged button is a lie: the applicant clicked, nothing moved, and
 * the reasonable conclusion is that the click was missed. They click again, and
 * the second click files a second application.
 *
 * useFormStatus() must be read from a component INSIDE the <form>, which is the
 * only reason this is a separate file rather than inline in the page.
 *
 * This is the first of two guards, and on its own it is not sufficient. It
 * depends on React having hydrated — a click during the hydration window
 * submits natively and never sees `pending`, and a back-button resubmit never
 * touches this component at all. The unique submission_token in migration 0018
 * is what actually guarantees one application per submission; this only makes
 * the wait legible so the applicant stops trying.
 */
export function SubmitButton({
  children,
  pendingLabel = "Checking your options…",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="lg"
      className="w-full sm:w-auto"
      disabled={pending}
      // Announced to screen readers, which otherwise get no signal that the
      // label changed underneath them.
      aria-live="polite"
    >
      {pending ? (
        <>
          <svg
            aria-hidden="true"
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
            />
          </svg>
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
