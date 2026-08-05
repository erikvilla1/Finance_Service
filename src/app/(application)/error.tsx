"use client";

import { useEffect } from "react";
import { Button, ButtonLink, Container, ErrorState } from "@/components/ui";

/**
 * Error boundary for the application flow.
 *
 * Platform spec §39 requires error states. This one matters more than most:
 * someone who hits a raw 500 halfway through an application does not come
 * back, and a broken form on a financial site reads as untrustworthy rather
 * than merely buggy.
 *
 * The underlying error is deliberately not shown. Messages here can carry
 * connection strings, table names, or fragments of what the applicant typed —
 * none of which belongs on screen (spec §28: secure logging, no sensitive data
 * in client output).
 */
export default function ApplicationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side logging happens in the action. This is the client half of the
    // picture — replace with the real error reporter when one is chosen.
    console.error("Application flow error", error.digest ?? error.message);
  }, [error]);

  return (
    <Container>
      <div className="mx-auto max-w-2xl">
        <ErrorState
          title="Something went wrong on our end"
          description="Your information wasn't submitted. This is a problem with our system, not with anything you entered — please try again, and if it keeps happening a specialist can take your details directly."
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={reset}>Try again</Button>
              <ButtonLink href="/contact" variant="secondary">
                Talk with a financing specialist
              </ButtonLink>
            </div>
          }
        />

        {error.digest && (
          <p className="mt-4 font-mono text-sm text-ink-500">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </Container>
  );
}
