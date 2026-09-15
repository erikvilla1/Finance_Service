"use client";

import Link from "next/link";
import {
  Building2,
  ChevronRight,
  CreditCard,
  Handshake,
  HardHat,
  Hammer,
  Landmark,
  Receipt,
  RefreshCcw,
  Rocket,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ResourceGuide } from "@/lib/resource-guides/data";

/**
 * The resource-guide card, styled after a bordered feature-grid pattern
 * (a boxed icon, a spotlight that follows the pointer) rather than the
 * plain SelectableCard used elsewhere — these are the front door to the
 * site's most detailed content, so they carry a bit more presence than a
 * nav tile.
 *
 * BUILT ON THIS SITE'S OWN TOKENS, NOT A BORROWED THEME. The reference this
 * was adapted from ships its own CSS variables (--background, --warm, a
 * shadcn Badge, class-variance-authority). Pulling those in wholesale would
 * have redefined this project's --color-ink and --color-accent tokens out
 * from under it and duplicated the Badge component that already exists in
 * components/ui. Every color below is one of this site's own tokens instead.
 *
 * NO CORNER CROSSHAIRS. The reference draws small "+" marks straddling the
 * card's border, half in and half out. Dropped — barely visible at this
 * size and not worth the layering they demanded to keep clear of the hover
 * shadow.
 *
 * PURE CSS HOVER, NOT GSAP. An earlier version pushed neighboring cards
 * aside with GSAP on every mouseenter — every clipping bug this row had
 * traced back to that: pushing a card toward whichever edge of the scroll
 * viewport it happened to be resting against, with nowhere further to go.
 * A card lifting and scaling itself needs no coordination with its
 * siblings and no manual tween bookkeeping — the browser's own transition
 * engine already handles being re-triggered mid-animation smoothly, which
 * is exactly the "smooth, not snapping" feel a hand-rolled overwrite never
 * quite matched.
 *
 * `translate`/`scale`, NOT `transform`, in the transition-property list.
 * Tailwind v4's translate/scale utilities write the standalone CSS
 * `translate` and `scale` properties (so they can be set independently),
 * not the legacy composite `transform` — a transition list naming
 * `transform` was watching a property nothing here ever changes, so the
 * lift/scale snapped instantly while only the border and shadow eased in.
 * Only these four are listed (not `transition-all`)
 * so nothing else on the card is accidentally eased.
 */

const ICONS: Record<string, LucideIcon> = {
  "equipment-financing": Wrench,
  "sba-financing": Landmark,
  "commercial-real-estate-financing": Building2,
  "fix-and-flip-financing": Hammer,
  "ground-up-construction-financing": HardHat,
  "working-capital-financing": Wallet,
  "business-term-loans-and-lines-of-credit": CreditCard,
  "invoice-factoring-and-ar-financing": Receipt,
  "business-acquisition-financing": Handshake,
  "startup-financing": Rocket,
  "business-debt-refinance-and-mca-restructuring": RefreshCcw,
};

function handlePointerMove(e: React.PointerEvent<HTMLAnchorElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
}

export function ResourceGuideCard({
  guide,
  className = "",
}: {
  guide: ResourceGuide;
  className?: string;
}) {
  const Icon = ICONS[guide.slug] ?? Wallet;

  return (
    <Link
      href={`/resources/${guide.slug}`}
      onPointerMove={handlePointerMove}
      className={
        "group relative flex min-h-[320px] flex-col gap-4 rounded-card border border-ink-200 bg-white p-6 shadow-card " +
        "transition-[translate,scale,box-shadow,border-color] duration-500 ease-out " +
        "hover:-translate-y-1.5 hover:scale-[1.015] hover:border-accent-600 hover:shadow-card-hover " +
        className
      }
    >
      {/*
        The spotlight needs its own clipped layer, separate from the card
        itself. Putting overflow-hidden on the card (to keep the spotlight's
        square gradient inside the rounded corners) also clipped the card's
        own hover:shadow-card-hover and cut the crosshair marks below in
        half — overflow-hidden clips everything painted outside an element's
        box, its own shadow included, not just its children's content.
      */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        {/* A faint gold wash across the whole card, so the highlight reads
            even before the cursor has moved (the spotlight below only shows
            up where the pointer has actually been). */}
        <span className="absolute inset-0 bg-accent-50 opacity-0 transition-opacity duration-300 group-hover:opacity-60" />
        <span
          className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(circle 260px at var(--mx) var(--my), color-mix(in oklch, var(--color-accent-600) 55%, transparent), transparent 70%)",
          }}
        />
      </span>

      <span className="relative z-10 flex w-fit items-center justify-center rounded-md border border-ink-200 bg-ink-50 p-2.5 transition-colors group-hover:border-accent-700 group-hover:bg-accent-100">
        <Icon className="h-5 w-5 text-brand-800" strokeWidth={1.75} />
      </span>

      <span className="relative z-10 flex-1">
        <span className="block line-clamp-2 text-base font-semibold text-ink-900 group-hover:text-brand-800">
          {guide.title}
        </span>
        <span className="mt-2 block line-clamp-3 text-sm leading-relaxed text-ink-600">
          {guide.dek}
        </span>
      </span>

      <span className="relative z-10 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 group-hover:text-accent-900">
        View guide
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
      </span>
    </Link>
  );
}
