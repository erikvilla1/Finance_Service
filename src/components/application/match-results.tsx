import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Boxes,
  Building,
  Building2,
  Check,
  ClipboardList,
  Construction,
  FileText,
  Hammer,
  House,
  KeyRound,
  Landmark,
  LockKeyhole,
  Milestone,
  Package,
  PiggyBank,
  Receipt,
  Repeat,
  Rocket,
  Scale,
  ShieldCheck,
  Sprout,
  Stethoscope,
  TrendingUp,
  Truck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { Confetti } from "@/components/ui/confetti";
import { CountUpAmount } from "@/components/marketing/count-up";
import { GlowButtonLink } from "@/components/ui/glow-button-link";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { MatchCarousel } from "@/components/application/match-carousel";
import {
  FINAL_STRUCTURE_NOTE,
  MATCH_STATE_LABEL,
  NO_CURRENT_MATCH_COPY,
  RESULTS_DISCLAIMER,
} from "@/lib/matching/copy";
import { FAMILY_COPY } from "@/lib/matching/families";
import type {
  MatchState,
  ObjectiveId,
  ProductFamily,
  ProductMatch,
} from "@/lib/matching/types";

/**
 * The result page for applications scored by the spec v1.1 engine — the page
 * whose job is to turn a finished prequal into an account.
 *
 * ONE SCREEN, THE VIDEO AS THE BACKGROUND. The drone footage fills the window
 * edge to edge, fixed, with no card around it, and the page doesn't scroll:
 * headline, what was compared, what they told us and the options on the left,
 * the next step on the right, the small print along the bottom. Options that
 * don't fit the row slide in and out of it (MatchCarousel) rather than
 * pushing the page longer. On short screens type and spacing tighten; on a
 * phone the next-step card collapses to its button and one line of
 * reassurance. If a screen is too small even for that (a phone on its side),
 * the content layer scrolls over the still video as a fallback, so nothing is
 * ever cut off unreachable.
 *
 * WHAT BUILDS THE MOMENT, HONESTLY. The headline is specific (how many
 * options, for which goal), the line under it says how much was compared —
 * real counts from this applicant's evaluation, never lender names — and the
 * chips repeat back what they told us, so the result visibly came from their
 * answers. Every claim beside the button is true of the product: signing up
 * is a name, email and password; the account takes over this prequal
 * (claimApplication); nothing pulls credit; the privacy policy says
 * information is never sold.
 *
 * COMPLIANCE COPY (spec §9, §18). Preliminary-matching language throughout;
 * the spec's top-of-results sentence and the flow footer's disclosure (hidden
 * on this page, which has no footer) are in the small print; "May not fit
 * based on the information provided" heads the options that don't fit; a
 * dollar range only shows when a documented sizing formula produced one.
 */

/** "3 financing options may fit your ___". */
const GOAL_NOUN: Record<ObjectiveId, string> = {
  working_capital: "business",
  equipment: "equipment purchase",
  commercial_real_estate: "property",
  investment_real_estate: "project",
  business_acquisition: "acquisition",
  accounts_receivable: "receivables",
  debt_refinance: "refinance",
  startup: "new business",
  unsure: "business",
};

const FAMILY_ICON: Record<ProductFamily, LucideIcon> = {
  term_loan: Banknote,
  line_of_credit: Repeat,
  unsecured_term_loan: UserCheck,
  revenue_based: TrendingUp,
  sba_loan: Landmark,
  asset_based: Boxes,
  inventory_financing: Package,
  equipment_financing: Truck,
  owner_user_cre: Building2,
  investment_cre: Building,
  commercial_mortgage: Building2,
  bridge_loan: Milestone,
  fix_and_flip: Hammer,
  ground_up_construction: Construction,
  rental_dscr: KeyRound,
  multifamily: Building,
  invoice_factoring: FileText,
  ar_line: Receipt,
  medical_receivables: Stethoscope,
  po_financing: ClipboardList,
  debt_refinance: ArrowLeftRight,
  debt_restructuring: Scale,
  startup_credit_line: Rocket,
  startup_term_loan: Sprout,
  retirement_rollover: PiggyBank,
  securities_based: BarChart3,
  heloc: House,
};

