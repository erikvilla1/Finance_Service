import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui";
import { GrainGradient, LIGHT_GRADIENT } from "@/components/marketing/grain-gradient";

/** Same height and radius as the marketing header's capsules. */
/**
 * Identical to the marketing header's capsule, deliberately.
 *
 * Someone arriving here has just clicked a button on the home page. If the
 * logo pill changes size or moves even slightly, the transition reads as a
 * different site rather than the next step of the same one. Measured against
 * the home page: 64px tall, 40px from the left edge, 36px from the top at sm.
 * The header padding below is what produces the 40/36; changing either without
 * the other breaks the alignment.
 */
const CAPSULE = "flex h-14 shrink-0 items-center rounded-full sm:h-16";
const CAPSULE_SURFACE =
  "border border-white/70 bg-white/80 shadow-card backdrop-blur-xl";

/**
 * Application flow chrome.
 *
 * Deliberately stripped down: no marketing navigation, no footer links. Once
 * someone starts an application, every additional link is a way to leave it.
 *
 * The gradient is the same one the sign-in screen uses, on a light base rather
 * than the near-black one — same corner glow, same drift, same grain, over a
 * ground that white cards and dark type can still be read against. It is
 * ambient texture, not a focal graphic.
 */
export default function ApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-ink-50">
      <GrainGradient className="fixed inset-0" {...LIGHT_GRADIENT} />

      {/*
        Floating capsules, the same shape language as the marketing header —
        the solid white bar with a hairline border read as a different product
        from the page someone had just come from.

        CAPSULE is duplicated from site-chrome rather than imported: that file
        is "use client" for its scroll-spy, and this layout is a server
        component. Two short strings is a better trade than pulling a client
        boundary into the application shell for styling.
      */}
      <header className="relative z-40 px-6 pt-6 sm:px-10 sm:pt-9">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="Financial Lending Specialists"
            className={`${CAPSULE} ${CAPSULE_SURFACE} px-5 sm:px-6`}
          >
            <Image
              src="/brand/fls-logo-icon.png"
              alt=""
              width={824}
              height={714}
              className="h-9 w-auto max-w-none shrink-0 sm:hidden"
              priority
            />
            <Image
              src="/brand/fls-logo-full.png"
              alt=""
              width={2613}
              height={527}
              className="hidden h-9 w-auto max-w-none shrink-0 sm:block"
              priority
            />
          </Link>
          <Link
            href="/"
            className={`${CAPSULE} ${CAPSULE_SURFACE} px-5 text-sm font-medium text-ink-600 transition-colors hover:text-ink-900 sm:px-6`}
          >
            Save &amp; exit
          </Link>
        </div>
      </header>

      <main id="main" className="relative flex-1 py-10 sm:py-14">
        {children}
      </main>

      <footer className="relative border-t border-ink-200 bg-white py-6">
        <Container>
          <p className="text-xs leading-relaxed text-ink-500">
            Your information is submitted for review. Nothing on this site is a
            commitment to lend or an offer of credit. All financing is subject to
            qualification, lender review, and program availability.
          </p>
        </Container>
      </footer>
    </div>
  );
}
