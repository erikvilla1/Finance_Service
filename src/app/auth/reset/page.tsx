import type { Metadata } from "next";
import Link from "next/link";
import { Container, EmptyState, ButtonLink } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

/**
 * Forgotten password, step two.
 *
 * Only reachable with a live session, which on this route means one created by
 * clicking the emailed link — /auth/confirm exchanges the token and forwards
 * here. Someone opening this URL cold has nothing to prove who they are, and
 * gets sent to ask for a link instead.
 *
 * The expired case is worth handling properly rather than showing an empty
 * form: recovery links expire in an hour and are single-use, so "I clicked it
 * and nothing happened" is the ordinary failure, not an edge case.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Container>
      <div className="mx-auto max-w-md py-12">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-lg bg-brand-800 text-sm font-bold text-white"
          >
            FLS
          </span>
          <span className="text-sm font-semibold text-ink-900">
            FLS Capital Advisors
          </span>
        </Link>

        {!user ? (
          <EmptyState
            title="That link has expired"
            description="Reset links last an hour and can only be used once. Ask for a new one and it will work."
            action={<ButtonLink href="/sign-in/forgot">Send a new link</ButtonLink>}
          />
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">
              Set a new password
            </h1>
            <p className="mt-2 leading-relaxed text-ink-600">
              You&apos;re signing in as{" "}
              <span className="font-medium text-ink-900">{user.email}</span>.
              Choose something you don&apos;t use anywhere else.
            </p>

            <div className="mt-8">
              <ResetForm />
            </div>
          </>
        )}
      </div>
    </Container>
  );
}
