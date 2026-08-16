import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Badge,
  ButtonLink,
  Card,
  Container,
  IndicativeDisclosure,
  ProgressBar,
} from "@/components/ui";
import { Check, Minus } from "lucide-react";
import { Confetti } from "@/components/ui/confetti";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { ProductMatch } from "@/lib/qualification/types";
import {
  PREQUAL_FLOW_LABEL,
  PREQUAL_FLOW_STEPS,
} from "@/lib/applications/flow";

export const metadata: Metadata = {
  title: "Your financing options",
  robots: { index: false, follow: false },
};

/**
 * Prequalification result — the "CarFax" moment.
 *
 * Platform spec §26 and §27 govern the language here, and they are strict:
 *   • never "approved" — the platform does not decide credit
 *   • "Potential match" / "Requires specialist review" only
 *   • indicative figures only, and only from verified products
 *
 * On the dollar figures: every range on this page is MODELLED, not quoted. The
 * multiples behind them were reverse-engineered from a competitor's public
 * qualification tool (migration 0017), not supplied by Robert. That is why the
 * word "illustrative" appears above the figures rather than buried in a footer,
 * and why no figure is ever shown without a range and a caveat attached.
 *
 * Looked up by public_token, not reference_code. Reference codes are sequential
 * and would let anyone walk the whole table (see migration 0009).
 *
 * Reads on the service role because the applicant is anonymous. Only the single
 * token-matched row is fetched, and nothing sensitive is on this page.
 */

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) {
    return `${currency.format(min)} – ${currency.format(max)}`;
  }
  return currency.format((min ?? max) as number);
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(token)) notFound();

  const supabase = createServiceRoleClient();

  const { data: application } = await supabase
    .from("applications")
    // reference_code is deliberately NOT selected. Nothing on this page renders
    // it any more (see the note where it used to be), and a column fetched for
    // no reason is how a removed field quietly comes back.
    .select("id, financing_goal, requested_amount, created_at")
    .eq("public_token", token)
    .maybeSingle();

  if (!application) notFound();

  const { data: result } = await supabase
    .from("qualification_results")
    .select("*")
    .eq("application_id", application.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const matches = (result?.product_matches ?? []) as unknown as ProductMatch[];
  const potential = matches.filter((m) => m.confidence === "potential_match");
  const review = matches.filter((m) => m.confidence === "requires_review");
  const notEligible = matches.filter((m) => m.confidence === "not_eligible");

  // The headline is computed from the matches rather than read from the row, so
  // it can never disagree with the cards printed underneath it.
  //
  // BOTH GROUPS COUNT. A product only reaches "requires review" after passing
  // its own eligibility rule — the downgrade comes from a risk flag raised
  // elsewhere in the submission (a declining deposit trend, a prior default),
  // which forces every match on the application to a human. Reading the
  // headline from confirmed matches alone meant that a single risk flag erased
  // the figure entirely: the applicant was told a product was a possibility and
  // shown no sense of scale for it, on the page whose entire job is to give
  // them a reason to continue.
  //
  // The engine only ever sizes a product it matched, so nothing here can put a
  // number against something the rules ruled out.
  const sized = [...potential, ...review];

  const hasEstimates = sized.some((m) => m.estimatedAmountMax != null);

  return (
    <Container>
      {/*
        CONFETTI, AND ONLY WHEN THERE IS SOMETHING TO CELEBRATE.

        Gated on sized.length, the same list the page prints below — so it
        cannot fire for someone who qualified for nothing. Getting that wrong
        would be worse than having no confetti at all: throwing a party over a
        page that just told a business owner none of the options are open to
        them reads as the site laughing at them.

        Rendered from the server component so the gate is evaluated with the
        matches themselves rather than duplicated in the client.
      */}
      {sized.length > 0 && <Confetti />}

      {/* max-w-5xl, up from max-w-2xl. At 672px this page was a narrow ribbon
          down the middle of a very wide container — fine when it was one column
          of prose, wasteful now that the options are a grid. Text blocks inside
          keep their own caps: a paragraph does not become more readable by
          getting longer lines. */}
      <div className="mx-auto max-w-5xl">
        {/*
          3 of 3 — the bar completes here, because this is where the thing it
          promised is delivered. Creating an account is a separate decision with
          its own page; see PREQUAL_FLOW_STEPS.

          `animated` sweeps the fill and lands a check on the end. This is the
          one bar in the app that marks an arrival rather than reporting a
          standing state, which is why the prop exists rather than the behaviour
          being the default.

          STAGGERED ENTRANCE, same as steps 1 and 2 (see /start and
          /start/prequal), so arriving here reads as the next beat of one flow
          rather than a page swap. Delays step in reading order. CSS only: it
          costs nothing, runs on the compositor, works without hydration, and
          the blanket prefers-reduced-motion rule already collapses it.

          The delays were 0 / 120 / 260 / 360 / 440 when the summary tiles and
          the caveat sat between the headline and the options. Both moved out,
          and leaving the last value alone would have left a third of a second
          of nothing between the headline and the only content on the page.
          Now 0 / 120 / 240.
        */}
        <div className="animate-fade-in-up">
          <ProgressBar
            value={3}
            max={PREQUAL_FLOW_STEPS}
            label={PREQUAL_FLOW_LABEL}
            animated
          />
        </div>

        {/* ------------------------------------------------------------------
            Answer the question in their head — "did that work?" — without
            overclaiming.

            This page must NOT say an application has been created or that a
            specialist is reviewing it. Neither is true here: the applicant
            answered six questions and the engine ran. The row in `applications`
            is a lead record, not something anyone has applied for.

            It also must not tell them to sit tight. Every version of "you don't
            need to do anything right now" argues against the CTA further down
            the page, and the applicant will believe the reassurance over the
            button.
        ------------------------------------------------------------------- */}
        <div className="animate-fade-in-up mt-8 rounded-xl border border-success-600/25 bg-success-50 p-5 [animation-delay:120ms]">
          <Badge tone="success">Prequalification complete</Badge>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Here&apos;s what you could qualify for
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-700">
            Based on what you told us, these are the programs that look like a
            fit. Nothing has been applied for yet — starting your application is
            the next step, and you can do it below.
          </p>
          {/*
            NO REFERENCE CODE HERE.

            "Your reference: FLS-2026-000015" used to sit on this line. It was
            removed because this is a prequalification, not an application — the
            row behind it is a lead record, and a case number handed over before
            there is a case is a receipt for something that has not happened.

            The code is a real thing and still exists on every row. Its jobs are
            naming a file to a lender, identifying which file on a call, and
            being searchable in admin — all of which are FLS's jobs, none of
            which have started at this point in the flow. It still appears where
            those jobs are live: the portal dashboard, the admin views, and the
            printed lender package.

            Secondary reason not to bring it back as-is: reference codes are
            sequential, so printing one publicly announces how many applications
            there have been this year. Migration 0009 added public_token
            precisely because that sequence is enumerable.
          */}
        </div>

        {/*
          NO SUMMARY TILES. There were two — "Options identified" and
          "Illustrative ceiling" — under a "What we found" heading, and they are
          gone because they restated the page rather than adding to it.

          The count was the length of the list immediately below it, so it told
          the reader a number they were about to see for themselves. The ceiling
          was the largest range on that same list, promoted to a 3xl figure and
          stripped of the product it belonged to — which made the single biggest
          number on the screen the one with the least context attached.

          They also sat between the headline and the options, so the first thing
          after "Here's what you could qualify for" was arithmetic rather than
          the answer.

          maxEstimated went with them. It was computed for the ceiling tile and
          nothing else read it.
        */}

        {/* ------------------------------------------------------------------
            ONE LIST, NOT TWO.

            This was two sections: "Potential matches" and, under it, "Requires
            specialist review". They are merged because the heading on the
            second one was telling the applicant something that is true of every
            row on this page — a funding source underwrites each file
            individually no matter which bucket the engine chose, and every
            figure here is illustrative either way. As a section heading it read
            as a caveat attached to some products and not others, which implied
            the others were settled. None of them are.

            The per-card "Potential match" / "Needs review" badges are gone for
            the same reason. A warning-toned badge on half the list made those
            products look like the applicant had a problem, when what it
            actually recorded was that a rule wanted a human to look — which is
            the process working, not a mark against them.

            KEPT: "Matches your goal". That one says something the applicant
            told us and can act on, rather than grading them.

            The confidence values are untouched in the data. product_matches
            still carries potential_match and requires_review per product, and
            the admin view still reads them, so nothing a specialist needs was
            thrown away.
        ------------------------------------------------------------------- */}
        {/* ------------------------------------------------------------------
            THE TWO LISTS, SIDE BY SIDE.

            They used to be stacked, which meant a column of declines sat
            between the good news and the button — the reader had to scroll past
            what they cannot have to reach the thing they can do. Beside each
            other, the comparison is the point rather than a sequence, and the
            eye takes both in at once.

            The status marks carry the meaning, not the headings: a green check
            on everything available, a muted red dash on everything not. That is
            scannable without reading a word, which is the whole job of this
            screen.

            DELIBERATELY RESTRAINED RED. The mark is danger-700 on a danger-50
            disc and the card itself stays neutral — no red fill, no red border.
            This page must not read as a credit decision (spec §26: never
            "approved", and by the same logic never "declined"). A card flooded
            with red reads as a rejection notice from a lender, which is exactly
            what this is not: nothing has been applied for, and the reasons
            listed are thresholds, not verdicts.

            One column when there is nothing in the second list, so a clean
            result does not render an empty half.
        ------------------------------------------------------------------- */}
        <div className="animate-fade-in-up mt-10 space-y-10 [animation-delay:240ms]">
          {sized.length > 0 && (
            <section>
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success-50 text-success-700"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <h2 className="text-lg font-semibold text-ink-900">
                  You could qualify for
                </h2>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
                A financing specialist confirms the details, and the funding
                source reviews every file individually before any terms are
                offered.
              </p>
              {/* A GRID, NOT A COLUMN, AND STACKED RATHER THAN SIDE BY SIDE.

                  The two lists were columns next to each other, which only
                  looks composed when they happen to be the same length. Four
                  available against one unavailable left an entire empty column
                  down the right of the page, and cards never lined up across
                  the gap because their heights are set by their own content.

                  Stacked, each group flows across the full width and wraps on
                  its own. Any split works — six and one, one and six, or none
                  at all — because neither group is holding a space open for
                  the other. */}
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sized.slice(0, 8).map((match) => {
                  const range = formatRange(
                    match.estimatedAmountMin,
                    match.estimatedAmountMax,
                  );
                  return (
                    <Card as="li" key={match.productSlug} className="h-full">
                      <div className="flex items-start gap-2.5">
                        <span
                          aria-hidden="true"
                          className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success-50 text-success-700"
                        >
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-ink-900">
                            {match.productName}
                          </h3>
                          {match.alignsWithGoal && (
                            <div className="mt-2">
                              <Badge tone="brand">Matches your goal</Badge>
                            </div>
                          )}

                          {/* text-lg, not text-xl. These cards are half the
                              width they used to be, and a long range wrapped
                              mid-figure at the old size. */}
                          {range && (
                            <p className="mt-2 font-mono text-lg font-bold text-ink-900">
                              {range}
                            </p>
                          )}
                          {range && (
                            <p className="text-xs text-ink-500">
                              illustrative range
                            </p>
                          )}

                          {match.reasons.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {match.reasons.map((reason) => (
                                <li key={reason} className="text-sm text-ink-600">
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </ul>
            </section>
          )}

          {/* "A denial is not a forever no" (BUSINESS_CONTEXT §2) — telling
              someone they were 20 points short is what brings them back, so
              every blocker stays on the card. */}
          {notEligible.length > 0 && (
            <section>
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-danger-50 text-danger-700"
                >
                  <Minus className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <h2 className="text-lg font-semibold text-ink-900">
                  Not available right now
                </h2>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
                These look out of reach today. That can change — circumstances
                move, and so do lender programs.
              </p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {notEligible.map((match) => (
                  <Card as="li" key={match.productSlug} className="h-full">
                    <div className="flex items-start gap-2.5">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-danger-50 text-danger-700"
                      >
                        <Minus className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-ink-700">
                          {match.productName}
                        </h3>
                        {match.blockers.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {match.blockers.map((blocker) => (
                              <li key={blocker} className="text-sm text-ink-600">
                                {blocker}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ------------------------------------------------------------------
            THE CAVEAT NOW SITS UNDER THE FIGURES RATHER THAN OVER THEM.

            It used to lead, on the reasoning that anyone who reads only the
            numbers should have passed the warning first. Moved because it was
            the third block of preamble between the headline and the options,
            and a reader who has to wade through caveats to reach the answer
            stops reading caveats.

            "BELOW" BECAME "ABOVE". The copy pointed at figures that are now
            behind it — a one-word tell that would have quietly made the
            disclosure describe the wrong thing, which on this page is the kind
            of inaccuracy that matters.

            It is still on the page, still directly attached to the figures, and
            still ahead of the CTA and IndicativeDisclosure further down. Nobody
            reaches the button without passing it.
        ------------------------------------------------------------------- */}
        {hasEstimates && (
          <p className="mt-8 max-w-3xl rounded-lg border border-warning-600/25 bg-warning-50 p-4 text-sm leading-relaxed text-ink-700">
            <strong className="font-semibold">
              The figures above are for illustrative purposes only.
            </strong>{" "}
            They are modelled from the revenue you reported to show the rough
            shape of what may be available. They are not quotes, not offers, and
            not amounts anyone has agreed to lend. Real figures come from a
            lender after a full review.
          </p>
        )}

        {matches.length === 0 && (
          <Card className="mt-8">
            <h2 className="text-base font-semibold text-ink-900">
              A specialist will review your information
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              We weren&apos;t able to narrow the options automatically from what
              you&apos;ve shared so far. That isn&apos;t a decline — it means a
              person should look at your situation directly.
            </p>
          </Card>
        )}

        {/* ------------------------------------------------------------------
            The conversion moment.

            This sits directly under the figures, while the applicant is still
            looking at what they might qualify for — that interest is the thing
            being converted, and it decays with every screen. The disclosure
            stays ABOVE the button so nobody clicks through without having
            passed the caveat.
        ------------------------------------------------------------------- */}
        <div className="mt-8">
          <IndicativeDisclosure />
        </div>

        {/*
          THE ONE DARK BLOCK ON A CREAM PAGE.

          This was brand-50 with a brand-200 border — which made the single most
          important element on the screen the quietest thing on it. The success
          box above is green and the caveat is amber, so the eye reached both of
          those before the only control that does anything.

          It wins on contrast rather than on size. Everything else here is cream
          or white, so near-black reads as the end of the page and the thing to
          act on without needing to be larger than the content above it. The
          cream button on near-black is also the highest-contrast pairing the
          palette has, and it is the same one the hero uses — so the page closes
          on the shape it opened with.

          Cost, stated plainly: a hard visual stop means "What happens next"
          below it gets read less. That is the correct trade here — it is
          reassurance, not an action, and anyone who has already decided does not
          need it.
        */}
        <div className="mt-10 rounded-2xl bg-brand-900 p-7 shadow-card sm:p-9">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Ready to move forward?
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-brand-100">
            Starting your application creates an account where you can upload
            your documents, track where things stand, and pick up any time.
          </p>

          <div className="mt-6">
            <ButtonLink
              href={`/create-account?application=${token}`}
              size="lg"
              className="w-full sm:w-auto"
            >
              Start Application Now
            </ButtonLink>
          </div>

          {/* brand-100 rather than ink-600: the old colour was chosen for a
              near-white panel and is close to unreadable on brand-900. */}
          <p className="mt-4 text-sm leading-relaxed text-brand-100/85">
            This doesn&apos;t submit an application for credit and doesn&apos;t
            affect your credit score.
          </p>
        </div>

        <div className="mt-8 border-t border-ink-200 pt-8">
          <h2 className="text-lg font-semibold text-ink-900">What happens next</h2>
          <ol className="mt-4 space-y-3">
            {[
              "You start your application and create an account to keep track of it.",
              "You send us your documents — we'll show you exactly what's needed.",
              "A financing specialist reviews everything and walks you through the real options.",
            ].map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-relaxed text-ink-600">
                <span
                  aria-hidden="true"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800"
                >
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          {/* NO SECOND BUTTON HERE. "Talk with a financing specialist" sat
              directly under the primary CTA and offered a way out of the flow at
              the exact moment the page is asking someone to commit — a second
              action competing with the one this screen exists for. Contact is
              still reachable; it is just no longer a fork in the road. */}
        </div>
      </div>
    </Container>
  );
}