/** The heading over the options row, from the best state in it. */
const GROUPS: { state: MatchState; heading: string; body: string }[] = [
  {
    state: "strong",
    heading: "Strong matches",
    body: "Your answers meet the preliminary criteria for these options.",
  },
  {
    state: "potential",
    heading: "Potential matches",
    body: "These appear to fit, with one or more details a specialist will confirm.",
  },
  {
    state: "specialist_review",
    heading: "Worth a specialist's review",
    body: "An option may exist here, but it depends on details a person should look at directly.",
  },
];

// Short enough for one line in the next-step card beside its arrow.
const CTA_LABEL: Record<MatchState, string> = {
  strong: "Start Application Now",
  potential: "Start Application Now",
  specialist_review: "Start Application Now",
  no_current_match: "Request a Review",
};

const NEXT_STEPS = [
  {
    title: "Create your account",
    body: "Name, email and a password. Your answers come with you.",
  },
  {
    title: "Share a few documents",
    body: "Upload them securely from your dashboard, which lists exactly what's needed.",
  },
  {
    title: "A specialist reviews your file",
    body: "They'll reach out with next steps before any terms are offered.",
  },
];

const REASSURANCES = [
  { icon: ShieldCheck, text: "No impact to your credit score" },
  { icon: Check, text: "Not an application for credit, and no obligation" },
  { icon: LockKeyhole, text: "We never sell your information" },
];

export interface ProfileChip {
  label: string;
  value: string;
}

/** The flow footer's disclosure, carried here because this page hides it. */
const FOOTER_DISCLOSURE =
  "Nothing on this site is a commitment to fund or an offer of credit. All financing is subject to qualification, lender review, and program availability.";

/*
 * [@media(max-height:820px)] below tightens type and spacing on laptop-height
 * screens so everything still fits one screen. Written out in full each time,
 * not held in a variable: Tailwind only generates classes it can read whole
 * in the source.
 */

