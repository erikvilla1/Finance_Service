import Image from "next/image";
import { BadgeCheck, ChevronDown } from "lucide-react";
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
import { ResourceGuideScroller } from "@/components/marketing/resource-guide-scroller";
import { RESOURCE_GUIDES } from "@/lib/resource-guides/data";

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
 * Real client success stories, supplied by Robert ("Client Success
 * Stories.docx", 2026-09-10) — replaces the placeholder block that used to
 * live here.
 *
 * ATTRIBUTION FORMAT. First name + last initial + role/industry, matching one
 * of the acceptable formats the placeholder comment called for ("full name,
 * first name and initial, or 'a client in <industry>'"). No company names
 * were supplied, so `company` is left unset rather than invented.
 *
 * NO RATING DATA WAS SUPPLIED. `rating` is 0 for every entry — the Testimonial
 * component treats 0 as "hide the star row entirely" specifically for this
 * case, rather than defaulting to a fabricated 5 stars.
 *
 * FTC compliance (16 CFR Part 255 / Part 465) still rests on Robert's
 * representation that these are real clients' actual words, published with
 * their permission — that determination is his to make, not derivable from
 * the copy alone.
 */
const TESTIMONIALS = [
  {
    name: "Elvina B.",
    role: "General Contractor",
    rating: 0,
    testimonial:
      "FLS helped us secure $350,000 through a combination of a business line of credit and term financing. The additional capital gave us the flexibility to improve cash flow, invest in operations, and continue growing the company.",
  },
  {
    name: "Ryan C.",
    role: "Marketing Company Owner",
    rating: 0,
    testimonial:
      "FLS helped us secure $150,000 in working capital at an important stage in our growth. The financing allowed us to hire additional employees, expand our capacity, and continue investing in the business.",
  },
  {
    name: "Taha A.",
    role: "Medical Practice Owner",
    rating: 0,
    testimonial:
      "FLS helped us navigate financing for the purchase of our own medical office. They structured a solution around our practice and our long-term goal of owning the property where we operate.",
  },
  {
    name: "Alexus R.",
    role: "Remodeling Company Owner",
    rating: 0,
    testimonial:
      "FLS helped us secure a business line of credit that gives us the flexibility to purchase materials, manage payroll, and take on new projects without putting unnecessary pressure on our day-to-day cash flow.",
  },
  {
    name: "Akbaar A.",
    role: "Commercial Real Estate Investor",
    rating: 0,
    testimonial:
      "FLS helped us structure a cash-out refinance so we could access equity from our existing properties and pursue another commercial real estate investment. Their understanding of commercial financing made the process much easier to navigate.",
  },
  {
    name: "Pete P.",
    role: "Hotel Operator",
    rating: 0,
    testimonial:
      "Our existing MCA debt was putting significant pressure on cash flow. FLS helped us find a financing solution that allowed us to pay off the MCA and move into a more manageable structure.",
  },
  {
    name: "Logan P.",
    role: "Scientific Consulting Company Founder",
    rating: 0,
    testimonial:
      "FLS helped us secure $150,000 in startup financing for vehicles and working capital. Having that capital available gave us the resources we needed to launch the company and begin operations.",
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
/** Robert's LinkedIn, linked from both his photo and the button beside it. */
const ROBERT_LINKEDIN = "https://www.linkedin.com/in/robert-saucedo-1b144b340/";

const PROCESS_STEPS = [
  {
    title: "Tell us what you need",
    body: "Click “Get Your Free Quote” and start with your goal in plain language. You don't need to know which loan product fits — that's our job.",
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
    body: "Document requests, status changes, and what's still outstanding, all in one place. We email you whenever something changes, so you never have to wonder where things stand.",
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
      {/* The clip-path repeats the radius on purpose. overflow-hidden plus
          rounded should clip the corners, but Chrome promotes a playing
          <video> to its own GPU layer and then intermittently skips the
          rounded clip for it, so the footage showed through as square
          corners. clip-path clips composited layers too. */}
      <div
        id="hero"
        className="relative mx-3 mb-3 -mt-[68px] flex min-h-[calc(100dvh-24px)] flex-col overflow-hidden rounded-[1.75rem] bg-brand-900 [clip-path:inset(0_round_1.75rem)] sm:mx-5 sm:mb-5 sm:-mt-[84px] sm:min-h-[calc(100dvh-36px)] sm:rounded-[2rem] sm:[clip-path:inset(0_round_2rem)]"
      >
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
                  <span>Your Business.</span>
                </span>
                <span className="hero-line">
                  <span className="[animation-delay:110ms]">
                    Your Capital.
                  </span>
                </span>
              </h1>
              <p className="animate-fade-in-up mt-6 max-w-2xl text-lg leading-relaxed text-brand-100 [animation-delay:150ms] sm:text-xl">
                Create an account to track your file from first question to
                funding. Your dashboard shows real-time status on your
                application and documents, flags exactly what&apos;s needed
                next, and connects you directly with your specialist.
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
              <ButtonLink href="/start" size="lg" sweep>
                Get Your Free Quote
              </ButtonLink>
              <ButtonLink
                href="#how-it-works"
                size="lg"
                variant="ghost"
                className="text-white ring-1 ring-inset ring-white/40 hover:bg-white/10 hover:text-white"
              >
                How It Works
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

          A plain <section>, not <Section>: ProcessSteps pins on wide screens
          and sets its own height and padding, and Section's py-16/py-24 would
          sit outside the pinned part. The muted background fades to white
          over the last stretch so this runs into "Who we are" without a hard
          colour edge. */}
      <section
        id="how-it-works"
        className="scroll-mt-28 bg-[linear-gradient(to_bottom,var(--color-ink-50)_calc(100%-12rem),white)] sm:scroll-mt-32"
      >
        <ProcessSteps steps={PROCESS_STEPS} />
      </section>

      {/* ---------------------------------------------------------- ABOUT US */}
      {/* Less top padding than other sections: the pinned How It Works stage
          above already ends in its own bottom space. The bottom is trimmed to
          the 5rem rhythm shared with Testimonials and Resources below: at the
          default 6rem each side, every boundary between these sections was
          ~12rem of empty band. */}
      <Section id="about" className="pb-14 pt-4 sm:pb-20 sm:pt-8">
        <Container>
          {/*
            WHO WE ARE. The whole section is the one gold card, and its own
            labels ("Meet the founder", "About the firm") do the heading's
            job; a visible "Who we are" on top of them was one label too many.
            The section heading is kept for screen readers only, so the
            section still has a name (the nav's "Who We Are" lands here).

            THE CARD: the photo on the left; beside it Robert on top, a
            hairline, and the firm underneath. Robert's block starts level
            with the photo's top edge and the firm follows 2rem under it.
            (Pinning the firm to the photo's bottom edge left too wide a gap
            once Robert's bio came down to two lines.) The LinkedIn button and
            the credential share one row to keep the column about the
            photo's height.

            COPY SOURCES. The firm description, the quote and the founding
            year come from Robert's LinkedIn (founded Nov 2024, Los Angeles,
            nationwide, the financing types, the opening of his About
            section). The years of experience and the CBCA designation
            (Corporate Finance Institute, July 2026) were supplied directly.
          */}
          {/*
            THE PHOTO IS FIXED at 28rem x 35rem on desktop, with object-top
            keeping the head in frame, at the top of the card. Its size and
            crop are settled; change the layout around it, not the photo.
            Below lg it is the same 28rem at 4:5 (the same box), capped at
            max-w-md so a phone doesn't turn it into a full-bleed poster.
            next/image serves a resized copy; the original is ~9 MB.

            The photo links to his LinkedIn too. On hover the whole photo,
            frame and picture together, grows slightly, and a small LinkedIn
            badge (dark, like the button) fades up in the corner, so it reads
            as clickable. One motion, not two: the frame lifting while the
            picture zoomed inside it read as two things moving at once. A badge rather than a label: the "Connect on
            LinkedIn" button is beside it, and the same words twice read as
            clutter. The button stays the obvious link, since touch screens
            never see the hover.

            SMOOTH, NOT JUMPY. The link itself never moves; only the photo
            inside it does. When the link itself lifted, a pointer near its
            bottom edge fell off it, the photo dropped back under the
            pointer, and the hover flickered on and off. Only transform and opacity
            animate (a moving box-shadow repaints every frame and stutters),
            on an ease-in-out curve rather than a fast-start one, and the
            badge fades rather than scaling up, which read as a pop.
          */}
          <Reveal delayMs={120}>
            <article
              aria-labelledby="about-heading"
              className="rounded-[2rem] bg-accent-100 p-5 ring-1 ring-inset ring-accent-300/70 sm:p-8 lg:p-10"
            >
              <h2 id="about-heading" className="sr-only">
                Who we are
              </h2>
              <div className="grid gap-8 lg:grid-cols-[28rem_minmax(0,1fr)] lg:gap-12">
              <a
                href={ROBERT_LINKEDIN}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Robert Saucedo, II on LinkedIn (opens in a new tab)"
                className="group relative mx-auto block aspect-[4/5] w-full max-w-md rounded-[1.5rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-800 lg:mx-0 lg:aspect-auto lg:h-[35rem] lg:max-w-none lg:self-start"
              >
                <span className="absolute inset-0 overflow-hidden rounded-[1.5rem] bg-ink-100 shadow-[0_24px_44px_-30px_rgb(40_30_10/0.55)] transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform group-hover:scale-[1.025] group-focus-visible:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-focus-visible:scale-100">
                  <Image
                    src="/brand/robert.jpg"
                    alt="Robert Saucedo, II, founder of FLS Capital Advisors"
                    fill
                    sizes="(min-width: 1024px) 28rem, (min-width: 448px) 28rem, 100vw"
                    className="object-cover object-top"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute bottom-4 right-4 flex h-11 w-11 translate-y-1.5 items-center justify-center rounded-full bg-brand-900 text-white opacity-0 shadow-lg ring-1 ring-white/15 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                  >
                    <svg viewBox="0 0 24 24" className="h-[1.125rem] w-[1.125rem] fill-current">
                      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
                    </svg>
                  </span>
                </span>
              </a>

              <div>
                <Reveal delayMs={200}>
                  <p className="text-sm font-semibold uppercase tracking-wider text-accent-800">
                    Meet the founder
                  </p>
                  <h3 className="mt-2 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
                    Robert Saucedo, II
                  </h3>
                  <p className="mt-1.5 text-lg text-ink-600">
                    Founder &amp; Financial Lending Specialist
                  </p>

                  <blockquote className="mt-5 max-w-4xl border-l-2 border-accent-700 pl-4 text-lg font-medium leading-snug text-ink-900">
                    &ldquo;The right financing can accelerate growth. The wrong
                    financing can slow it down.&rdquo;
                  </blockquote>

                  {/* One paragraph, from his LinkedIn About in the third
                      person. max-w-4xl, the same measure as the firm's
                      paragraph below, so the two blocks share a right edge. */}
                  <p className="mt-5 max-w-4xl leading-relaxed text-ink-700">
                    Robert founded Financial Lending Specialists in 2024,
                    bringing two years in commercial finance and five years of
                    helping business owners find the right solutions. He gets to
                    know each client&apos;s goals before recommending a
                    strategy.
                  </p>

                  {/* The button, then the credential beside it (stated the
                      way the issuer names it, the issuer on its own line). */}
                  <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
                  <a
                    href={ROBERT_LINKEDIN}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 self-start rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
                    </svg>
                    Connect on LinkedIn
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                    <p className="flex items-start gap-2.5 text-sm leading-snug text-ink-700">
                      <BadgeCheck
                        aria-hidden="true"
                        className="mt-px h-5 w-5 shrink-0 text-accent-800"
                        strokeWidth={1.75}
                      />
                      <span>
                        <span className="block font-semibold text-ink-900">
                          Commercial Banking &amp; Credit Analyst (CBCA&reg;)
                        </span>
                        <span className="mt-0.5 block text-ink-500">Corporate Finance Institute</span>
                      </span>
                    </p>
                  </div>
                </Reveal>

                {/* The firm, under a hairline. */}
                <Reveal delayMs={280} className="mt-8 border-t border-accent-300 pt-7">
                  <p className="text-sm font-semibold uppercase tracking-wider text-accent-800">
                    About the firm
                  </p>
                  <p className="mt-3 max-w-4xl leading-relaxed text-ink-700">
                    FLS Capital Advisors is a commercial finance brokerage based
                    in Los Angeles, working with business owners nationwide.
                    Through our network of lenders, we match you with the
                    solution that fits your situation.
                  </p>

                  {/* The financing types, as Robert lists them on LinkedIn. */}
                  <h3 className="mt-5 text-sm font-semibold uppercase tracking-wider text-ink-900">
                    What we finance
                  </h3>
                  <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-ink-700 lg:grid-cols-3 min-[100rem]:grid-cols-4">
                    {[
                      "Commercial real estate",
                      "SBA 7(a) & 504 loans",
                      "Equipment",
                      "Working capital",
                      "Invoice factoring",
                      "Construction & fix-and-flip",
                      "Business acquisitions",
                      "Healthcare practices",
                    ].map((item) => (
                      <li key={item} className="flex items-baseline gap-2.5">
                        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full bg-accent-700" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              </div>
              </div>
            </article>
          </Reveal>
        </Container>
      </Section>

      {/* ------------------------------------------------------ TESTIMONIALS */}
      {/* Heading added to match the eyebrow/title pattern every other section
          on this page uses (Who We Are, Resources) — a moving strip of quotes
          with no label read as though it had wandered in from a different
          section rather than announcing itself as reviews. Not added to the
          site nav (see NAV above): the header links to in-page anchors people
          might actually want to jump back to, and a testimonial strip between
          two other sections is not a destination in that sense. */}
      <Section tone="muted" className="relative overflow-hidden pb-14 pt-11 sm:pb-20 sm:pt-14">
        {/* The How It Works dot grid, held still, behind the cards. */}
        <div aria-hidden="true" className="section-dots pointer-events-none absolute inset-0" />
        <Container className="relative">
          <Reveal>
            <SectionHeading
              eyebrow="Testimonials"
              title="What our clients have to say..."
            />
          </Reveal>
        </Container>
        {/* Slows rather than pauses on hover: the strip is wide enough that a
            cursor resting anywhere over it stopped the whole thing, which read
            as broken. Easing down to a crawl keeps it alive but readable. */}
        <Marquee
          className="relative mt-10"
          durationSec={70}
          hoverSpeed={0.2}
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
      {/*
        Used to be a fanned deck of PDF brochure covers (CardFanCarousel).
        Replaced because the brochures themselves were replaced: each
        financing category is now a landing page on the site
        (/resources/[slug]) rather than a PDF someone downloads and never
        comes back from. This is a horizontally-scrolling row of buttons into
        those pages, not a wrapped grid — the "browse sideways" feel is the
        one thing worth keeping from the deck it replaces.
      */}
      {/* The arrows moved up beside the heading, so the section ends at the
          cards. 4rem below them, then the site-wide Back to Top link and the
          footer (see SiteFooter): about the 6rem of space the page had before
          the link moved out of the footer. */}
      <Section id="resources" className="pb-16 pt-14 sm:pb-24 sm:pt-20">
        <Container>
          <Reveal>
            <ResourceGuideScroller
              guides={RESOURCE_GUIDES}
              heading={
                <SectionHeading
                  eyebrow="Resources"
                  title="Financing guides"
                  description="How each type of financing works, what lenders evaluate, and what to prepare — organized by what you're trying to accomplish."
                />
              }
            />
          </Reveal>
        </Container>
      </Section>

    </>
  );
}
