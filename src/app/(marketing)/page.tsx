import {
  ButtonLink,
  Card,
  Container,
  Section,
  SectionHeading,
  SelectableCard,
} from "@/components/ui";
import { FINANCING_GOALS } from "@/lib/products/goals";

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

const PROCESS_STEPS = [
  {
    title: "Tell Us What You Need",
    body: "Start with your goal in plain language. No loan terminology required.",
  },
  {
    title: "We Review Your Situation",
    body: "A financing specialist looks at what you've shared and what may fit.",
  },
  {
    title: "Explore Potential Financing Options",
    body: "We walk you through the options that may be relevant to your situation.",
  },
  {
    title: "Complete the Next Steps",
    body: "We'll tell you what's needed and help you move the file forward.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ---------------------------------------------------------------- HERO */}
      <div className="bg-brand-900">
        <Container>
          <div className="py-20 sm:py-28 lg:py-32">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Financing Solutions Built Around Your Goals
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-brand-100 sm:text-xl">
                Whether you&apos;re acquiring equipment, expanding your business,
                investing in real estate, or looking for working capital,
                Financial Lending Specialists can help you explore financing
                options tailored to your situation.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/start" size="lg">
                  See My Financing Options
                </ButtonLink>
                <ButtonLink href="/contact" variant="inverted" size="lg">
                  Talk With a Financing Specialist
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </div>

      {/* ------------------------------------------------- GOAL-BASED SELECTOR */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Start here"
            title="What are you looking to accomplish?"
            description="Pick the goal closest to your situation. We'll ask only the questions that matter for it."
          />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FINANCING_GOALS.map((goal) => (
              <li key={goal.slug} className="h-full">
                <SelectableCard
                  href={`/start?goal=${goal.slug}`}
                  title={goal.label}
                  description={goal.description}
                />
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ------------------------------------------------------ POSITIONING */}
      <Section tone="muted">
        <Container>
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
        </Container>
      </Section>

      {/* ----------------------------------------------------------- TRUST */}
      <Section>
        <Container>
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
        </Container>
      </Section>

      {/* --------------------------------------------------------- PROCESS */}
      <Section tone="muted">
        <Container>
          <SectionHeading eyebrow="How it works" title="A simple path forward" />
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS_STEPS.map((step, index) => (
              <Card as="li" key={step.title}>
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 place-items-center rounded-full bg-brand-800 text-sm font-bold text-white"
                >
                  {index + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  {step.body}
                </p>
              </Card>
            ))}
          </ol>
        </Container>
      </Section>

      {/* ------------------------------------------------------- FINAL CTA */}
      <Section tone="brand">
        <Container>
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <SectionHeading
              inverted
              title="Let's Explore Your Financing Options"
              description="Tell us what you're trying to accomplish. A financing specialist will review your information and follow up."
            />
            <ButtonLink href="/start" size="lg" className="shrink-0">
              See My Financing Options
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
