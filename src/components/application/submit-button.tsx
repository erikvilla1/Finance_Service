"use client";

import { useFormStatus } from "react-dom";
import type { MouseEvent } from "react";
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

  /**
   * Feeds the cursor glow its position.
   *
   * WRITTEN STRAIGHT ONTO THE ELEMENT, NOT INTO STATE. The reference keeps the
   * coordinates in useState, which re-renders the button on every mousemove —
   * dozens of React renders a second to move a circle. Setting two custom
   * properties on the node skips React entirely and lets the compositor place
   * it, and there is nothing in the render output that depends on the value.
   *
   * No mouseleave handler either: the glow's own opacity is driven by
   * :hover in CSS, so it fades out on its own and the stale coordinates behind
   * it are invisible and harmless.
   */
  function trackGlow(event: MouseEvent<HTMLButtonElement>) {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    button.style.setProperty("--glow-x", `${event.clientX - rect.left}px`);
    button.style.setProperty("--glow-y", `${event.clientY - rect.top}px`);
  }

  return (
    <Button
      type="submit"
      size="lg"
      className="w-full sm:w-auto"
      disabled={pending}
      // The one action this whole screen exists to produce, and the only
      // shimmer in the flow. The spark hides itself while disabled — a button
      // that is busy should not still be advertising.
      shimmer
      glow
      onMouseMove={trackGlow}
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
