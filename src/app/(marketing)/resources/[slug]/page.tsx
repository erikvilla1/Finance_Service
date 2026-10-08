import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import { relatedGuides } from "@/lib/resource-guides/related";
import Link from "next/link";
import { ButtonLink, Container } from "@/components/ui";
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
 * A DOCUMENT, NOT A LANDING PAGE. These are information pages — closer to a
 * brochure than to the home page — and the first version dressed them as a
 * landing page: six stacked <Section>s with 6rem of padding each, a bordered
 * card around every list item, numbered circles on the process, an eyebrow +
 * display heading repeated per section, all left-aligned in a max-w-3xl
 * column with the right half of the viewport empty. The client called it
 * "visuals for the sake of being there", and that was fair.
 *
 * Now: one article column at a reading measure, a sticky rail beside it on
 * large screens (an "in this guide" index, the related guides), hairline
 * dividers instead of cards, small mono numerals instead of badges, headings
 * at a document scale, and the vertical rhythm cut to what a document needs.
 * The rail is what gives the right-hand space a job; below lg it folds under
 * the article as a plain list.
 *
 * THREE WAYS OUT, unchanged: "See Your Financing Options" (prequal, already
 * set to this category), "Back to Home", and the related guides. Still no PDF
 * download and no separate "talk to a specialist" route competing with the
 * quote. The related guides sit in the rail and after the CTA, never between
 * the reader and the one action the page exists for.
 */

