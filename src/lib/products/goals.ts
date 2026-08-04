import type { ProductTrack } from "@/types/database";

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

export const FINANCING_GOALS: FinancingGoal[] = [
  {
    slug: "finance-equipment",
    label: "Finance Equipment",
    description:
      "Acquire construction equipment, specialty vehicles, or business assets.",
    likelyTrack: "equipment",
    categorySlug: "equipment-asset-financing",
  },
  {
    slug: "grow-my-business",
    label: "Grow My Business",
    description: "Fund expansion, hiring, new locations, or larger contracts.",
    likelyTrack: "working_capital",
    categorySlug: "business-cash-flow",
  },
  {
    slug: "access-working-capital",
    label: "Access Working Capital",
    description: "Cover operations, payroll, or inventory while revenue catches up.",
    likelyTrack: "working_capital",
    categorySlug: "business-cash-flow",
  },
  {
    slug: "buy-or-refinance-real-estate",
    label: "Buy or Refinance Real Estate",
    description: "Purchase, refinance, or take cash out of commercial property.",
    likelyTrack: "cre",
    categorySlug: "real-estate",
  },
  {
    slug: "fund-a-fix-and-flip",
    label: "Fund a Fix & Flip",
    description: "Finance the purchase and rehabilitation of an investment property.",
    likelyTrack: "cre",
    categorySlug: "real-estate",
  },
  {
    slug: "acquire-a-business",
    label: "Acquire a Business",
    description: "Finance an acquisition or buy out a partner.",
    likelyTrack: "sba",
    categorySlug: "specialized-financing",
  },
  {
    slug: "finance-a-medical-practice",
    label: "Finance a Medical Practice",
    description: "Working capital and financing for medical and healthcare practices.",
    likelyTrack: "healthcare",
    categorySlug: "specialized-financing",
  },
  {
    slug: "get-paid-faster",
    label: "Get Paid Faster",
    description:
      "Access cash tied up in outstanding invoices while you wait on customers.",
    likelyTrack: "ar_factoring",
    categorySlug: "business-cash-flow",
  },
  {
    slug: "not-sure",
    label: "I'm Not Sure — Help Me Find an Option",
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
