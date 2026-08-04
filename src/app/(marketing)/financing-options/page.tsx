import type { Metadata } from "next";
import {
  ButtonLink,
  Card,
  Container,
  EmptyState,
  Section,
  SectionHeading,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Financing Options",
  description:
    "Explore financing options organized around what you're trying to accomplish.",
};

/**
 * Financing options index.
 *
 * Reads the catalog from the database rather than a hard-coded list, per
 * platform spec §39 ("use database-driven product configuration").
 *
 * Only published products are returned — RLS enforces that for anonymous
 * visitors, and the published_products_must_be_verified constraint guarantees
 * a published product has confirmed terms. Right now nothing is published, so
 * this page renders its empty state. That is the correct behaviour, not a bug:
 * publishing before verification is exactly what spec §5 forbids.
 */
export default async function FinancingOptionsPage() {
  const supabase = await createClient();

  const { data: categories, error } = await supabase
    .from("product_categories")
    .select("id, slug, name, headline, description, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  const { data: products } = await supabase
    .from("financing_products")
    .select("id, slug, name, headline, summary, category_id, sort_order")
    .eq("is_published", true)
    .order("sort_order");

  const byCategory = new Map<string, typeof products>();
  for (const product of products ?? []) {
    const list = byCategory.get(product.category_id) ?? [];
    list.push(product);
    byCategory.set(product.category_id, list);
  }

  return (
    <>
      <div className="border-b border-ink-200 bg-ink-50">
        <Container>
          <div className="py-16 sm:py-20">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              Financing Options
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
              Organized around what you&apos;re trying to accomplish, not around
              lending jargon. If you&apos;re not sure where you fit, start with
              your goal and we&apos;ll help you narrow it down.
            </p>
            <div className="mt-8">
              <ButtonLink href="/start" size="lg">
                See My Financing Options
              </ButtonLink>
            </div>
          </div>
        </Container>
      </div>

      <Section>
        <Container>
          {error && (
            <EmptyState
              title="Financing options are temporarily unavailable"
              description="Please try again shortly, or speak with a financing specialist."
              action={
                <ButtonLink href="/contact" variant="secondary">
                  Talk With a Financing Specialist
                </ButtonLink>
              }
            />
          )}

          {!error && (products?.length ?? 0) === 0 && (
            <EmptyState
              title="Program details are being finalized"
              description="Our financing programs are being reviewed and confirmed before publication. In the meantime, tell us what you're trying to accomplish and a specialist will walk you through the options that may fit."
              action={
                <ButtonLink href="/start">See My Financing Options</ButtonLink>
              }
            />
          )}

          {!error && (products?.length ?? 0) > 0 && (
            <div className="space-y-16">
              {(categories ?? []).map((category) => {
                const items = byCategory.get(category.id) ?? [];
                if (items.length === 0) return null;

                return (
                  <div key={category.id}>
                    <SectionHeading
                      title={category.name}
                      description={category.description ?? undefined}
                    />
                    <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((product) => (
                        <Card as="li" key={product.id}>
                          <h3 className="text-base font-semibold text-ink-900">
                            {product.name}
                          </h3>
                          {product.summary && (
                            <p className="mt-2 text-sm leading-relaxed text-ink-600">
                              {product.summary}
                            </p>
                          )}
                          <ButtonLink
                            href={`/start?product=${product.slug}`}
                            variant="ghost"
                            size="sm"
                            className="mt-4 -ml-3"
                          >
                            Explore this option →
                          </ButtonLink>
                        </Card>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
