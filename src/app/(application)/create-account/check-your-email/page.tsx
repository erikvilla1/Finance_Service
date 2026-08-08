import type { Metadata } from "next";
import { ButtonLink, Card, Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Check your email",
  robots: { index: false, follow: false },
};

/**
 * Reached only when the Supabase project has email confirmation switched on.
 *
 * The agreed behaviour for now is confirmation OFF, in which case signUp returns
 * a session and the applicant goes straight to the dashboard and never sees
 * this page. It exists so that turning confirmation on — which is a setting in
 * the Supabase dashboard, not in this codebase — doesn't strand anyone on a
 * redirect to a dashboard that immediately bounces them to sign-in.
 *
 * Their application is already claimed by this point, so it is waiting for them
 * whenever they confirm.
 */
export default function CheckYourEmailPage() {
  return (
    <Container>
      <div className="mx-auto max-w-lg">
        <Card className="mt-8">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            Confirm your email address
          </h1>
          <p className="mt-4 leading-relaxed text-ink-600">
            Your account has been created and your application is saved against
            it. We&apos;ve sent you a confirmation link — open it and you&apos;ll
            be able to sign in.
          </p>
          <p className="mt-3 leading-relaxed text-ink-600">
            If it hasn&apos;t arrived in a few minutes, check your spam folder.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/sign-in?next=/dashboard">
              Go to sign in
            </ButtonLink>
            <ButtonLink href="/contact" variant="secondary">
              Talk with a specialist
            </ButtonLink>
          </div>
        </Card>
      </div>
    </Container>
  );
}
