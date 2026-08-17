import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Badge,
  Card,
  Container,
  IndicativeDisclosure,
  ProgressBar,
} from "@/components/ui";
import { Check, ChevronDown, Minus } from "lucide-react";
import { Confetti } from "@/components/ui/confetti";
import { CountUpAmount } from "@/components/marketing/count-up";
import { FluidParticles } from "@/components/ui/fluid-particles";
import { GlowButtonLink } from "@/components/ui/glow-button-link";
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

/* The currency formatter and formatRange used to live here. Both moved into
   CountUpAmount when the figures started counting up — the component has to
   format every intermediate frame, so keeping a second formatter on this side
   would have been two places to disagree about what a dollar looks like. */

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
          {/* TWO COLUMNS ON DESKTOP, STACKED ON MOBILE.

              items-start rather than items-center: the text column is three or
              four lines tall and the button is one, so centring would float the
              button halfway down the panel instead of aligning it with the
              badge it sits beside. gap-6 keeps it off the text at the width
              where they first sit side by side. */}
          {/* sm:items-stretch, not items-start. The right-hand column has to be
              as tall as the copy beside it for justify-between to have anywhere
              to push the scroll cue — with items-start the column shrinks to fit
              the button and the cue sits directly beneath it, halfway up the
              panel rather than in the corner. */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-stretch sm:justify-between">
            <div className="min-w-0">
              <Badge tone="success">Prequalification complete</Badge>
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                Here&apos;s what you could qualify for
              </h1>
              {/* NO max-w HERE. It was max-w-2xl — a 672px measure inside a
                  panel well over a thousand wide, which stopped the text
                  mid-box and read as a rendering fault rather than as
                  typographic restraint. The panel is the thing setting the
                  measure now. */}
              <p className="mt-3 leading-relaxed text-ink-700">
                Based on what you told us, these are the programs that look like
                a fit. Nothing has been applied for yet — starting your
                application is the next step.
              </p>
            </div>

            {/* THE PRIMARY ACTION, MOVED ABOVE THE FOLD.

                variant="contrast", NOT primary. primary is cream at oklch 0.895
                and this panel is success-50 at 0.96 — a six-percent step, which
                is a button you have to go looking for. Near-black on pale green
                is the highest-contrast pairing available here, and it matches
                the dark panel at the foot of the page, so the page's two calls
                to action read as one voice rather than two designs.

                shrink-0 so a long label never compresses the button into two
                lines, and w-full below sm so it is a full-width tap target on a
                phone rather than a small box floating under the paragraph. */}
            {/* sweep instead of glow, not as well as. The sweep panel paints
                above the glow and covers it precisely when the cursor is on the
                button, so keeping both would render a layer nothing can ever
                see. The shimmer stays — it runs on the rim, outside the panel's
                path, and it is what makes this the button the eye lands on
                before anyone has moved a cursor at all. */}
            <div className="flex shrink-0 flex-col justify-between gap-4 sm:items-end">
              <GlowButtonLink
                href={`/create-account?application=${token}`}
                variant="contrast"
                size="lg"
                glow={false}
                sweep
                className="w-full sm:w-auto"
              >
                Start Application Now
              </GlowButtonLink>

              {/* THE HOME PAGE'S SCROLL CUE, RECOLOURED FOR A LIGHT PANEL.

                  The original is brand-100/70 on white — it lives over the dark
                  hero video. Reused as-is here it would be near-white text on
                  pale green. ink-500 to ink-900 is the same relationship the
                  other way up.

                  It points at #options, the list of products directly below,
                  rather than at the page's next section in document order. The
                  cue exists because the button beside it is one of two things
                  someone can do here; the other is read what they qualified
                  for, and that is what this scrolls to.

                  The bounce and the delayed entrance are carried over unchanged
                  — the blanket prefers-reduced-motion rule in globals.css
                  already collapses both. */}
              <a
                href="#options"
                className="animate-fade-in-up flex items-center justify-center gap-2 text-sm text-ink-500 transition-colors [animation-delay:420ms] hover:text-ink-900 sm:justify-end"
              >
                Scroll to explore
                <ChevronDown
                  aria-hidden="true"
                  className="h-4 w-4 animate-bounce"
                />
              </a>
            </div>
          </div>
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
        {/* id + scroll-mt for the "Scroll to explore" cue in the panel above.

            scroll-mt-16 is breathing room, not clearance: this flow's header
            does not scroll with the page, so nothing would cover the heading.
            Without it the anchor still lands with "You could qualify for" flush
            against the top edge of the window, which reads as having overshot.
            If the header is ever made sticky this needs to grow to match it. */}
        <div
          id="options"
          className="animate-fade-in-up mt-10 scroll-mt-16 space-y-10 [animation-delay:240ms]"
        >
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
                  const hasRange =
                    match.estimatedAmountMin != null ||
                    match.estimatedAmountMax != null;
                  return (
                    <Card
                      as="li"
                      key={match.productSlug}
                      /* transition-[translate,box-shadow], NOT the bare
                         `transition`. Tailwind v4 emits -translate-y-1 as the
                         `translate` property, and `translate` is not in the
                         default transition-property list — the shadow would
                         have faded while the card jumped. box-shadow covers
                         the ring too, since a ring is a box-shadow. */
                      className="group result-card result-card-eligible h-full transition-[translate,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-card-hover hover:ring-success-600/30"
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          aria-hidden="true"
                          className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success-50 text-success-700 transition-transform duration-300 ease-out group-hover:scale-110"
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
                          {hasRange && (
                            <p className="mt-2 font-mono text-lg font-bold text-ink-900">
                              <CountUpAmount
                                min={match.estimatedAmountMin}
                                max={match.estimatedAmountMax}
                              />
                            </p>
                          )}
                          {hasRange && (
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
                  <Card
                    as="li"
                    key={match.productSlug}
                    tone="muted"
                    className="group result-card result-card-blocked h-full transition-[translate,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-card hover:ring-danger-600/25"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-danger-50 text-danger-700 transition-transform duration-300 ease-out group-hover:scale-110"
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

        {/*
          THE DARK BLOCK IS BACK — AND THE PANEL MOVED SO THE BUTTON DIDN'T HAVE
          TO.

          The problem this solves: the page's call to action appears twice, and
          the two have to be recognisably the same control. The top one is
          near-black on pale green. Down here the panel is near-black too, so the
          obvious fix is to recolour the button — and every version of that
          breaks the thing it is trying to preserve. Cream reads as a different
          button. White reads as a different button. A near-black button with an
          outline reads as an outlined variant of a button, which is its own
          third thing.

          So the button is left completely alone — same `contrast` variant, same
          size, same sweep, same label as the one at the top of the page, with no
          per-instance overrides at all — and the SURFACE steps out of its way
          instead. brand-950 at oklch 0.16 against the button's brand-900 at
          0.24: still unambiguously the dark block that closes the page, now a
          shade deeper than the control sitting on it, so the button reads as
          raised rather than as a hole cut in the panel.

          The hover helps too. `contrast` lightens to brand-800 on hover, which
          against a 0.16 panel is a step further away from the background rather
          than toward it.

          The ring is the second half of the same idea: one hairline of white at
          low opacity, enough to draw the button's edge without adding a colour
          that would make it look like a different component.
        */}
        {/* CENTRED, UNLIKE EVERYTHING ABOVE IT. The rest of the page is a
            left-aligned document; this panel is a single decision. Centring is
            what stops it reading as one more section and starts it reading as
            the close of the page.

            The paragraph keeps a measure (max-w-xl) and centres with mx-auto
            rather than losing the cap. Centred text is harder to track back to
            the start of each line, so a long one is worse centred than left —
            the cap is doing more work here than it was doing in the green box. */}
        {/* isolate is what keeps the canvas inside this panel. FluidParticles
            positions itself at -z-10 so it paints above the panel's background
            and below the copy — but without a stacking context here, a negative
            z-index escapes the panel entirely and the field would end up behind
            the page. overflow-hidden clips it to the rounded corners. */}
        <div className="relative isolate mt-10 overflow-hidden rounded-2xl bg-brand-950 p-7 text-center shadow-card sm:p-9">
          <FluidParticles />
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Ready to move forward?
          </h2>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed text-brand-100">
            Starting your application creates an account where you can upload
            your documents, track where things stand, and pick up any time.
          </p>

          {/* THE SAME BUTTON AS THE TOP OF THE PAGE. Deliberately not "a button
              styled to match" — the props are identical, and the only addition
              is a hairline edge so it separates from the panel behind it. If the
              treatment up there ever changes, changing it here is the same
              edit. */}
          <div className="mt-6 flex justify-center">
            <GlowButtonLink
              href={`/create-account?application=${token}`}
              variant="contrast"
              size="lg"
              glow={false}
              sweep
              className="w-full ring-1 ring-white/20 sm:w-auto"
            >
              Start Application Now
            </GlowButtonLink>
          </div>

          {/* brand-100 rather than ink-600: the old colour was chosen for a
              near-white panel and is close to unreadable on a dark one. */}
          <p className="mt-4 text-sm leading-relaxed text-brand-100/85">
            This doesn&apos;t submit an application for credit and doesn&apos;t
            affect your credit score.
          </p>
        </div>

        {/* ------------------------------------------------------------------
            BOTH DISCLOSURES NOW SIT BELOW THE CTA.

            They were above it, and the note that used to be here said the
            reason out loud: "the disclosure stays ABOVE the button so nobody
            clicks through without having passed the caveat." That is no longer
            true, and it is the one thing to weigh if this page is ever reviewed
            by counsel. A reader can now reach "Start Application Now" without
            having scrolled past either box.

            What still holds: both are on the same screen as the figures they
            describe, neither is collapsed or behind a link, and the cards
            themselves carry "illustrative range" under every amount — so no
            figure on this page appears unqualified. The word "above" in the
            first line still points the right way, since the figures remain
            above it.

            If a reviewer wants the caveat back in front of the action, the
            cheapest fix is a single line of fine print inside the dark panel,
            under the button — not moving these two boxes back up.
        ------------------------------------------------------------------- */}
        {hasEstimates && (
          <p className="mt-8 rounded-lg border border-warning-600/25 bg-warning-50 p-4 text-sm leading-relaxed text-ink-700">
            <strong className="font-semibold">
              The figures above are for illustrative purposes only.
            </strong>{" "}
            They are modelled from the revenue you reported to show the rough
            shape of what may be available. They are not quotes, not offers, and
            not amounts anyone has agreed to lend. Real figures come from a
            lender after a full review.
          </p>
        )}

        {/* Same p-4, rounded-lg, text-sm and full-container width as the box
            above it — the page's two disclosures read as a pair. */}
        <div className="mt-4">
          <IndicativeDisclosure />
        </div>

        {/* "WHAT HAPPENS NEXT" WAS HERE, AND IS GONE.

            Three numbered steps describing account, documents, specialist. It
            was written when this panel was light and quiet, as reassurance for
            anyone not yet ready to click. Once the CTA became the dark block
            above, the section was working against it: a reader who has decided
            gets a numbered list between them and the end of the page, and a
            reader who has not gets told the commitment is three steps long at
            the moment they are being asked to take the first.

            Nothing load-bearing left with it. Step one is what the button says,
            step two is the whole of the documents screen after signup, and step
            three is already promised in IndicativeDisclosure above — "a
            financing specialist will review your information".

            NO SECOND BUTTON EITHER, for the record. "Talk with a financing
            specialist" used to sit down here, offering a way out of the flow at
            the exact moment the page asks someone to commit. Contact is still
            reachable from the footer; it is just no longer a fork in the road. */}
      </div>
    </Container>
  );
}
