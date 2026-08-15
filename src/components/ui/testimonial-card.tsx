import { Star } from "lucide-react";
import type { HTMLAttributes } from "react";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/**
 * A single client review.
 *
 * ADAPTED FROM A shadcn COMPONENT. Three things had to change, and the third
 * is the one that would have bitten silently:
 *
 * 1. NO `cn`, NO RADIX. The source imports `cn` from @/lib/utils, which does
 *    not exist here, and builds the photo out of @radix-ui/react-avatar, which
 *    is not installed. Avatar is three elements and a fallback letter; a
 *    monogram covers it with no dependency. See the note on photos below.
 *
 * 2. NOT A CLIENT COMPONENT. The original is marked "use client" but has no
 *    state, no effects and no handlers. It renders on the server here.
 *
 * 3. THE THEME TOKENS DO NOT EXIST. `bg-background`, `text-muted-foreground`,
 *    `border-primary/10` and `fill-muted` are shadcn's semantic variables.
 *    This project's theme defines ink-*, brand-* and accent-* and none of
 *    those. Tailwind emits nothing for an unknown token rather than failing,
 *    so pasting it unchanged would have compiled cleanly and rendered a
 *    borderless card with invisible stars.
 *
 * WHY A MONOGRAM RATHER THAN A PHOTO. Publishing a client's face carries a
 * separate permission from publishing their words, and a stock headshot
 * attached to a real quote misrepresents the endorser outright. If Robert
 * gets photos with explicit sign-off, an `image` prop is a small change.
 *
 * STARS USE THE ACCENT, NOT GOLD. The card is an accent wash, and amber stars
 * on it read as a second, competing colour. The classes are accent-*, so they
 * follow the theme rather than pinning a literal colour that goes stale the
 * next time the palette moves.
 */
export interface TestimonialProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  role: string;
  company?: string;
  testimonial: string;
  /** Out of five. Pass 0 to hide the row entirely. */
  rating?: number;
}

export function Testimonial({
  name,
  role,
  company,
  testimonial,
  rating = 5,
  className,
  ...props
}: TestimonialProps) {
  return (
    <figure
      className={cx(
        "testimonial-card relative flex h-full flex-col overflow-hidden rounded-2xl border border-accent-300 p-6 shadow-card md:p-7",
        className,
      )}
      {...props}
    >
      {/* Decorative, and hidden from assistive tech — the blockquote already
          announces this as a quotation, so a stray double-quote character read
          aloud is noise. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-5 top-2 select-none font-serif text-7xl leading-none text-accent-800/20"
      >
        &rdquo;
      </span>

      {rating > 0 && (
        <div
          className="relative flex gap-1"
          role="img"
          aria-label={`Rated ${rating} out of 5`}
        >
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              size={15}
              aria-hidden="true"
              className={
                index < rating
                  ? "fill-accent-800 text-accent-800"
                  : "fill-ink-200 text-ink-200"
              }
            />
          ))}
        </div>
      )}

      <blockquote className="relative mt-4 text-[0.95rem] leading-relaxed text-ink-700">
        {testimonial}
      </blockquote>

      {/* mt-auto keeps every attribution on the card's baseline regardless of
          quote length, which is what stops a row of these looking ragged. */}
      <figcaption className="relative mt-auto flex items-center gap-3 pt-6">
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-800/10 text-sm font-semibold text-accent-800"
        >
          {name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-ink-900">{name}</span>
          <span className="text-sm text-ink-500">
            {role}
            {company && ` · ${company}`}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
