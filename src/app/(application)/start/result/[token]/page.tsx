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
 * Looked up by public_token, not reference_code. Reference codes are sequential
 * and would let anyone walk the whole table (see migration 0009).
 *
 * Reads on the service role because the applicant is anonymous. Only the single
 * token-matched row is fetched, and nothing sensitive is on this page.
 */
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
    .select("id, reference_code, financing_goal, requested_amount")
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

  return (
    <Container>
      <div className="mx-auto max-w-2xl">
        <ProgressBar value={3} max={6} label="Your application" />

        <div className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Here&apos;s what may fit your situation
          </h1>
          <p className="mt-4 leading-relaxed text-ink-600">
            Based on what you&apos;ve told us, we&apos;ve identified financing
            paths that may be relevant. A financing specialist will review your
            information and follow up.
          </p>
          <p className="mt-3 font-mono text-sm text-ink-500">
            Reference {application.reference_code}
          </p>
        </div>

        {potential.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink-900">
              Potential matches
            </h2>
            <ul className="mt-4 space-y-3">
              {potential.map((match) => (
                <Card as="li" key={match.productSlug}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-ink-900">
                      {match.productName}
                    </h3>
                    <Badge tone="success">Potential match</Badge>
                  </div>
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
              ))}
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
