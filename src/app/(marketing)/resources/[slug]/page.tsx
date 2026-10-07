import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import {
  ButtonLink,
  Card,
  Container,
  Section,
  SectionHeading,
} from "@/components/ui";
import { getResourceGuide, RESOURCE_GUIDES } from "@/lib/resource-guides/data";
import {
  GUIDE_OBJECTIVE,
  GUIDE_PREFILL,
  prequalHref,
} from "@/lib/matching/objectives";
import { GrainGradient, LIGHT_GRADIENT } from "@/components/marketing/grain-gradient";

/**
 * One landing page per financing category, rendered off the shared guide data
 * (see lib/resource-guides/data.ts) rather than one component per guide — the
 * eleven masters share a structure, so this route is the only place that
 * structure is laid out.
 *
 * A PAGE TO LEARN FROM, WITH TWO WAYS OUT. Someone reading a guide either
 * wants this kind of financing, so "See Your Financing Options" skips the goal
 * picker and opens the prequal already set to this category (step 2), or
 * wants to look around more, so "Back to Home". Those are the only two
 * actions, at the top and again at the bottom. There is no PDF download (the
 * guide is read here, on the page) and no separate "talk to a specialist"
 * route competing with the quote.
 */

const DISCLAIMER =
  "General information only. This guide is intended for educational purposes and does not constitute an approval, commitment to lend, or guarantee of financing. Programs, eligibility, rates, fees, terms, collateral requirements, and documentation requirements vary by funding source and may change. Final eligibility and terms are determined by the applicable funding source after review of a complete application.";

export function generateStaticParams() {
  return RESOURCE_GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getResourceGuide(slug);
  if (!guide) return {};
  return { title: guide.title, description: guide.dek };
}

export default async function ResourceGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getResourceGuide(slug);
  if (!guide) notFound();

  // Straight to step 2: the questionnaire for the objective this guide belongs
  // to (spec §14), with any answer the guide already implies filled in. A guide
  // without a mapping falls back to the goal picker rather than a dead link.
  const objective = GUIDE_OBJECTIVE[guide.slug];
  const quoteHref = objective
    ? prequalHref(objective, GUIDE_PREFILL[guide.slug])
    : "/start";

  return (
    <>
      {/*
        THE SIGN-IN GRADIENT BEHIND THE WHOLE PAGE, header included, the way
        the sign-in and application pages sit on it. Fixed, so it holds still
        while the guide scrolls over it, and at -z-10 so it paints above the
        page canvas (body's white is propagated there) but under everything
        else, the footer included. Every section below is transparent
        (tone="none") so nothing covers it; the cards stay white on top.
      */}
      <GrainGradient className="fixed inset-0 -z-10" {...LIGHT_GRADIENT} />

      <div>
        <Container>
          <div className="py-12 sm:py-16">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
              Back to Home
            </Link>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              {guide.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
              {guide.dek}
            </p>
            <div className="mt-8">
              <ButtonLink href={quoteHref} size="lg" sweep>
                See Your Financing Options
              </ButtonLink>
            </div>
          </div>
        </Container>
      </div>

      {/* INTRO */}
      <Section tone="none" className="pt-0 sm:pt-4">
        <Container>
          <div className="max-w-3xl space-y-5">
            {guide.intro.map((paragraph) => (
              <p
                key={paragraph.slice(0, 40)}
                className="text-lg leading-relaxed text-ink-700"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </Container>
      </Section>

      {/* USE CASES */}
      <Section tone="none">
        <Container>
          <SectionHeading title={guide.useCasesTitle} />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {guide.useCases.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-lg bg-white p-4 ring-1 ring-inset ring-ink-200/70"
              >
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-accent-800"
                  strokeWidth={2.5}
                />
                <span className="text-sm leading-relaxed text-ink-700">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* HOW LENDERS EVALUATE THE REQUEST */}
      <Section tone="none">
        <Container>
          <SectionHeading
            eyebrow="How lenders look at it"
            title="What typically drives the financing decision"
          />
          <ul className="mt-8 grid gap-5 sm:grid-cols-2">
            {guide.evaluationAreas.map((area) => (
              <Card as="li" key={area.title}>
                <h3 className="text-base font-semibold text-ink-900">
                  {area.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  {area.body}
                </p>
              </Card>
            ))}
          </ul>
          {guide.evaluationNote && (
            <p className="mt-8 max-w-3xl rounded-lg bg-white/70 p-4 text-sm leading-relaxed text-ink-600 ring-1 ring-inset ring-ink-200/70">
              {guide.evaluationNote}
            </p>
          )}
        </Container>
      </Section>

      {/* PREPARING THE FILE */}
      <Section tone="none">
        <Container>
          <SectionHeading
            eyebrow="Preparing your request"
            title="What to have ready"
            description="Requirements vary by program, but a complete and organized package helps FLS identify the right path and reduces unnecessary back-and-forth."
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {guide.prepChecklist.map((item) => (
              <Card key={item.category}>
                <h3 className="text-base font-semibold text-ink-900">
                  {item.category}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  {item.body}
                </p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* PROCESS */}
      <Section tone="none">
        <Container>
          <SectionHeading eyebrow="Process" title="From request to funding" />
          <ol className="mt-10 space-y-6">
            {guide.process.map((step, index) => (
              <li key={step.title} className="flex gap-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-900 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <div className="pt-1">
                  <h3 className="text-base font-semibold text-ink-900">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-600">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-12 max-w-3xl rounded-card border border-accent-300 bg-accent-50 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-accent-900">
              What can strengthen the request?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">
              {guide.strengthenTip}
            </p>
          </div>
        </Container>
      </Section>

      {/*
        CTA. The same two ways out as the top of the page, as a white card on
        the gradient rather than the dark band this used to be (which broke
        the one continuous background).
      */}
      <Section tone="none" className="pt-0 sm:pt-0">
        <Container>
          <div className="max-w-3xl rounded-[1.75rem] bg-white/85 p-8 shadow-card ring-1 ring-inset ring-ink-200/70 backdrop-blur-sm sm:p-10">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              Find the right {guide.title.toLowerCase()} path
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-600">
              FLS Capital Advisors works across multiple financing sources
              rather than forcing every request into one program. Answer a
              few questions about your business and financing objective, and
              a specialist will review the paths that may fit.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <ButtonLink href={quoteHref} size="lg" sweep>
                See Your Financing Options
              </ButtonLink>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
                Back to Home
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      <Container>
        <p className="border-t border-ink-200 py-10 text-xs leading-relaxed text-ink-500">
          {DISCLAIMER}
        </p>
      </Container>
    </>
  );
}
