import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, Container } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign In",
  robots: { index: false, follow: false },
};

/**
 * Sign-in.
 *
 * Platform spec §22: MFA is required for internal staff. This is password-only
 * and must not carry real applicant data until TOTP enrolment is turned on in
 * Supabase Auth.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already signed in — send staff to the pipeline, customers to their portal.
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    redirect(profile && profile.role !== "customer" ? "/admin" : "/dashboard");
  }

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

            <SignInForm next={next} />
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
