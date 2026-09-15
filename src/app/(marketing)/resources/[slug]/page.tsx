import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import {
  Badge,
  ButtonLink,
  Card,
  Container,
  Section,
  SectionHeading,
} from "@/components/ui";
import { getResourceGuide, RESOURCE_GUIDES } from "@/lib/resource-guides/data";
import { GrainGradient, LIGHT_GRADIENT } from "@/components/marketing/grain-gradient";

/**
 * One landing page per financing category, rendered off the shared guide data
 * (see lib/resource-guides/data.ts) rather than one component per guide — the
 * eleven masters share a structure, so this route is the only place that
 * structure is laid out.
 *
 * Every guide still needs its own downloadable PDF (platform spec's brochure
 * use case, and the thing a specialist can hand a client in person) — that is
 * the guides/[slug].pdf link below, generated from this same data.
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

  return (
    <>
      {/*
        SAME GRADIENT AS SIGN-IN, in place of the flat bg-ink-50 this band
        used to have. No negative margin to tuck it under the header — that
        trick (see the hero in page.tsx) exists to cancel out the *lack* of
        bottom padding the header only has on the home page. Off-home,
        including here, the header already carries pb-6/sm:pb-9 for exactly
        this gap (see the comment on <header> in site-chrome.tsx), so this
        band just sits in normal flow below it.

        Scoped to this band with `relative overflow-hidden`, not `fixed
        inset-0` — the rest of the page keeps its section-band structure
        (white / muted / brand), which a page-wide gradient would just be
        hidden behind anyway.
      */}
      <div className="relative overflow-hidden border-b border-ink-200">
        <GrainGradient className="absolute inset-0" {...LIGHT_GRADIENT} />
        <Container>
          <div className="relative py-16 sm:py-20">
            <Link
              href="/#resources"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
              Back to Resources
            </Link>
            <div className="mt-6">
              <Badge tone="brand">
                {"Financing Guide / " + String(guide.order).padStart(2, "0")}
              </Badge>
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              {guide.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
              {guide.dek}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/start" size="lg" sweep>
                Get Your Free Quote
              </ButtonLink>
              <ButtonLink
                href={`/guides/${guide.slug}.pdf`}
                variant="secondary"
                size="lg"
              >
                Download the Guide (PDF)
              </ButtonLink>
            </div>
          </div>
        </Container>
      </div>

      {/* INTRO */}
      <Section>
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
      <Section tone="muted">
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
      <Section>
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
            <p className="mt-8 max-w-3xl rounded-lg bg-ink-50 p-4 text-sm leading-relaxed text-ink-600">
              {guide.evaluationNote}
            </p>
          )}
        </Container>
      </Section>

      {/* PREPARING THE FILE */}
      <Section tone="muted">
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
      <Section>
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

      {/* CTA */}
      <Section tone="brand">
        <Container>
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Find the right {guide.title.toLowerCase()} path
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-brand-100">
              FLS Capital Advisors works across multiple financing sources
              rather than forcing every request into one program. Answer a
              few questions about your business and financing objective, and
              a specialist will review the paths that may fit.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/start" variant="inverted" size="lg" sweep>
                Get Your Free Quote
              </ButtonLink>
              <ButtonLink href="/contact" variant="ghost" size="lg">
                Talk With a Financing Specialist
              </ButtonLink>
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
