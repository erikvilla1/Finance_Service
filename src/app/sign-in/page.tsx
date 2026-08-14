import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GrainGradient } from "@/components/marketing/grain-gradient";
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
 * WHAT WAS TAKEN FROM THE REFERENCE LAYOUT, AND WHAT WAS NOT
 *
 * Taken: the split — form on the left, a full-bleed panel on the right — and
 * the staggered entrance. Both are worth having and neither needed a package.
 *
 * NOT taken, deliberately:
 *
 *   TESTIMONIALS. The reference ships three invented people with randomuser.me
 *   avatars. Fabricated endorsements on a site that arranges credit are an FTC
 *   endorsement-guide problem and a UDAAP one, and "we'll replace them with
 *   real ones later" is how placeholder testimonials end up in production. They
 *   are not here to be filled in; they are out.
 *
 *   GOOGLE SIGN-IN. No OAuth provider is configured in Supabase, so the button
 *   would be decorative. A dead auth control on a sign-in page is worse than an
 *   absent one — the person clicks it, nothing happens, and they conclude the
 *   site is broken rather than that the option does not exist.
 *
 *   RESET PASSWORD. There is no reset route yet. Same reasoning.
 *
 *   THE HERO IMAGE URL. The reference hot-links an Unsplash photo.
 *
 *   THE SHADER PACKAGE. The grain gradient is the reference's best idea and is
 *   kept — rebuilt in CSS. See grain-gradient.tsx for why a WebGL canvas
 *   repainting behind a two-field form was not the way to get it.
 *
 * The reference also assumes shadcn tokens (--foreground, --muted-foreground,
 * --primary, --card, --border) and tw-animate-css, none of which exist here.
 * Rebuilt on ink/brand tokens and the fade-in-up keyframe already in
 * globals.css.
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
    <main id="main" className="flex min-h-dvh flex-col lg:flex-row">
      {/* ------------------------------------------------------------- FORM */}
      <section className="flex flex-1 items-center justify-center bg-white px-6 py-14 sm:px-10">
        <div className="w-full max-w-md">
          <Link
            href="/"
            aria-label="Financial Lending Specialists"
            className="inline-flex items-center"
          >
            <Image
              src="/brand/fls-logo-full.png"
              alt=""
              width={2613}
              height={527}
              className="h-10 w-auto max-w-none"
              priority
            />
          </Link>

          <h1 className="animate-fade-in-up mt-10 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Welcome back
          </h1>
          <p className="animate-fade-in-up mt-3 leading-relaxed text-ink-600 [animation-delay:80ms]">
            Sign in to pick up your application, upload documents, and see where
            things stand.
          </p>

          <SignInForm next={next} />

          <p className="animate-fade-in-up mt-8 text-sm text-ink-600 [animation-delay:450ms]">
            Haven&apos;t started an application?{" "}
            <Link
              href="/start"
              className="font-semibold text-brand-700 hover:underline"
            >
              See your financing options
            </Link>
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------- SIDE PANEL

          Hidden below lg rather than stacked. On a phone it would push the
          form below the fold, and a sign-in page that requires a scroll before
          the first field is a sign-in page people abandon. */}
      <section className="relative hidden flex-1 p-3 lg:block">
        <div className="relative h-full overflow-hidden rounded-[1.75rem] bg-[#070707]">
          <GrainGradient className="absolute inset-0 overflow-hidden" />

          {/* Scrim under the type only. The gradient is at its brightest in the
              corners, and white copy over a white gradient core is unreadable
              — this darkens the bottom third where the words are and leaves
              the rest of the field alone. */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/40 to-transparent" />

          <div className="relative flex h-full flex-col justify-end p-10">
            <p className="max-w-sm text-2xl font-semibold leading-snug tracking-tight text-white">
              Financing solutions built around your goals.
            </p>
            <p className="mt-4 max-w-sm leading-relaxed text-brand-100">
              A financing specialist reviews every file personally. Nothing here
              is automated away.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
