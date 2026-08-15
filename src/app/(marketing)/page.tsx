import { ChevronDown, ChevronRight } from "lucide-react";
import { CardFanCarousel } from "@/components/ui/card-fan-carousel";
import { Testimonial } from "@/components/ui/testimonial-card";
import { Marquee } from "@/components/ui/marquee";
import {
  ButtonLink,
  Container,
  Section,
  SectionHeading,
} from "@/components/ui";
import { HeroVideo } from "@/components/marketing/hero-video";
import { CountUp } from "@/components/marketing/count-up";
import { Reveal } from "@/components/marketing/reveal";
import { ProcessSteps } from "@/components/marketing/process-steps";

/**
 * Homepage.
 *
 * All copy is taken from platform spec §5 and §7. Nothing here is invented, and
 * no program figures appear — spec §5 forbids unverified claims, and every
 * figure in the catalog is currently unverified.
 *
 * The trust section deliberately omits spec §7's "Nationwide Program
 * Availability" card: the spec itself says to publish only verified claims, and
 * nationwide availability has not been confirmed.
 */

/**
 * ⚠ PLACEHOLDER TESTIMONIALS — NOT FOR LAUNCH. ⚠
 *
 * Every entry below is deliberately written to be unusable. That is the point:
 * a testimonial strip on a lending site is regulated speech, and inventing
 * plausible-sounding quotes is the single easiest way to ship a legal problem
 * by accident.
 *
 * WHY THIS CANNOT BE FILLED IN BY GUESSING. The FTC's Endorsement Guides (16
 * CFR Part 255) and its Rule on the Use of Consumer Reviews and Testimonials
 * (16 CFR Part 465, in force since October 2024) prohibit publishing a
 * testimonial that does not reflect the honest experience of a real customer,
 * with civil penalties assessed per violation. Financial services draw more
 * scrutiny than most, not less.
 *
 * WHAT ROBERT NEEDS TO SUPPLY FOR EACH ONE:
 *   - the actual words of an actual client,
 *   - that client's permission to publish them,
 *   - how they want to be attributed (full name, first name and initial, or
 *     "a client in <industry>" — all fine, as long as it is not invented),
 *   - whether anything of value was given in exchange, which has to be
 *     disclosed if so.
 *
 * A results-flavoured quote ("they got me $400k in a week") additionally needs
 * to be typical of what clients get, or to carry a clear disclaimer that it is
 * not. Prefer quotes about the experience over quotes about outcomes.
 *
 * The site is still robots index:false, so nothing here is public yet.
 */
const TESTIMONIALS = [
  {
    name: "Client name",
    role: "Role",
    company: "Company",
    rating: 5,
    testimonial:
      "PLACEHOLDER — replace with a real client quote. Short one, to check how a brief card sits in the strip.",
  },
  {
    name: "Client name",
    role: "Role",
    company: "Company",
    rating: 5,
    testimonial:
      "PLACEHOLDER — replace with a real client quote. This one runs to roughly the length of a typical testimonial so the card height can be judged before the real copy exists.",
  },
  {
    name: "Client name",
    role: "Role",
    company: "Company",
    rating: 4,
    testimonial:
      "PLACEHOLDER — replace with a real client quote about the experience of working with FLS rather than about a dollar outcome.",
  },
  {
    name: "Client name",
    role: "Role",
    company: "Company",
    rating: 5,
    testimonial:
      "PLACEHOLDER — replace with a real client quote. Longest of the set, to confirm nothing overflows the card when a client is talkative.",
  },
  {
    name: "Client name",
    role: "Role",
    company: "Company",
    rating: 5,
    testimonial: "PLACEHOLDER — replace with a real client quote.",
  },
];

/**
 * The real pipeline, not the one from before the CRM existed.
 *
 * TWO CLAIMS WERE SOFTENED ON PURPOSE. "What you're prequalified for" became
 * "what may be available": the engine hard-codes review_required = true and its
 * outcome vocabulary has no "approved", so telling someone they are
 * prequalified would be the one place on the site that contradicts the result
 * page they are about to see. "Get loan" became "if a lender approves" — FLS
 * arranges financing, lenders decide, and a step list that ends in a promise is
 * a promise however small the type underneath it.
 */