const DISCLAIMER =
  "General information only. This guide is intended for educational purposes and does not constitute an approval, commitment to fund, or guarantee of financing. Programs, eligibility, rates, fees, terms, collateral requirements, and documentation requirements vary by funding source and may change. Final eligibility and terms are determined by the applicable funding source after review of a complete application.";

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

  // Pairs from the client's Sept 29 review, symmetric by construction — see
  // lib/resource-guides/related.ts. Empty for a guide with no pair, which the
  // section below renders as nothing rather than a bare heading.
  const related = relatedGuides(guide.slug);

  const sections = [
    { id: "overview", label: "Overview" },
    { id: "use-cases", label: guide.useCasesTitle },
    { id: "evaluation", label: "What drives the decision" },
    { id: "prepare", label: "What to have ready" },
    { id: "process", label: "From request to funding" },
  ];
  const pad = (n: number) => String(n).padStart(2, "0");
  const H2 = "text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl";
  const DL = "mt-4 divide-y divide-ink-200/80 border-y border-ink-200/80";

  return (
    <>
      {/* The sign-in gradient behind the whole page, header included. Fixed,
          and at -z-10 so it paints above the body canvas but under everything
          else; every block below is transparent so nothing covers it. */}
      <GrainGradient className="fixed inset-0 -z-10" {...LIGHT_GRADIENT} />

      <Container>
        {/* HEADER. Tight on purpose: a document starts near the top. */}
        <header className="pb-8 pt-6 sm:pb-10 sm:pt-8">
          {/*
            "Resources" POINTS AT /#resources, NOT /resources — there is no
            resources index route; the guides are a section on the home page.
            The guide's own title is the last crumb, not a link, with
            aria-current so assistive tech announces it as the location.
          */}
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-semibold">
              <li>
                <Link href="/" className="-my-2 inline-block py-2 text-brand-600 hover:text-brand-700">
                  Home
                </Link>
              </li>
              <li className="flex items-center gap-x-1.5">
                <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-ink-400" strokeWidth={2.5} />
                <Link href="/#resources" className="-my-2 inline-block py-2 text-brand-600 hover:text-brand-700">
                  Resources
                </Link>
              </li>
              <li className="flex items-center gap-x-1.5">
                <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-ink-400" strokeWidth={2.5} />
                <span aria-current="page" className="text-ink-600">
                  {guide.title}
                </span>
              </li>
            </ol>
          </nav>
          <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            {guide.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-600 sm:text-lg">
            {guide.dek}
          </p>
          <div className="mt-6">
            <ButtonLink href={quoteHref} size="md" sweep>
              See Your Financing Options
            </ButtonLink>
          </div>
        </header>

        <div className="grid gap-10 pb-12 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-16">
          <article className="min-w-0 max-w-2xl space-y-12">
            <section id="overview" className="scroll-mt-28 space-y-4">
              {guide.intro.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="text-base leading-relaxed text-ink-700 sm:text-lg">
                  {paragraph}
                </p>
              ))}
            </section>

            <section id="use-cases" className="scroll-mt-28">
              <h2 className={H2}>{guide.useCasesTitle}</h2>
              {/* A list, not a grid of cards. Twelve bordered boxes for twelve
                  short phrases was the clearest case of chrome outweighing
                  content on the old page. */}
              <ul className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {guide.useCases.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[0.95rem] leading-relaxed text-ink-700">
                    <Check aria-hidden="true" className="mt-1.5 h-3.5 w-3.5 shrink-0 text-accent-800" strokeWidth={2.5} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section id="evaluation" className="scroll-mt-28">
              <h2 className={H2}>What drives the decision</h2>
              {/* Term / definition rows with hairlines. The content is a label
                  and a sentence; a definition list is what that is. */}
              <dl className={DL}>
                {guide.evaluationAreas.map((area) => (
                  <div key={area.title} className="grid gap-1 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
                    <dt className="text-sm font-semibold text-ink-900">{area.title}</dt>
                    <dd className="text-sm leading-relaxed text-ink-600">{area.body}</dd>
                  </div>
                ))}
              </dl>
              {guide.evaluationNote && (
                <p className="mt-4 text-sm leading-relaxed text-ink-500">{guide.evaluationNote}</p>
              )}
            </section>

            <section id="prepare" className="scroll-mt-28">
              <h2 className={H2}>What to have ready</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Requirements vary by program, but a complete, organized package helps
                FLS identify the right path and reduces back-and-forth.
              </p>
              <dl className={DL}>
                {guide.prepChecklist.map((item) => (
                  <div key={item.category} className="grid gap-1 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
                    <dt className="text-sm font-semibold text-ink-900">{item.category}</dt>
                    <dd className="text-sm leading-relaxed text-ink-600">{item.body}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section id="process" className="scroll-mt-28">
              <h2 className={H2}>From request to funding</h2>
              {/* Small mono numerals, not badges in circles. The number is a
                  position in a sequence, which is all it needs to be. */}
              <ol className={DL}>
                {guide.process.map((step, index) => (
                  <li key={step.title} className="grid gap-1 py-4 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-4">
                    <span className="font-mono text-xs tabular-nums text-accent-800 sm:pt-0.5">
                      {pad(index + 1)}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-ink-900">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-600">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <aside className="mt-6 border-l-2 border-accent-600 pl-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-900">
                  What strengthens a request
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{guide.strengthenTip}</p>
              </aside>
            </section>

            {/* CTA. The one card left on the page, because the one action
                deserves a surface. Two ways out, as at the top. */}
            <section className="rounded-2xl bg-white/85 p-6 shadow-card ring-1 ring-inset ring-ink-200/70 backdrop-blur-sm sm:p-8">
              <h2 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
                Find the right {guide.titleInSentence ?? guide.title.toLowerCase()} path
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600 sm:text-base">
                FLS Capital Advisors works across multiple funding sources rather
                than forcing every request into one program. Answer a few
                questions about your business and objective, and a specialist
                will review the paths that may fit.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                <ButtonLink href={quoteHref} size="md" sweep>
                  See Your Financing Options
                </ButtonLink>
                <Link
                  href="/"
                  className="-my-2 inline-flex items-center gap-1.5 py-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
                  Back to Home
                </Link>
              </div>
            </section>
          </article>

          {/* RAIL. Sticky beside the article from lg; a plain list under it
              below. top-28 clears the floating header. The index is lg-only —
              on a phone the page is short enough to scroll. */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <nav aria-label="In this guide" className="hidden lg:block">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">In this guide</p>
              <ul className="mt-3 space-y-2 text-sm">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="-my-1 inline-block py-1 text-ink-700 hover:text-brand-700">
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            {related.length > 0 && (
              <div className="lg:mt-8 lg:border-t lg:border-ink-200/80 lg:pt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Related guides</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {related.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/resources/${item.slug}`}
                        className="-my-2 inline-flex items-center gap-1 py-2 font-medium text-brand-700 hover:text-brand-800"
                      >
                        {item.title}
                        <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>

        <p className="border-t border-ink-200 py-8 text-xs leading-relaxed text-ink-500">
          {DISCLAIMER}
        </p>
      </Container>
    </>
  );
}
