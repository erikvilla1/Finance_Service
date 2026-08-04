import type { Metadata } from "next";
import { ButtonLink, Card, Container, Section, SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "How It Works",
  description: "How the financing process works, from first question to funding.",
};

const STEPS = [
  {
    title: "Tell us what you need",
    body: "Start with your goal in plain language. You don't need to know which loan product you're looking for — that's our job.",
  },
  {
    title: "Answer only what's relevant",
    body: "The questions adapt to your situation. A fix-and-flip investor and an equipment buyer see different questions, because they have different situations.",
  },
  {
    title: "We review your situation",
    body: "A financing specialist reviews what you've shared and identifies which programs may be relevant.",
  },
  {
    title: "Explore potential options",
    body: "We walk you through what may be available, what it would take to qualify, and what's needed next.",
  },
  {
    title: "Complete the next steps",
    body: "If you decide to move forward, we'll tell you exactly which documents are needed and help package the file.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <div className="border-b border-ink-200 bg-ink-50">
        <Container>
          <div className="py-16 sm:py-20">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              How It Works
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
              You shouldn&apos;t have to understand the financial industry before
              asking for help.
            </p>
          </div>
        </Container>
      </div>

      <Section>
        <Container>
          <ol className="space-y-5">
            {STEPS.map((step, index) => (
              <Card as="li" key={step.title} className="flex gap-5">
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-800 text-sm font-bold text-white"
                >
                  {index + 1}
                </span>
                <div>
                  <h2 className="text-base font-semibold text-ink-900">
                    {step.title}
                  </h2>
                  <p className="mt-1.5 leading-relaxed text-ink-600">{step.body}</p>
                </div>
              </Card>
            ))}
          </ol>
        </Container>
      </Section>

      <Section tone="brand">
        <Container>
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <SectionHeading
              inverted
              title="Ready to start?"
              description="It begins with one question: what are you trying to accomplish?"
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