export function MatchResults({
  token,
  objectiveId,
  objectiveLabel,
  overallState,
  matches,
  programsCompared,
  fundingSources,
  profile,
}: {
  token: string;
  objectiveId: ObjectiveId;
  objectiveLabel: string;
  overallState: MatchState;
  matches: ProductMatch[];
  /** Programs this applicant was evaluated against (internal routes). */
  programsCompared: number;
  /** Distinct funding sources among them. Counted, never named. */
  fundingSources: number;
  /** What they told us, repeated back. */
  profile: ProfileChip[];
}) {
  const ctaHref = `/create-account?application=${token}`;
  const ctaLabel = CTA_LABEL[overallState];
  const celebrate = overallState === "strong" || overallState === "potential";
  const shown = matches.filter((m) => m.state !== "no_current_match");
  const fits = shown.filter((m) => m.state === "strong" || m.state === "potential");
  const review = shown.filter((m) => m.state === "specialist_review");
  const mayNotFit = matches.filter((m) => m.state === "no_current_match");
  const hasRanges = shown.some((m) => m.estimatedRange);
  const noun = GOAL_NOUN[objectiveId];

  // Counts every card the page shows, Specialist Review included: it counted
  // only Strong and Potential, which put "1 financing option" over two cards.
  // A review card is still something that may fit, and its badge says which
  // kind it is. Only when nothing is Strong or Potential does the headline
  // switch to the review wording.
  const headline =
    fits.length > 0
      ? `${shown.length} financing option${shown.length === 1 ? "" : "s"} may fit your ${noun}`
      : review.length > 0
        ? `${review.length} option${review.length === 1 ? "" : "s"} worth a specialist's review`
        : "Let's look at your options together";

  // One row, so one heading: the spec's group name when every option shares
  // a state, otherwise a plain one (each card carries its own state badge).
  const states = new Set(shown.map((m) => m.state));
  const group = states.size === 1 ? GROUPS.find((g) => states.has(g.state)) : null;
  const rowHeading = group?.heading ?? "Your matches";
  const rowBody = group?.body ?? "Each option shows how closely it fits what you told us.";

  const smallPrint = [
    overallState !== "no_current_match" ? RESULTS_DISCLAIMER : null,
    shown.length > 0 ? FINAL_STRUCTURE_NOTE : null,
    hasRanges
      ? "Estimated ranges come from a funding source's published sizing guidelines applied to the figures you entered; they are not quotes, offers, or amounts anyone has agreed to fund."
      : null,
    FOOTER_DISCLOSURE,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {celebrate && <Confetti />}

      {/* ------------------------------------------------------------------
          The whole window. Fixed, under the layout's header (z-40) and its
          light logo (data-dark-hero switches the logo and locks page scroll;
          see globals.css), over the flow's gradient.
      ------------------------------------------------------------------- */}
      {/* Transparent: the footage is the layout's (FlowVideo), which keeps
          playing into account creation. This layer is its overlay and the
          content over it. */}
      <div data-dark-hero="" className="fixed inset-0 z-10">
        {/* THE LIFT. The page arrives dark (the two gradients at full
            strength) and fades over about three seconds to the footage at
            its normal brightness; account creation then does the reverse.
            What stays is a soft shadow along the left, where the white type
            and glass cards sit, and along the bottom under the small print,
            so they read over the bright sky in the shot. See .scrim-lift and
            .scrim-settle in globals.css; reduced motion lands on the
            finished state. */}
        <div
          aria-hidden="true"
          className="scrim-settle absolute inset-0 bg-gradient-to-r from-brand-950/55 via-brand-950/20 to-transparent"
        />
        <div
          aria-hidden="true"
          className="scrim-settle absolute inset-0 bg-gradient-to-t from-brand-950/45 via-transparent to-transparent"
        />
        <div aria-hidden="true" className="scrim-lift absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-950/90 via-brand-950/65 to-brand-950/35" />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-950/55 via-transparent to-brand-950/70" />
        </div>

        <div className="absolute inset-0 overflow-y-auto overscroll-contain">
          <div
            className={`mx-auto flex min-h-full max-w-6xl flex-col px-5 pb-4 pt-[5.5rem] sm:px-10 sm:pb-6 sm:pt-28 [@media(max-height:820px)]:sm:pt-24`}
          >
            {/* No progress bar here: the questionnaire completes it to
                "3 of 3" on submit, before the loading state that leads here
                (PrequalStage), so this page opens on the result itself. */}
            <div
              className={`animate-fade-in-up grid flex-1 content-center gap-8 py-2 [animation-delay:120ms] lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end lg:gap-12 xl:grid-cols-[minmax(0,1fr)_21rem]`}
            >
              {/* -------------------------------------------------------------
                  Left: the result
              -------------------------------------------------------------- */}
              {/* text-shadow inherits, so one here keeps every white line in
                  this column legible once the footage brightens. */}
              <div className="min-w-0 text-white [text-shadow:0_1px_14px_rgb(0_0_0/0.4)]">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.18] px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/30 backdrop-blur-md">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-success-600">
                      <Check aria-hidden="true" className="h-2.5 w-2.5" strokeWidth={3.5} />
                    </span>
                    Prequalification complete
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    {objectiveLabel}
                  </span>
                </div>

                <h1
                  className={`mt-3 max-w-2xl text-[1.625rem] font-bold leading-tight tracking-tight text-white sm:mt-5 sm:text-5xl [@media(max-height:820px)]:sm:text-4xl`}
                >
                  {headline}
                </h1>

                {programsCompared > 0 && (
                  <p className={`mt-3 max-w-2xl leading-relaxed text-white/80 sm:text-lg [@media(max-height:820px)]:sm:text-base`}>
                    We checked your answers against{" "}
                    <strong className="font-semibold text-white">
                      {programsCompared} financing program{programsCompared === 1 ? "" : "s"}
                    </strong>{" "}
                    from{" "}
                    <strong className="font-semibold text-white">
                      {fundingSources} lender{fundingSources === 1 ? "" : "s"}
                    </strong>{" "}
                    we work with.
                  </p>
                )}
                {overallState === "no_current_match" && (
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
                    {NO_CURRENT_MATCH_COPY}
                  </p>
                )}

                {/* One row on a phone, swiped sideways, so it costs one line
                    of height; wraps where there's room. */}
                {profile.length > 0 && (
                  <ul
                    aria-label="Based on what you told us"
                    className={`no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:mt-5 sm:flex-wrap sm:overflow-visible sm:px-0 [@media(max-height:820px)]:sm:mt-4`}
                  >
                    {profile.map((chip) => (
                      <li
                        key={chip.label}
                        className="shrink-0 rounded-full bg-white/[0.18] px-3 py-1 text-xs text-white ring-1 ring-inset ring-white/25 backdrop-blur-md sm:text-sm"
                      >
                        <span className="text-white/60">{chip.label}</span> {chip.value}
                      </li>
                    ))}
                  </ul>
                )}

                {/* The option cards end the column: the arrows sit in the
                    heading row (MatchCarousel) and "may not fit" below the
                    grid, so with the grid bottom-aligned the next-step card's
                    bottom edge lines up with the cards'. */}
                {shown.length > 0 && (
                  <section className={`mt-5 sm:mt-8 [@media(max-height:820px)]:sm:mt-6`}>
                    <MatchCarousel
                      label={rowHeading}
                      header={
                        <>
                          <h2 className="text-base font-semibold text-white">{rowHeading}</h2>
                          <p className="mt-0.5 hidden text-sm text-white/65 sm:block">{rowBody}</p>
                        </>
                      }
                    >
                      {shown.map((match) => (
                        <MatchCard key={match.productFamily} match={match} />
                      ))}
                    </MatchCarousel>
                  </section>
                )}



                {/* Phone: the next-step card would push past one screen, so
                    it collapses to the button and one line. */}
                <div className="mt-4 lg:hidden">
                  <GlowButtonLink
                    href={ctaHref}
                    variant="inverted"
                    size="lg"
                    glow={false}
                    sweep
                    className="w-full sm:w-auto"
                  >
                    {ctaLabel}
                  </GlowButtonLink>
                  <p className="mt-2 text-xs text-white/70">
                    About a minute to sign up · Your answers carry over · No credit impact
                  </p>
                </div>
              </div>

              {/* -------------------------------------------------------------
                  Right: the next step. Solid white, the one opaque thing on
                  the screen, so it's where the eye lands after the headline.
              -------------------------------------------------------------- */}
              {/* mb-1 matches the card row's pb-1 (room for the cards' rings),
                  so with the grid bottom-aligned this card's bottom edge is
                  flush with the option cards'. */}
              <aside className="hidden lg:mb-1 lg:block">
                <div className={`rounded-2xl bg-white p-6 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.55)] ring-1 ring-black/5 [@media(max-height:820px)]:p-5`}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent-800">
                    Your next step
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-ink-900">
                    {overallState === "no_current_match"
                      ? "Have a specialist take a look"
                      : "Continue to your application"}
                  </h2>

                  <ol className={`mt-5 space-y-4 [@media(max-height:820px)]:mt-4 [@media(max-height:820px)]:space-y-3`}>
                    {NEXT_STEPS.map((step, i) => (
                      <li key={step.title} className="relative flex gap-3">
                        {i < NEXT_STEPS.length - 1 && (
                          <span
                            aria-hidden="true"
                            className="absolute left-[0.8125rem] top-8 h-[calc(100%-1.25rem)] w-px bg-ink-200"
                          />
                        )}
                        <span className="grid h-[1.625rem] w-[1.625rem] shrink-0 place-items-center rounded-full bg-brand-900 text-xs font-semibold text-white tabular-nums">
                          {i + 1}
                        </span>
                        <div className="min-w-0 pb-0.5">
                          <p className="text-sm font-semibold text-ink-900">{step.title}</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-ink-600">{step.body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  <GlowButtonLink
                    href={ctaHref}
                    variant="contrast"
                    size="lg"
                    glow={false}
                    sweep
                    className={`mt-6 w-full [@media(max-height:820px)]:mt-5`}
                  >
                    {ctaLabel}
                  </GlowButtonLink>

                  <ul className="mt-4 space-y-1.5">
                    {REASSURANCES.map(({ icon: Icon, text }) => (
                      <li key={text} className="flex items-center gap-2 text-xs text-ink-600">
                        <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-success-700" strokeWidth={2.5} />
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>

            {/* Spec §9 wants the goal's obvious product shown as considered,
                under this wording. Below the grid rather than under the
                option cards, so the cards stay the column's last edge. */}
            {mayNotFit.length > 0 && (
              <p className="mt-4 line-clamp-2 max-w-2xl text-xs leading-relaxed text-white/65 [text-shadow:0_1px_14px_rgb(0_0_0/0.4)] sm:text-sm">
                <span className="font-semibold text-white/85">
                  May not fit based on the information provided:
                </span>{" "}
                {mayNotFit.map((m) => FAMILY_COPY[m.productFamily].label).join(", ")}. A
                specialist can still take a look.
              </p>
            )}

            <p className="mt-3 max-w-5xl text-[10px] leading-snug text-white/50 sm:mt-4 sm:text-[11px]">
              {smallPrint}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * A match as a pane of glass over the footage, one slide of the row. Frosted
 * white rather than clear: once the footage brightens, clear glass all but
 * disappeared into the sky behind it. The chips and badge above use the same
 * frost so the page's glass reads as one material.
 */
function MatchCard({ match }: { match: ProductMatch }) {
  const copy = FAMILY_COPY[match.productFamily];
  const Icon = FAMILY_ICON[match.productFamily] ?? Banknote;
  const stateClass =
    match.state === "strong"
      ? "bg-success-600 text-white"
      : match.state === "specialist_review"
        ? "bg-accent-300/25 text-accent-100 ring-1 ring-inset ring-accent-300/40"
        : "bg-white/15 text-white ring-1 ring-inset ring-white/25";
  return (
    <li className="w-[85%] shrink-0 snap-start sm:w-[calc(50%-0.5rem)]">
      <LiquidGlassCard
        className="h-full bg-white/[0.18] p-4 text-white ring-1 ring-inset ring-white/30 transition-colors duration-300 hover:bg-white/[0.24] sm:p-5"
        borderRadius="1rem"
        blurIntensity="md"
        edgeIntensity="xs"
        glowIntensity="none"
      >
        <div className="flex items-start justify-between gap-3">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-inset ring-white/15 sm:h-10 sm:w-10"
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="flex flex-wrap justify-end gap-1.5">
            {!match.primary && (
              <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/80">
                Related option
              </span>
            )}
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${stateClass}`}>
              {MATCH_STATE_LABEL[match.state]}
            </span>
          </div>
        </div>
        <h3 className="mt-3 text-base font-semibold text-white sm:mt-4">{copy.label}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-white/75">{copy.description}</p>

        {match.estimatedRange && (
          <div className="mt-3">
            <p className="font-mono text-lg font-bold text-white">
              <CountUpAmount min={match.estimatedRange.min} max={match.estimatedRange.max} />
            </p>
            <p className="text-xs text-white/60">estimated range</p>
          </div>
        )}
      </LiquidGlassCard>
    </li>
  );
}