/**
 * Robert's program brochures, served from public/brochures.
 *
 * WHAT IS DELIBERATELY NOT HERE. The source folder also contains pricing
 * sheets, a loan matrix, a blank application and a sample invoice. Those are
 * internal sales tools, and the pricing sheets carry dated rate tables —
 * publishing a rate as a downloadable PDF is a claim, which spec §5 does not
 * allow while the catalog is unverified, and advertised rates carry their own
 * disclosure obligations. Only the marketing brochures are listed.
 *
 * STILL NEEDS ROBERT. These are his existing collateral and some covers state
 * figures ("$150K to $12M", "approved in 30 days or less"). They are his
 * claims rather than invented ones, but he should confirm each sheet is
 * current before the site is indexed.
 *
 * Covers are page 1 rendered to an image at build-prep time. The trifolds are
 * cropped to their front panel, since page 1 of a trifold is the outside
 * spread and its right third is the designed cover.
 */
const BROCHURES = [
  {
    title: "SBA Loan Program",
    imgUrl: "/brochures/covers/sba.jpg",
    linkUrl: "/brochures/sba.pdf",
    alt: "Cover of the SBA Loan Program brochure",
    meta: "PDF · 738 KB",
  },
  {
    title: "Real Estate Financing",
    imgUrl: "/brochures/covers/real-estate.jpg",
    linkUrl: "/brochures/real-estate.pdf",
    alt: "Cover of the Real Estate Financing brochure",
    meta: "PDF · 951 KB",
  },
  {
    title: "Merchant Cash Advance",
    imgUrl: "/brochures/covers/merchant-cash-advance.jpg",
    linkUrl: "/brochures/merchant-cash-advance.pdf",
    alt: "Cover of the Merchant Cash Advance brochure",
    meta: "PDF · 703 KB",
  },
  {
    title: "Church & Equipment Financing",
    imgUrl: "/brochures/covers/church-equipment.jpg",
    linkUrl: "/brochures/church-equipment.pdf",
    alt: "Cover of the Church & Equipment Financing brochure",
    meta: "PDF · 189 KB",
  },
  {
    title: "Fix & Flip",
    imgUrl: "/brochures/covers/fix-and-flip.jpg",
    linkUrl: "/brochures/fix-and-flip.pdf",
    alt: "Cover of the Fix & Flip brochure",
    meta: "PDF · 354 KB",
  },
  {
    title: "Healthcare Financing",
    imgUrl: "/brochures/covers/healthcare.jpg",
    linkUrl: "/brochures/healthcare.pdf",
    alt: "Cover of the Healthcare Financing brochure",
    meta: "PDF · 142 KB",
  },
  {
    title: "Accounts Receivable",
    imgUrl: "/brochures/covers/accounts-receivable.jpg",
    linkUrl: "/brochures/accounts-receivable.pdf",
    alt: "Cover of the Accounts Receivable brochure",
    meta: "PDF · 490 KB",
  },
  {
    title: "Start-Up Funding",
    imgUrl: "/brochures/covers/startup-funding.jpg",
    linkUrl: "/brochures/startup-funding.pdf",
    alt: "Cover of the Start-Up Funding brochure",
    meta: "PDF · 699 KB",
  },
  {
    title: "Start-Up Unsecured Credit Lines",
    imgUrl: "/brochures/covers/startup-credit-lines.jpg",
    linkUrl: "/brochures/startup-credit-lines.pdf",
    alt: "Cover of the Start-Up Unsecured Credit Lines brochure",
    meta: "PDF · 112 KB",
  },
  {
    title: "Start-Up Unsecured Term Loans",
    imgUrl: "/brochures/covers/startup-term-loans.jpg",
    linkUrl: "/brochures/startup-term-loans.pdf",
    alt: "Cover of the Start-Up Unsecured Term Loans brochure",
    meta: "PDF · 111 KB",
  },
  {
    title: "General Services Overview",
    imgUrl: "/brochures/covers/general-services.jpg",
    linkUrl: "/brochures/general-services.pdf",
    alt: "Cover of the General Services Overview brochure",
    meta: "PDF · 736 KB",
  },
];

