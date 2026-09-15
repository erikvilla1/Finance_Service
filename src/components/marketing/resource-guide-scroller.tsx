"use client";

import { useCallback, useEffect, useState } from "react";
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
 */
export function ResourceGuideScroller({ guides }: { guides: ResourceGuide[] }) {
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
      {/*
        py-3 on the clipping element, not just the track inside it. Embla's
        viewport (this div) clips to its own padding box — with none, a
        card's hover lift would have nowhere to go but past that edge.
      */}
      <div className="overflow-hidden py-3" ref={emblaRef}>
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

      <div className="mt-5 flex items-center justify-end gap-2">
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
  );
}
