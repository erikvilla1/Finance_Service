"use client";

import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { requestOwnSignature, type SignNowState } from "@/app/(portal)/dashboard/actions";

/**
 * "Sign now": releases the application for signature and opens the signing
 * page (requestOwnSignature). On a dark card the button is white; on a
 * light panel it is the portal's dark primary.
 */
export function SignNowButton({
  applicationId,
  label = "Sign now",
  onDark = false,
  inRow = false,
  className = "",
}: {
  applicationId: string;
  label?: string;
  onDark?: boolean;
  /**
   * Inside a wrapping flex row (the next-step card): the form dissolves
   * into its parent so the button sits in the row and the error, if any,
   * takes a full line beneath it instead of squeezing the copy beside it.
   */
  inRow?: boolean;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<SignNowState, FormData>(
    requestOwnSignature,
    {},
  );

  return (
    <form action={formAction} className={inRow ? "contents" : `shrink-0 ${className}`}>
      <input type="hidden" name="applicationId" value={applicationId} />
      <button
        type="submit"
        disabled={pending}
        className={
          onDark
            ? "inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-5 text-sm font-semibold text-brand-950 transition-colors hover:bg-accent-100 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
            : "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-900 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgb(0_0_0/0.7)] transition-colors hover:bg-brand-800 disabled:cursor-wait disabled:opacity-70"
        }
      >
        {pending ? (
          <>
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            Preparing…
          </>
        ) : (
          <>
            {label}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </>
        )}
      </button>
      {state.error && (
        <p
          role="alert"
          className={`text-sm leading-relaxed ${inRow ? "sm:basis-full sm:pl-[3.75rem]" : "mt-3"} ${onDark ? "text-accent-200" : "text-danger-700"}`}
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