const PROCESS_STEPS = [
  {
    title: "Tell us what you need",
    body: "Start with your goal in plain language. You don't need to know which loan product you're looking for — that's our job.",
    meta: ["No account needed", "Plain language"],
  },
  {
    title: "Tell us about your business",
    body: "Eight quick questions about revenue, time in business, and credit. No documents, and nothing here affects your credit.",
    meta: ["8 questions", "No documents", "No credit impact"],
  },
  {
    title: "See what may be available",
    body: "Indicative ranges based on what you shared, with the reasoning behind each one. A starting point, not an offer.",
    meta: ["Indicative ranges", "Not an offer"],
  },
  {
    title: "Create an account and apply",
    body: "Save your place, then complete the full application at your own pace. It only asks what your situation actually needs.",
    meta: ["Save your place", "Only what applies"],
  },
  {
    title: "Upload what's asked for",
    body: "A checklist tells you exactly which documents are needed for your file — no guessing, and nothing requested twice.",
    meta: ["An exact checklist", "Nothing asked twice"],
  },
  {
    title: "We take it to lenders",
    body: "A specialist packages your file and puts it in front of the programs it genuinely fits — not a blast to everyone.",
    meta: ["Packaged by a specialist", "Matched, not blasted"],
  },
  {
    title: "Track it from your dashboard",
    body: "Document requests, status changes, and what's still outstanding, in one place. No wondering where things stand.",
    meta: ["Live status", "Document requests"],
  },
  {
    title: "Close, if a lender approves",
    body: "We walk you through signing and disbursement, and stay on the file until the money lands.",
    meta: ["Signing and disbursement", "We stay on the file"],
  },
];

