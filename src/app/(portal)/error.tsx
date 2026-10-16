"use client";

import { useEffect } from "react";
import { Button, ButtonLink, Container, ErrorState } from "@/components/ui";

/**
 * Error boundary for the customer portal.
 *
 * There wasn't one. A portal page that threw fell through to Next's bare
 * "Application error" screen, and, worse, a page whose database read failed
 * didn't throw at all: the pages read `{ data }` and treated an empty answer
 * as "not yours", so a failed lookup rendered as a 404 (see the ownership
 * checks in dashboard/[applicationId]). They now throw on a read error, and
 * this is where that lands: inside the shell, with the sidebar still there,
 * a retry that re-renders the page, and no internal detail on screen (spec
 * §28: messages can carry table names or fragments of what someone typed).
 */
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with the real error reporter when one is chosen.
    console.error("Portal error", error.digest ?? error.message);
  }, [error]);

  return (
    <Container>
      <div className="mx-auto max-w-2xl">
        <ErrorState
          title="We couldn't load this page"
          description="This is a problem on our side, not with anything you did. Nothing you've sent has been lost. Please try again in a moment, and if it keeps happening, message your specialist from Support."
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={reset}>Try again</Button>
              <ButtonLink href="/dashboard" variant="secondary">
                Back to your overview
              </ButtonLink>
            </div>
          }
        />
        {error.digest && (
          <p className="mt-4 font-mono text-sm text-ink-500">Reference: {error.digest}</p>
        )}
      </div>
    </Container>
  );
}
