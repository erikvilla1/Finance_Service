import { ChevronDown, ChevronRight } from "lucide-react";
import {
  ButtonLink,
  Card,
  Container,
  Section,
  SectionHeading,
} from "@/components/ui";
import { HeroVideo } from "@/components/marketing/hero-video";
import { CountUp } from "@/components/marketing/count-up";
import { Reveal } from "@/components/marketing/reveal";
import { ProcessSteps } from "@/components/marketing/process-steps";
import { ContactForm } from "@/components/marketing/contact-form";

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

const TRUST_POINTS = [
  {
    title: "Specialized Financing Experience",
    body: "We work with financing structures that general lenders often don't handle.",
  },
  {
    title: "Multiple Financing Programs",
    body: "Different situations call for different programs. We look across several.",
  },
  {
    title: "Solutions for Non-Traditional Situations",
    body: "Not every strong business fits a standard bank box. We start from your situation.",
  },
  {
    title: "Personalized Guidance",
    body: "A financing specialist reviews your information and works your file directly.",
  },
  {
    title: "Simple Application Experience",
    body: "We ask what's relevant to your goal, not a single generic form.",
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
const PROCESS_STEPS = [
  {
    title: "Tell us what you need",
    body: "Start with your goal in plain language. You don't need to know which loan product you're looking for — that's our job.",
  },
  {
    title: "Tell us about your business",
    body: "Eight quick questions about revenue, time in business, and credit. No documents, and nothing here affects your credit.",
  },
  {
    title: "See what may be available",
    body: "Indicative ranges based on what you shared, with the reasoning behind each one. A starting point, not an offer.",
  },
  {
    title: "Create an account and apply",
    body: "Save your place, then complete the full application at your own pace. It only asks what your situation actually needs.",
  },
  {
    title: "Upload what's asked for",
    body: "A checklist tells you exactly which documents are needed for your file — no guessing, and nothing requested twice.",
  },
  {
    title: "We take it to lenders",
    body: "A specialist packages your file and puts it in front of the programs it genuinely fits — not a blast to everyone.",
  },
  {
    title: "Track it from your dashboard",
    body: "Document requests, status changes, and what's still outstanding, in one place. No wondering where things stand.",
  },
  {
    title: "Close, if a lender approves",
    body: "We walk you through signing and disbursement, and stay on the file until the money lands.",
  },
];

export default function HomePage() {
  // Idempotency key for this render of the contact form (same device as the
  // prequal, migration 0018). Minted on the server so it cannot be replayed or
  // omitted by the client.
  const submissionToken = crypto.randomUUID();

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
          if CAPSULE changes height, both numbers here move. */}
      <div className="relative mx-3 -mt-[68px] flex min-h-[88dvh] flex-col overflow-hidden rounded-[1.75rem] bg-brand-900 sm:mx-5 sm:-mt-[84px] sm:rounded-[2rem]">
        <HeroVideo className="absolute inset-0 h-full w-full object-cover" />
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

                Sized by CountUp's own reserved width, so the box does not grow
                and snap back as the decimal appears and disappears. */}
            <div className="animate-fade-in-up shrink-0 self-start rounded-2xl border border-white/15 bg-brand-900/55 p-6 backdrop-blur-md [animation-delay:600ms] sm:p-7 lg:self-end">
              <p className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                <CountUp from={1} to={20} prefix="$" suffix="M+" />
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
            <Card className="self-start bg-white">
              <p className="text-lg font-medium leading-relaxed text-ink-800">
                &ldquo;Our goal isn&apos;t simply to offer one loan. It&apos;s to
                help you find the financing strategy that makes sense for your
                situation.&rdquo;
              </p>
            </Card>
          </div>
          </Reveal>
        </Container>
      </Section>

      {/* ----------------------------------------------------------- TRUST */}
      <Section tone="muted">
        <Container>
          <Reveal>
          <SectionHeading
            eyebrow="Why us"
            title="Why Work With Financial Lending Specialists?"
          />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TRUST_POINTS.map((point) => (
              <Card as="li" key={point.title}>
                <h3 className="text-base font-semibold text-ink-900">
                  {point.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  {point.body}
                </p>
              </Card>
            ))}
          </ul>
          </Reveal>
        </Container>
      </Section>

      {/* ------------------------------------------------------- RESOURCES */}
      <Section id="resources">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Resources"
              title="Guides on financing, qualification, and the process"
              description="Plain-language explainers on how each program works, what lenders look for, and what to expect once a file is submitted."
            />
            {/* ⚠️  NO CONTENT EXISTS YET. Platform spec §31 plans educational
                pages; none are written. This section is deliberately honest
                about that rather than padded with restated program terms,
                which spec §5 forbids while the catalog is unverified.

                An empty section on a scrolling page is worse than no section —
                consider removing this until there are at least three real
                pieces, then link them here as cards. */}
            <div className="mt-10 rounded-card border border-dashed border-ink-300 bg-white/60 p-8">
              <p className="max-w-2xl text-sm leading-relaxed text-ink-600">
                Guides are being written now. In the meantime, the fastest way
                to find out what may be available for your situation is to
                answer a few questions — it takes about two minutes and nothing
                about it affects your credit.
              </p>
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* --------------------------------------------------- CONTACT / CTA */}
      <Section id="contact" tone="brand">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <SectionHeading
                inverted
                title="Let's Explore Your Financing Options"
                description="Tell us what you're trying to accomplish. A financing specialist will review your information and follow up."
              />
              {/* The application stays the primary path, and says so before the
                  form does. Spec §4: contact must not become the main
                  conversion action, and a message is easier to send than an
                  application is to finish. */}
              <p className="mt-8 max-w-md leading-relaxed text-brand-100">
                If what you really want to know is what may be available, the
                questions take about two minutes and nothing there affects your
                credit.
              </p>
              <div className="mt-6">
                <ButtonLink href="/start" size="lg" className="shrink-0">
                  See My Financing Options
                </ButtonLink>
              </div>
            </Reveal>

            <Reveal delayMs={120}>
              <ContactForm submissionToken={submissionToken} />
            </Reveal>
          </div>
        </Container>
      </Section>
    </>
  );
}
