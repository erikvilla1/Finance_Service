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
// CAPSULE_SURFACE (the white glass fill) was removed with the logo's box. It is
// worth knowing it existed if anything is ever added back to this header.

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
            className={`${CAPSULE} group pl-2`}
          >
            {/*
              Boxless, matching the marketing header. This capsule was pixel-
              matched to that one on purpose (see the note above CAPSULE), so
              when the logo there lost its surface this one had to as well —
              otherwise clicking through from the home page swaps a bare mark
              for a boxed one at the same coordinates, which is more jarring
              than the mismatch the matching was meant to prevent.

              The dark file, because this flow sits on the cream gradient.
              CAPSULE is kept for its height alone, so the mark holds the same
              centre line it had before.

              The hover fade matches the marketing header — see the longer note
              there for why it is opacity rather than the reference's colour
              swap, and why it sits on the image.

              pl-2 for the same reason it is there: the capsule's old px-5
              sm:px-6 was holding the mark off the left edge, and removing the
              box removed that. It has to stay in step with the marketing
              header or the two stop lining up, which is the one thing this
              header exists to guarantee.
            */}
            <Image
              src="/brand/fls-capital-dark.png"
              alt=""
              width={700}
              height={328}
              className="h-10 w-auto max-w-none shrink-0 transition-opacity duration-300 group-hover:opacity-60 sm:h-12"
              priority
            />
          </Link>
          {/*
            NO SEPARATE EXIT CONTROL.

            There was one, and it pointed at "/" — exactly where the logo
            already goes. Two controls, one destination, in a header with two
            things in it.

            It also arrived here mislabelled as "Save & exit" while saving
            nothing, so the honest fix turned out to be removal rather than a
            rename: the logo is the conventional way out of a flow, and the
            second control only doubled the number of ways to discard the
            answers by accident.

            STILL WORTH SOLVING: clicking the logo mid-prequal silently throws
            away every answer, because the wizard holds them in React state and
            nothing is written until the final submit. A draft row keyed on the
            submission_token, or a confirm once at least one question is
            answered, would fix that properly.
          */}
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