export default function HomePage() {
  // Idempotency key for this render of the contact form (same device as the
  // prequal, migration 0018). Minted on the server so it cannot be replayed or
  // omitted by the client.

  return (
    <>
      {/* ---------------------------------------------------------------- HERO

          Near-full-height, content anchored to the bottom, video carrying the
          top half. The height is what makes the footage read as a setting
          rather than a banner — at the old 20rem of padding it was a texture
          behind a headline.

          88dvh rather than 100: a sliver of the section below stays visible, so
          the page reads as scrollable without needing to say so. dvh rather
          than vh because mobile browser chrome resizes the viewport, and 100vh
          leaves the CTA under the address bar on exactly the phones most
          applicants are using.

          NO STAT COUNTERS. The obvious next borrowing from this style is a row
          of big numbers — years, deals, volume. Spec §5 forbids unverified
          claims and every figure available today is unverified, so that block
          cannot ship until Robert supplies figures he can stand behind.
      ------------------------------------------------------------------- */}
      {/* An inset card, not a full-bleed band. Insetting and rounding it is
          what makes the footage read as a held object rather than as the page
          background — the page shows at all four edges and the card sits on it.

          THE TOP MARGIN IS ARITHMETIC, NOT A GUESS. Two gaps are being set at
          once and they pull against each other, so changing either number
          without the other moves the wrong thing:

            gap above the card  = header padding + capsule height − inset
            gap card→capsule    = inset − capsule height

          where "inset" is the magnitude of the negative margin below, and
          "capsule" is the CAPSULE height in site-chrome.tsx. At sm, padding 36
          + capsule 64 − inset 84 leaves 16px of page above the card, and inset
          84 − capsule 64 gives 20px between the card's top edge and the
          capsule. Mobile runs 24 / 56 / 68 for 12px and 12px.

          Raising the header's padding alone slides the card down with it and
          the capsule goes on hugging the crop — the inset has to grow too. And
          if CAPSULE changes height, both numbers here move.

          HEIGHT. Was 88dvh, which left roughly a tenth of the viewport showing
          as page below the card — the white strip under the hero. The card now
          fills the window exactly:

            height = 100dvh − (page above the card) − (margin below the card)

          The first term is the 12/16px computed above; the second is mb-3/mb-5,
          chosen to match the mx-3/mx-5 side inset so the card sits in an even
          frame. Change either and this calc has to change with it. */}
      <div className="relative mx-3 mb-3 -mt-[68px] flex min-h-[calc(100dvh-24px)] flex-col overflow-hidden rounded-[1.75rem] bg-brand-900 sm:mx-5 sm:mb-5 sm:-mt-[84px] sm:min-h-[calc(100dvh-36px)] sm:rounded-[2rem]">
        {/* object-position pulled below centre: the frame has sky at the top and
            street level at the bottom, and centring it crops away the foreground
            that gives the shot depth. Raise the second number to show more of
            the ground, lower it for more sky. */}
        <HeroVideo className="absolute inset-0 h-full w-full object-cover object-[50%_68%]" />
        {/* Gradient, not a flat wash: heavy where the type sits, light at the
            top so the footage is still legible as footage. */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-900/75 to-brand-900/35" />
        {/* Not <Container>: that caps at max-w-6xl and centres, which pulls the
            headline toward the middle of a card that is already inset. Padding
            straight off the card edge keeps the type where the reference sets
            it — hard left, close to the corner. */}
        <div className="relative flex flex-1 flex-col justify-end px-6 pb-12 pt-28 sm:px-10 sm:pb-14 sm:pt-32 lg:px-14">
          {/* Text and figure on one bottom-aligned row. The card's base sits
              level with the last line of the description, which puts it beside
              the headline rather than floating in the empty upper right — and
              keeps it clear of the buttons, so it never reads as a third call
              to action. */}
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <div className="max-w-4xl">
              {/* Line breaks are deliberate, not incidental — each line is its
                  own mask so it can rise independently. See .hero-line in
                  globals.css for why this is two elements per line and why it
                  isn't done at runtime. */}
              <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                <span className="hero-line">
                  <span>Financing Solutions</span>
                </span>
                <span className="hero-line">
                  <span className="[animation-delay:110ms]">
                    Built Around Your Goals
                  </span>
                </span>
              </h1>
              <p className="animate-fade-in-up mt-6 max-w-2xl text-lg leading-relaxed text-brand-100 [animation-delay:150ms] sm:text-xl">
                Whether you&apos;re acquiring equipment, expanding your business,
                investing in real estate, or looking for working capital,
                Financial Lending Specialists can help you explore financing
                options tailored to your situation.
              </p>
            </div>

            {/* ⚠️  UNVERIFIED FIGURE — see the note above this section.
                $20M sits inside the catalog's stated maxima (healthcare lending
                records $30M, SBA $12M, commercial real estate $10M), but every
                one of those rows is terms_verified = false, which means nobody
                has confirmed them with a lender. This is a public financial claim
                resting on unconfirmed data and needs Robert's sign-off before the
                site is indexed.

                Briefly raised to $100M and put back. Worth knowing why: $100M
                sits above every per-loan maximum in the catalog, so it could
                only be read as cumulative volume — a different claim, and one
                nothing on file supports either.

                Sized by CountUp's own reserved width, so the box does not grow
                and snap back as the decimal appears and disappears. */}
            <div className="animate-fade-in-up shrink-0 self-start rounded-2xl border border-white/15 bg-brand-900/55 p-6 backdrop-blur-md [animation-delay:600ms] sm:p-7 lg:self-end">
              <p className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                <CountUp from={1} to={20} prefix="$" suffix="M+" shineWhenSettled />
              </p>
              <p className="mt-2 max-w-[10rem] text-sm leading-snug text-brand-100/80">
                Available in loans
              </p>
            </div>
          </div>

          {/* Buttons and the scroll cue share one row so they share a baseline.
              items-center rather than items-end: the cue is a line of text and
              the buttons are 56px tall, so aligning their boxes would sit the
              text on the floor rather than level with the labels. */}
          <div className="mt-10 flex flex-wrap items-center justify-between gap-x-8 gap-y-6">
            <div className="animate-fade-in-up flex flex-wrap gap-3 [animation-delay:300ms]">
              <ButtonLink href="/start" size="lg">
                See My Financing Options
                <ChevronRight className="h-5 w-5" />
              </ButtonLink>
              <ButtonLink
                href="#how-it-works"
                size="lg"
                variant="ghost"
                className="text-white ring-1 ring-inset ring-white/40 hover:bg-white/10 hover:text-white"
              >
                See How It Works
              </ButtonLink>
            </div>

            <a
              href="#how-it-works"
              className="animate-fade-in-up flex items-center gap-2 text-sm text-brand-100/70 transition-colors [animation-delay:750ms] hover:text-white lg:translate-y-4"
            >
              Scroll to explore
              <ChevronDown aria-hidden="true" className="h-4 w-4 animate-bounce" />
            </a>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- PROCESS

          A plain <section>, not <Section>: the pinned wrapper sets its own
          height and manages its own vertical rhythm, and Section's py-16/py-24
          would sit outside the sticky child and push the pin off by a screenful
          of padding. The muted background is applied here instead. */}
      <section id="how-it-works" className="scroll-mt-28 bg-ink-50 sm:scroll-mt-32">
        <ProcessSteps steps={PROCESS_STEPS} />
      </section>

      {/* ---------------------------------------------------------- ABOUT US */}
      <Section id="about">
        <Container>
          <Reveal>
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionHeading
                eyebrow="Who we are"
                title="Financing Solutions for Real-World Business Needs"
                description="Financial Lending Specialists helps businesses, investors, and professionals find financing for opportunities that don't always fit neatly into traditional lending programs."
              />
              <p className="mt-6 max-w-xl leading-relaxed text-ink-600">
                From equipment and commercial real estate to working capital and
                specialized financing, we take a comprehensive approach to
                understanding your situation and identifying potential funding
                solutions.
              </p>
            </div>
            {/*
              Video well. Drop the file at public/video/about.mp4.

              THE MUTED BACKGROUND IS THE FALLBACK, NOT DECORATION. HeroVideo
              unmounts itself on decode failure or a missing file, so until the
              file exists this renders as a plain rounded panel rather than a
              broken player. That is also what a browser blocking autoplay
              shows.

              aspect-video reserves the box before the video loads, so nothing
              on the page jumps when it arrives.
            */}
            <div className="aspect-video self-start overflow-hidden rounded-[1.75rem] border border-ink-200 bg-ink-100">
              <HeroVideo
                src="/video/about.mp4"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          </Reveal>
        </Container>
      </Section>

      {/* ------------------------------------------------------ TESTIMONIALS */}
      {/* No heading by request — the cards are self-evidently reviews, and a
          band that just moves reads lighter between two full sections than one
          that announces itself first. Section padding is trimmed because there
          is no longer a heading to separate from the strip. */}
      <Section tone="muted" className="overflow-hidden">
        {/* No pauseOnHover: the strip is wide enough that a cursor resting
            anywhere over it stopped the whole thing, which read as broken
            rather than as a considerate pause. */}
        <Marquee
          durationSec={70}
          fadeAmount={8}
          aria-label="Client testimonials"
        >
          {TESTIMONIALS.map((item, index) => (
            <Testimonial
              key={index}
              {...item}
              className="mx-3 w-[21rem] sm:w-[24rem]"
            />
          ))}
        </Marquee>
      </Section>

      {/* ------------------------------------------------------- RESOURCES */}
      <Section id="resources">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Resources"
              title="Program brochures"
              description="One-sheets on the programs we work with most. Each opens as a PDF."
            />
          </Reveal>
        </Container>
        {/* Outside Container: the fan is wider than the text column and gets
            clipped by it at the outer positions. */}
        <Reveal delayMs={120}>
          <CardFanCarousel cards={BROCHURES} />
        </Reveal>
      </Section>

    </>
  );
}
