import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

/**
 * Forgotten password, step one.
 *
 * Built because there was no way to recover an account at all: every forgotten
 * password was a message to Erik and a visit to the Supabase dashboard. That is
 * tolerable for two admins and untenable for applicants, most of whom will have
 * forgotten by their second visit — and the alternative on offer was deleting
 * the user, which sets every audit column that referenced them to null.
 */
export default function ForgotPasswordPage() {
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
            Financial Lending Specialists
          </span>
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-ink-900">
          Reset your password
        </h1>
        <p className="mt-2 leading-relaxed text-ink-600">
          Tell us your email address and we&apos;ll send you a link to set a new
          one.
        </p>

        <div className="mt-8">
          <ForgotForm />
        </div>

        <p className="mt-8 text-sm text-ink-600">
          Remembered it?{" "}
          <Link href="/sign-in" className="font-semibold text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </Container>
  );
}
