"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ResourceGuideCard } from "@/components/marketing/resource-guide-card";
import type { ResourceGuide } from "@/lib/resource-guides/data";

const ARROW_CLASSES =
  "flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-600 " +
  "transition-colors hover:border-ink-300 hover:text-ink-900 disabled:pointer-events-none disabled:opacity-40";

/**
 * The homepage's row into the eleven guide landing pages.
 *
 * Built on Embla rather than a plain overflow-x-auto div for the slide
 * physics — a snap that eases into place and can be dragged, not a scrollbar
 * being nudged. `loop` is left at its default (off) on purpose: looping back
 * to the first card after the last one is disorienting here — someone who
 * just arrived at "Business Debt Refinance" and taps "next" again should not
 * land back on "Equipment Financing" wondering if the row reset. The arrows
 * disable at each end instead.
 *
 * NO CROSS-CARD HOVER CHOREOGRAPHY HERE ANYMORE. A GSAP effect used to lift
 * the hovered card and nudge its neighbors aside on every mouseenter — see
 * resource-guide-card.tsx for why that was replaced with a plain per-card
 * CSS hover. This component only owns the scroll behavior now.
 *
 * CONTROLS SIT ABOVE THE ROW, BESIDE THE HEADING. They used to trail the
 * cards, which put a whole control row of height between the last card and
 * the footer. Up here they share the heading's row instead, so the section
 * ends where the cards do. The heading is passed in as `heading` because the
 * arrows need this component's carousel state and have to live in the same
 * row as it.
 */
export function ResourceGuideScroller({
  guides,
  heading,
}: {
  guides: ResourceGuide[];
  heading?: ReactNode;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        {heading}
        <div className="shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canScrollPrev}
              className={ARROW_CLASSES}
              aria-label="See previous guide"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canScrollNext}
              className={ARROW_CLASSES}
              aria-label="See next guide"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/*
        Room for the hover state on the clipping element itself, not just the
        track inside it. Embla's viewport (this div) clips to its own padding
        box, and a lifted card's shadow reaches ~40px below it: with only
        py-3 the shadow was cut off in a hard line under the card. pb-12
        gives it room to fade out, and -mb-9 hands the extra space back, so
        the gap to the next thing below is the same 12px it always was. The
        top is the same trade (pt-5 inside, mt-5 outside, the old mt-7 +
        py-3 between them), for the lift and the shadow's upper edge.
      */}
      <div className="-mb-9 mt-5 overflow-hidden pb-12 pt-5" ref={emblaRef}>
        {/*
          items-start, not the flex default of stretch. Stretch matched
          every card to the tallest one in view, and since the copy runs
          one to three lines depending on the guide, the shorter cards were
          left with a large dead gap above "View guide". Left to their own
          height, each card is only as tall as its own content.
        */}
        <div className="flex items-start gap-4">
          {guides.map((guide, index) => (
            <div key={guide.slug} className="min-w-0 flex-[0_0_18rem]">
              <ResourceGuideCard
                guide={guide}
                className={
                  index === 0
                    ? "origin-left"
                    : index === guides.length - 1
                      ? "origin-right"
                      : undefined
                }
              />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
