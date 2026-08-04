import type { Metadata } from "next";
import Link from "next/link";
import { Button, Card, Container, Field, Input } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sign In",
  robots: { index: false, follow: false },
};

/**
 * Sign-in.
 *
 * SCAFFOLD — the form does not submit yet. Supabase Auth is provisioned and the
 * profile trigger is live, but the auth actions are intentionally not wired
 * until the account model is settled: BUSINESS_CONTEXT §4 has applicants
 * registering before applying, while platform spec §36 defers customer accounts
 * to Phase 2. Building the wrong one costs more than waiting.
 *
 * Platform spec §22: MFA is required or strongly recommended for internal staff.
 * That must be configured before any staff account is created.
 */
export default function SignInPage() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-ink-50 py-16">
      <Container>
        <div className="mx-auto max-w-md">
          <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 place-items-center rounded-lg bg-brand-800 text-sm font-bold text-white"
            >
              FLS
            </span>
            <span className="text-sm font-semibold text-ink-900">
              Financial Lending Specialists
            </span>
          </Link>

          <Card>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">
              Sign in
            </h1>
            <p className="mt-2 text-sm text-ink-600">
              Access your application and documents.
            </p>

            <form className="mt-6 space-y-5">
              <Field label="Email address" htmlFor="email" required>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  disabled
                />
              </Field>

              <Field label="Password" htmlFor="password" required>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  disabled
                />
              </Field>

              <Button type="submit" className="w-full" disabled>
                Sign in
              </Button>
            </form>

            <div className="mt-5 rounded-lg bg-warning-50 p-4">
              <p className="text-sm font-semibold text-warning-700">
                Not wired up yet
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
                Authentication is provisioned but intentionally not connected
                until the account model is decided.
              </p>
            </div>
          </Card>

          <p className="mt-6 text-center text-sm text-ink-600">
            Not started an application?{" "}
            <Link href="/start" className="font-semibold text-brand-700 hover:underline">
              See your financing options
            </Link>
          </p>
        </div>
      </Container>
    </main>
  );
}
