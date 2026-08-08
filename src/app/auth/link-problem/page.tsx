import type { Metadata } from "next";
import { ButtonLink, Card, Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "That link didn't work",
  robots: { index: false, follow: false },
};

/**
 * Confirmation link failed to exchange.
 *
 * Three causes, all recoverable and none worth distinguishing for the person
 * reading this: the link expired, it was already used, or it was opened in a
 * browser that doesn't hold the PKCE verifier cookie from signup.
 *
 * Their account and application already exist by this point — the claim happens
 * at signup, not at confirmation — so signing in is a real way forward and not
 * a consolation prize.
 */
export default function LinkProblemPage() {
  return (
    <main id="main" className="min-h-dvh bg-ink-50 py-12">
      <Container>
        <div className="mx-auto max-w-lg">
          <Card>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">
              That link didn&apos;t work
            </h1>
            <p className="mt-4 leading-relaxed text-ink-600">
              Confirmation links expire and can only be used once. If you opened
              this on a different device from the one you signed up on, that can
              do it too.
            </p>
            <p className="mt-3 leading-relaxed text-ink-600">
              Your account and your application are both saved. Signing in will
              take you straight to them.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/sign-in?next=/dashboard">Sign in</ButtonLink>
              <ButtonLink href="/contact" variant="secondary">
                Talk with a specialist
              </ButtonLink>
            </div>
          </Card>
        </div>
      </Container>
    </main>
  );
}
