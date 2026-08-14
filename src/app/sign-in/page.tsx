import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GrainGradient } from "@/components/marketing/grain-gradient";
import { HeroVideo } from "@/components/marketing/hero-video";
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
 *
 * -----------------------------------------------------------------------------
 * FROM THE REFERENCE: the centred card. It is the right shape over full-bleed
 * footage — a split layout fights a moving background for attention, a single
 * floating card sits on top of one.
 *
 * NOT FROM THE REFERENCE, and each for the same reason — a control that cannot
 * do anything is worse than an absent one, because the person clicks it,
 * nothing happens, and they conclude the site is broken rather than that the
 * option does not exist:
 *
 *   "SEND ME THE MAGIC LINK". This app authenticates with
 *   signInWithPassword. There is no OTP flow to send anything through.
 *
 *   "SINGLE SIGN-ON (SSO)". No identity provider is configured in Supabase.
 *
 *   GITHUB AND GOOGLE ICONS. Declared in the reference and never rendered by
 *   it — dead code in the source as given, and no OAuth provider here either.
 *
 * The Terms and Privacy links ARE kept, because /terms and /privacy exist.
 *
 * WHAT IT WOULD HAVE COST TO TAKE LITERALLY: clsx, tailwind-merge,
 * @radix-ui/react-slot, class-variance-authority and @radix-ui/react-separator
 * — five packages for a card, a button, an input, a label and a horizontal
 * rule. The separator alone is a div with `h-px w-full`. It also assumes shadcn
 * theme variables (--card, --muted-foreground, --primary, --border, --ring)
 * that this project does not define.
 * -----------------------------------------------------------------------------
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
    <main
      id="main"
      className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#070707] px-4 py-12"
    >
      {/* Backdrop, in layers back to front.

          The grain gradient is the floor — it always renders. The video sits on
          top of it and removes itself if the file is missing or fails to decode
          (see HeroVideo), so dropping sign-in.mp4 into public/video is the only
          step needed to switch backgrounds. Until then the gradient is what
          shows, and nothing is broken in the meantime. */}
      <GrainGradient className="absolute inset-0" />
      <HeroVideo
        src="/video/sign-in.mp4"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Darkened and blurred, because this is scenery behind a form. Footage
          left at full contrast competes with the two fields the page exists
          for. */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />

      <div className="relative w-full max-w-md">
        <div className="rounded-[2rem] border border-white/15 bg-white/95 px-7 py-12 shadow-2xl backdrop-blur-xl sm:px-10">
          <div className="flex flex-col items-center">
            <Link href="/" aria-label="Financial Lending Specialists">
              <Image
                src="/brand/fls-logo-full.png"
                alt=""
                width={2613}
                height={527}
                className="h-9 w-auto max-w-none"
                priority
              />
            </Link>

            <h1 className="animate-fade-in-up mt-9 text-3xl font-bold tracking-tight text-ink-900">
              Welcome back
            </h1>
            <p className="animate-fade-in-up mt-2 text-center text-sm text-ink-600 [animation-delay:80ms]">
              Haven&apos;t started an application?{" "}
              <Link
                href="/start"
                className="font-semibold text-brand-800 hover:underline"
              >
                See your financing options
              </Link>
            </p>
          </div>

          <SignInForm next={next} />

          <p className="mt-8 text-center text-xs leading-relaxed text-ink-500">
            By signing in you agree to our{" "}
            <Link href="/terms" className="underline hover:text-ink-800">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-ink-800">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
