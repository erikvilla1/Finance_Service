import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { relatedGuides, __RELATED_PAIRS } from "./related";
import { RESOURCE_GUIDES } from "./data";

/**
 * The related-guides map is hand-written slugs pointing at other hand-written
 * slugs, which is exactly the shape that rots silently: a typo or a renamed
 * guide produces a missing suggestion, not an error. These tests are the thing
 * that notices.
 */
describe("related resource guides", () => {
  it("every slug in the pair list is a real guide", () => {
    const known = new Set(RESOURCE_GUIDES.map((g) => g.slug));
    for (const [a, b] of __RELATED_PAIRS) {
      assert.ok(known.has(a), `unknown slug in RELATED_PAIRS: ${a}`);
      assert.ok(known.has(b), `unknown slug in RELATED_PAIRS: ${b}`);
    }
  });

  it("relations are symmetric in both directions", () => {
    for (const guide of RESOURCE_GUIDES) {
      for (const related of relatedGuides(guide.slug)) {
        const back = relatedGuides(related.slug).map((g) => g.slug);
        assert.ok(
          back.includes(guide.slug),
          `${guide.slug} offers ${related.slug} but not the reverse`,
        );
      }
    }
  });

  it("no guide suggests itself", () => {
    for (const guide of RESOURCE_GUIDES) {
      assert.ok(
        !relatedGuides(guide.slug).some((g) => g.slug === guide.slug),
        `${guide.slug} suggests itself`,
      );
    }
  });

  it("every guide has at least one related guide", () => {
    // The client's pairs happen to cover all eleven. If a twelfth guide is
    // added without a pair, this fails rather than shipping a guide whose
    // Related section silently disappears.
    for (const guide of RESOURCE_GUIDES) {
      assert.ok(
        relatedGuides(guide.slug).length > 0,
        `${guide.slug} has no related guides`,
      );
    }
  });

  it("an unknown slug returns an empty list rather than throwing", () => {
    assert.deepEqual(relatedGuides("not-a-guide"), []);
  });
});
