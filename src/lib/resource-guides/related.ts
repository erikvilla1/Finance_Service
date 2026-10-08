import { RESOURCE_GUIDES, type ResourceGuide } from "./data";

/**
 * Which guides are offered at the foot of another guide.
 *
 * SOURCE. The client's Sept 29 front-end review, which listed these as pairs:
 * Acquisition<->SBA, SBA<->CRE, Fix&Flip<->Ground-Up, Factoring<->Working
 * Capital, Working Capital<->Term Loans/LOC, Debt Refinance<->Term
 * Loans/Working Capital, Startup<->Equipment/Term Loans.
 *
 * STORED AS UNORDERED PAIRS, NOT AS A PER-GUIDE LIST. The client wrote every
 * relation with a two-way arrow, so each one has to appear on both guides. A
 * per-guide list would store that twice and let the halves drift — someone
 * adds "equipment" to startup's list, forgets startup on equipment's, and the
 * relation silently becomes one-way with nothing to catch it. Here each
 * relation exists once and both directions are derived, so they cannot
 * disagree. related.test.ts holds that property.
 *
 * ONE CONSEQUENCE WORTH KNOWING, because it looks like a mistake and is not:
 * deriving symmetry means the Equipment guide offers Startup. The client wrote
 * that relation from the startup reader's side ("Startup<->Equipment"), where
 * it is the obvious suggestion; from the equipment reader's side it is a
 * weaker one. It is kept because the arrow was two-way and because a guide
 * with no suggestions at all is worse than one with a loose suggestion. If
 * Robert wants it one-way, that is a direction field on the pair, not a second
 * list.
 */
const RELATED_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["business-acquisition-financing", "sba-financing"],
  ["sba-financing", "commercial-real-estate-financing"],
  ["fix-and-flip-financing", "ground-up-construction-financing"],
  ["invoice-factoring-and-ar-financing", "working-capital-financing"],
  ["working-capital-financing", "business-term-loans-and-lines-of-credit"],
  ["business-debt-refinance-and-mca-restructuring", "business-term-loans-and-lines-of-credit"],
  ["business-debt-refinance-and-mca-restructuring", "working-capital-financing"],
  ["startup-financing", "equipment-financing"],
  ["startup-financing", "business-term-loans-and-lines-of-credit"],
];

/** Both directions of RELATED_PAIRS, built once at module load. */
const BY_SLUG: Map<string, string[]> = (() => {
  const map = new Map<string, string[]>();
  const add = (from: string, to: string) => {
    const list = map.get(from);
    if (list) {
      if (!list.includes(to)) list.push(to);
    } else {
      map.set(from, [to]);
    }
  };
  for (const [a, b] of RELATED_PAIRS) {
    add(a, b);
    add(b, a);
  }
  return map;
})();

/**
 * The guides to offer alongside `slug`, in RESOURCE_GUIDES order.
 *
 * Ordered by the guide array rather than by the order relations were written,
 * so the list reads the same way the Resources section does and does not
 * reshuffle when a pair is added above.
 *
 * Returns [] for an unknown slug and for a guide with no relations, which the
 * page treats as "render nothing" rather than an empty heading.
 */
export function relatedGuides(slug: string): ResourceGuide[] {
  const slugs = BY_SLUG.get(slug);
  if (!slugs) return [];
  return RESOURCE_GUIDES.filter((guide) => slugs.includes(guide.slug));
}

/** Exported for the test only. */
export const __RELATED_PAIRS = RELATED_PAIRS;
