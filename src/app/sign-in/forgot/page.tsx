import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GrainGradient, LIGHT_GRADIENT } from "@/components/marketing/grain-gradient";
import { HeroVideo } from "@/components/marketing/hero-video";
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
 *
 * SAME BACKDROP AND CARD AS /sign-in, not the Container-on-plain-background
 * shell this page used before. A visitor lands here from "Forgotten?" on the
 * sign-in card, and a flat white page with a placeholder "FLS" badge instead
 * of the real mark read as a step outside the product rather than the next
 * screen of the same flow.
 */
export default function ForgotPasswordPage() {
  return (
    <main
      id="main"
      className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#F6EFE0] px-4 py-12"
    >
      <GrainGradient className="absolute inset-0" {...LIGHT_GRADIENT} />
      <HeroVideo
        src="/video/sign-in.mp4"
        className="absolute inset-0 h-full w-full object-cover opacity-35 blur-[2px]"
      />

      <div className="relative w-full max-w-md">
        <div className="rounded-[2rem] border border-ink-200/80 bg-white/95 px-7 py-12 shadow-card backdrop-blur-xl sm:px-10">
          <div className="flex flex-col items-center">
            <Link href="/" aria-label="FLS Capital Advisors" className="group mt-2">
              <Image
                src="/brand/fls-capital-dark.png"
                alt=""
                width={700}
                height={328}
                className="h-12 w-auto max-w-none transition-opacity duration-300 group-hover:opacity-60"
                priority
              />
            </Link>

            <h1 className="animate-fade-in-up mt-9 text-3xl font-bold tracking-tight text-ink-900">
              Reset your password
            </h1>
            <p className="animate-fade-in-up mt-2 text-center text-sm text-ink-600 [animation-delay:80ms]">
              Tell us your email address and we&apos;ll send you a link to set a
              new one.
            </p>
          </div>

          <div className="mt-8">
            <ForgotForm />
          </div>

          <p className="mt-8 text-center text-sm text-ink-600">
            Remembered it?{" "}
            <Link href="/sign-in" className="font-semibold text-brand-700 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
