import type { ProductTrack } from "@/types/database";
import { RESOURCE_GUIDES } from "@/lib/resource-guides/data";

/**
 * Goal-based entry points.
 *
 * Platform spec §7: the homepage asks "What are you looking to accomplish?"
 * because the customer should not have to know the correct loan terminology
 * before asking for help (spec §2).
 *
 * Each goal maps to a likely underwriting track, which seeds the application
 * flow. The mapping is a starting hypothesis, not a decision — the questions
 * that follow can move the applicant to a different track.
 *
 * DERIVED FROM RESOURCE_GUIDES, NOT A SEPARATE LIST. This used to be nine
 * broad, differently-worded goals ("Grow My Business", "Get Paid Faster")
 * that only loosely lined up with the eleven financing-guide categories —
 * someone reading the Equipment Financing guide and clicking "Get Your Free
 * Quote" landed back on a goal-picker asking them to describe what they
 * wanted in different words. Building this list FROM the guides, slug for
 * slug, means the two cannot drift apart again, and it's what lets a guide
 * page link straight to `/start?goal=<its own slug>` and skip the picker
 * entirely — see the CTA in resources/[slug]/page.tsx.
 *
 * ONE GOAL DROPPED IN THE MERGE: "Finance a Medical Practice" (healthcare
 * track) had no corresponding guide among the eleven and so has no slug to
 * derive from. Healthcare is still a valid track in the schema; it's just no
 * longer reachable from this picker. If that path still needs a front door,
 * it needs its own guide first — this list is a projection of that array,
 * not an independent one to patch around it.
 *
 * "OTHER" IS THE ONE DELIBERATE EXCEPTION TO "DERIVED, NOT MAINTAINED" ABOVE.
 * It doesn't correspond to any guide — that's the point of a catch-all for a
 * genuinely undecided visitor — so it's appended by hand below rather than
 * produced by the RESOURCE_GUIDES.map(). Its `likelyTrack` stays null on
 * purpose: null routes to the broad intake instead of seeding a guess the
 * visitor never made.
 */
export interface FinancingGoal {
  slug: string;
  label: string;
  description: string;
  /** Likely track. null = genuinely unknown, route to the broad intake. */
  likelyTrack: ProductTrack | null;
  /** Category slug used to pre-filter product suggestions. */
  categorySlug: string | null;
}

/**
 * The mapping a guide's slug alone can't supply. Title and description come
 * straight off the guide; only the underwriting track and product-category
 * bucket need spelling out per category.
 */
const GOAL_ROUTING: Record<string, { likelyTrack: ProductTrack; categorySlug: string }> = {
  "equipment-financing": { likelyTrack: "equipment", categorySlug: "equipment-asset-financing" },
  "sba-financing": { likelyTrack: "sba", categorySlug: "specialized-financing" },
  "commercial-real-estate-financing": { likelyTrack: "cre", categorySlug: "real-estate" },
  "fix-and-flip-financing": { likelyTrack: "cre", categorySlug: "real-estate" },
  "ground-up-construction-financing": { likelyTrack: "cre", categorySlug: "real-estate" },
  "working-capital-financing": { likelyTrack: "working_capital", categorySlug: "business-cash-flow" },
  "business-term-loans-and-lines-of-credit": { likelyTrack: "working_capital", categorySlug: "business-cash-flow" },
  "invoice-factoring-and-ar-financing": { likelyTrack: "ar_factoring", categorySlug: "business-cash-flow" },
  "business-acquisition-financing": { likelyTrack: "sba", categorySlug: "specialized-financing" },
  "startup-financing": { likelyTrack: "unsecured", categorySlug: "specialized-financing" },
  "business-debt-refinance-and-mca-restructuring": { likelyTrack: "working_capital", categorySlug: "business-cash-flow" },
};

export const FINANCING_GOALS: FinancingGoal[] = [
  ...RESOURCE_GUIDES.map((guide) => ({
    slug: guide.slug,
    label: guide.title,
    description: guide.dek,
    likelyTrack: GOAL_ROUTING[guide.slug]?.likelyTrack ?? null,
    categorySlug: GOAL_ROUTING[guide.slug]?.categorySlug ?? null,
  })),
  {
    slug: "other",
    label: "Other",
    description:
      "Tell us what you're trying to accomplish and we'll help you narrow it down.",
    likelyTrack: null,
    categorySlug: null,
  },
];

export function findGoal(slug: string | null | undefined) {
  if (!slug) return null;
  return FINANCING_GOALS.find((goal) => goal.slug === slug) ?? null;
}
