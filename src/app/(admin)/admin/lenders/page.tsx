import type { Metadata } from "next";
import { Badge, Button, Card, Container, EmptyState, Input, Textarea } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, humanize } from "@/lib/crm";
import type { LenderRow } from "@/types/database";
import { addLender } from "@/app/(admin)/admin/applications/[id]/submission-actions";

export const metadata: Metadata = {
  title: "Lenders",
  robots: { index: false, follow: false },
};

/**
 * Robert's funding sources.
 *
 * BUSINESS_CONTEXT §2 puts the number at 115+, and until now none of them
 * existed anywhere in the platform. This is the book: who they are, what they
 * write, and what he knows about their appetite.
 *
 * Deliberately thin. The valuable column here is `notes` — "won't touch
 * restaurants", "fast on equipment under 100k", "needs six months of
 * statements". No schema can anticipate that and no rule can match on it, so
 * the page gets out of its way and shows it.
 *
 * Staff-only by construction: the table has no customer policy at all, so an
 * applicant reaching this URL gets an empty list rather than a filtered one.
 */
export default async function LendersPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("lenders")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  const lenders = (data ?? []) as LenderRow[];

  return (
    <Container>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink-900 dark:text-ink-100">
            Lenders
          </h1>
          <p className="mt-1 text-ink-600 dark:text-ink-400">
            {lenders.length === 0
              ? "No funding sources recorded yet"
              : `${lenders.length} funding source${lenders.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {lenders.length === 0 ? (
            <EmptyState
              title="No lenders yet"
              description="Add the funding sources you send packages to. Once they're here, each application can record which ones it went to and what came back."
            />
          ) : (
            lenders.map((lender) => (
              <Card key={lender.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">
                      {lender.name}
                    </h2>
                    <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-400">
                      {[
                        lender.contact_name,
                        lender.contact_email,
                        lender.contact_phone,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No contact recorded"}
                    </p>
                  </div>
                  {!lender.is_active && <Badge tone="neutral">Inactive</Badge>}
                </div>

                <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-600 dark:text-ink-400">
                  <div className="flex gap-1.5">
                    <dt className="text-ink-400">Tracks</dt>
                    <dd>
                      {lender.tracks.length > 0
                        ? lender.tracks.map(humanize).join(", ")
                        : "any"}
                    </dd>
                  </div>
                  {(lender.amount_min || lender.amount_max) && (
                    <div className="flex gap-1.5">
                      <dt className="text-ink-400">Range</dt>
                      <dd>
                        {formatCurrency(lender.amount_min)} –{" "}
                        {formatCurrency(lender.amount_max)}
                      </dd>
                    </div>
                  )}
                  {lender.min_fico && (
                    <div className="flex gap-1.5">
                      <dt className="text-ink-400">Min FICO</dt>
                      <dd>{lender.min_fico}</dd>
                    </div>
                  )}
                </dl>

                {/*
                  The most valuable field on the page, and the reason this table
                  is worth having at all. Everything above can be guessed from a
                  rate sheet; this is what Robert knows.
                */}
                {lender.notes && (
                  <p className="mt-3 rounded-lg bg-ink-50 p-3 text-sm leading-relaxed text-ink-700 dark:bg-brand-800 dark:text-ink-300">
                    {lender.notes}
                  </p>
                )}
              </Card>
            ))
          )}
        </div>

        <div>
          <Card>
            <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">
              Add a lender
            </h2>
            <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
              Name is all that&apos;s required. The rest can come later — an
              incomplete lender you can send to beats a complete one you
              haven&apos;t added.
            </p>

            <form action={addLender} className="mt-4 space-y-3">
              <Input name="name" required placeholder="Lender name" aria-label="Lender name" />
              <Input name="contactName" placeholder="Contact name" aria-label="Contact name" />
              <Input
                name="contactEmail"
                type="email"
                placeholder="Contact email"
                aria-label="Contact email"
              />
              <Textarea
                name="notes"
                rows={4}
                placeholder="What do they like? What won't they touch? How fast are they?"
              />
              <Button type="submit">Add lender</Button>
            </form>
          </Card>
        </div>
      </div>
    </Container>
  );
}
