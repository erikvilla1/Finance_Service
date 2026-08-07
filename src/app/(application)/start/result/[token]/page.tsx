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
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { ProductMatch } from "@/lib/qualification/types";

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
    .select("id, reference_code, financing_goal, requested_amount, created_at")
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
  const maxEstimated = potential.reduce<number | null>((acc, m) => {
    if (m.estimatedAmountMax == null) return acc;
    return acc == null ? m.estimatedAmountMax : Math.max(acc, m.estimatedAmountMax);
  }, null);

  const hasEstimates = potential.some((m) => m.estimatedAmountMax != null);

  return (
    <Container>
      <div className="mx-auto max-w-2xl">
        <ProgressBar value={3} max={6} label="Your application" />

        {/* ------------------------------------------------------------------
            Status first. The applicant just handed over their financials and
            the question in their head is "did that work?" — answer it before
            showing them anything to interpret.
        ------------------------------------------------------------------- */}
        <div className="mt-8 rounded-xl border border-success-200 bg-success-50 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="success">Application created</Badge>
            <Badge tone="warning">Pending specialist review</Badge>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Your application form has been created
          </h1>
          <p className="mt-3 leading-relaxed text-ink-700">
            It&apos;s now with a financing specialist for review. You don&apos;t
            need to do anything else right now — we&apos;ll reach out if we need
            more from you.
          </p>
          <p className="mt-4 font-mono text-sm text-ink-600">
            Reference {application.reference_code}
          </p>
        </div>

        {/* ------------------------------------------------------------------
            Summary tiles.
        ------------------------------------------------------------------- */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-ink-900">
            What we found
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card as="div">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Potential matches
              </dt>
              <dd className="mt-2 text-3xl font-bold text-ink-900">
                {potential.length}
              </dd>
            </Card>
            <Card as="div">
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Needs review
              </dt>
              <dd className="mt-2 text-3xl font-bold text-ink-900">
                {review.length}
              </dd>
            </Card>
            {maxEstimated != null && (
              <Card as="div" className="col-span-2 sm:col-span-1">
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                  Illustrative ceiling
                </dt>
                <dd className="mt-2 text-3xl font-bold text-ink-900">
                  {currency.format(maxEstimated)}
                </dd>
              </Card>
            )}
          </dl>
        </section>

        {/* ------------------------------------------------------------------
            The caveat sits ABOVE the figures, not below them. Anyone who reads
            only the numbers should have already read this.
        ------------------------------------------------------------------- */}
        {hasEstimates && (
          <p className="mt-6 rounded-lg border border-warning-200 bg-warning-50 p-4 text-sm leading-relaxed text-ink-700">
            <strong className="font-semibold">
              The figures below are for illustrative purposes only.
            </strong>{" "}
            They are modelled from the revenue you reported to show the rough
            shape of what may be available. They are not quotes, not offers, and
            not amounts anyone has agreed to lend. Real figures come from a
            lender after a full review.
          </p>
        )}

        {potential.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink-900">
              Potential matches
            </h2>
            <ul className="mt-4 space-y-3">
              {potential.map((match) => {
                const range = formatRange(
                  match.estimatedAmountMin,
                  match.estimatedAmountMax,
                );
                return (
                  <Card as="li" key={match.productSlug}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-ink-900">
                        {match.productName}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {match.alignsWithGoal && (
                          <Badge tone="brand">Matches your goal</Badge>
                        )}
                        <Badge tone="success">Potential match</Badge>
                      </div>
                    </div>

                    {range && (
                      <p className="mt-3 font-mono text-xl font-bold text-ink-900">
                        {range}{" "}
                        <span className="font-sans text-xs font-normal text-ink-500">
                          illustrative range
                        </span>
                      </p>
                    )}

                    {match.reasons.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {match.reasons.map((reason) => (
                          <li key={reason} className="text-sm text-ink-600">
                            {reason}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                );
              })}
            </ul>
          </section>
        )}

        {review.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink-900">
              Requires specialist review
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              These may be options for your situation, but they need a person to
              look at the details before we can say more.
            </p>
            <ul className="mt-4 space-y-3">
              {review.slice(0, 6).map((match) => (
                <Card as="li" key={match.productSlug}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-ink-900">
                      {match.productName}
                    </h3>
                    <Badge tone="warning">Needs review</Badge>
                  </div>
                </Card>
              ))}
            </ul>
          </section>
        )}

        {/* ------------------------------------------------------------------
            Products that didn't qualify, WITH the reason.
            "A denial is not a forever no" (BUSINESS_CONTEXT §2) — telling
            someone they were 20 points short is what brings them back.
        ------------------------------------------------------------------- */}
        {notEligible.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink-900">
              Not available right now
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Based on what you told us, these look out of reach today. That can
              change — circumstances move, and so do lender programs.
            </p>
            <ul className="mt-4 space-y-3">
              {notEligible.map((match) => (
                <Card as="li" key={match.productSlug} className="opacity-75">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-ink-700">
                      {match.productName}
                    </h3>
                    <Badge tone="neutral">Not available</Badge>
                  </div>
                  {match.blockers.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {match.blockers.map((blocker) => (
                        <li key={blocker} className="text-sm text-ink-600">
                          {blocker}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ))}
            </ul>
          </section>
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

        <div className="mt-8">
          <IndicativeDisclosure />
        </div>

        <div className="mt-8 border-t border-ink-200 pt-8">
          <h2 className="text-lg font-semibold text-ink-900">What happens next</h2>
          <ol className="mt-4 space-y-3">
            {[
              "A financing specialist reviews what you've submitted.",
              "We'll reach out if we need anything further to move forward.",
              "If a program looks like a fit, we'll walk you through the next steps.",
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

          <div className="mt-6">
            <ButtonLink href="/contact" variant="secondary">
              Talk with a financing specialist
            </ButtonLink>
          </div>
        </div>
      </div>
    </Container>
  );
}
