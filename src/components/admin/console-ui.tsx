import Link from "next/link";

/**
 * The admin console's shared vocabulary.
 *
 * WHY THIS FILE EXISTS. The dashboard was rebuilt as an instrument panel —
 * square edges, hairline borders, monospace micro-labels, corner brackets —
 * while the pipeline and lenders kept the marketing site's soft rounded cards
 * and drop shadows. Two design languages inside one sidebar reads as two
 * products, which is exactly the complaint that prompted this.
 *
 * Putting the vocabulary here rather than repeating the class strings means
 * the three screens cannot drift again: changing what a panel looks like is
 * one edit, not a search across the admin tree.
 *
 * NOT A GENERAL UI KIT. `components/ui` is the real one, shared with the
 * customer-facing site. This is deliberately admin-only — the console look is
 * wrong for a nervous business owner filling in a form, and right for the one
 * person reading numbers all day.
 */

/** Hairline instrument surface. Square, not rounded — see the note above. */
export const PANEL =
  "relative border border-ink-200 bg-white dark:border-brand-800 dark:bg-brand-900";

/**
 * Glass: the surface for things that sit ON the page rather than being part
 * of its frame — list rows, filter chips, inputs.
 *
 * WHY NOT JUST A DARKER FILL. A solid panel reads as structure; these are
 * content, and there are dozens of them down a scrolling list. A translucent
 * fill over a blur lets the page's own colour through, so a long list reads as
 * one material with rows in it rather than as forty stacked cards — which is
 * what the white boxes were doing, and why they looked pasted on.
 *
 * 6% white: 4% was too close to the page to give a row an edge, and 10% had
 * the rows competing with PANEL for attention. The distinction between
 * "frame" and "content sitting on the frame" is the point of two surfaces.
 *
 * The fill was never the reason the first pass was hard to read, though — the
 * row TEXT was ink-900 with no dark variant, so it was dark type on a dark
 * page. Raising opacity would have papered over that; the contrast pass on
 * the pipeline's text is the actual fix.
 */
export const GLASS =
  "border border-ink-200/80 bg-white/80 backdrop-blur-xl dark:border-white/12 dark:bg-white/[0.06]";

/** Glass that responds to the pointer — rows and chips you can click. */
export const GLASS_HOVER =
  "transition-colors hover:border-accent-600/60 dark:hover:border-accent-400/40 dark:hover:bg-white/[0.07]";

/** Monospace micro-label. Every heading and unit in the console wears this. */
export const MICRO =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400";

/** The console's heading voice, for panel titles and section headers. */
export const HEADING =
  "font-mono text-[11px] uppercase tracking-[0.2em] text-accent-700 dark:text-accent-300";

/**
 * Corner brackets.
 *
 * The one piece of pure decoration in the console, and it earns its place by
 * making a panel read as an instrument rather than a div. Rendered as four
 * absolutely-positioned spans rather than a border image so they inherit the
 * accent token and stay crisp at any size.
 */
export function CornerBrackets() {
  return (
    <>
      {[
        "left-0 top-0 border-l border-t",
        "right-0 top-0 border-r border-t",
        "bottom-0 left-0 border-b border-l",
        "bottom-0 right-0 border-b border-r",
      ].map((pos) => (
        <span
          key={pos}
          aria-hidden="true"
          className={`pointer-events-none absolute h-2 w-2 border-accent-600/70 dark:border-accent-400/70 ${pos}`}
        />
      ))}
    </>
  );
}

export function Panel({
  title,
  hint,
  children,
  className = "",
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`${PANEL} p-5 ${className}`}>
      <CornerBrackets />
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className={HEADING}>{title}</h2>
        {hint && <span className={MICRO}>{hint}</span>}
      </header>
      {children}
    </section>
  );
}

/**
 * A counter that is usually also a filter.
 *
 * Every number on the pipeline links into the list that produced it: a board
 * that reports "2 files to review" and leaves you to work out which two is one
 * you read once and then go and do the real work somewhere else.
 *
 * The active state inverts rather than merely tinting, because these sit in a
 * row and a tint at this size is easy to miss.
 */
export function StatTile({
  label,
  value,
  hint,
  href,
  active = false,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  /**
   * Omitted only when there is genuinely nothing to filter to.
   *
   * "Conditionally approved" forced this: it counts lender SUBMISSIONS in the
   * `countered` state, while the pipeline filters APPLICATIONS by status —
   * there is no status to point at. Linking it to the nearest-looking filter
   * would open a list that disagrees with the number above it, which is worse
   * than not linking at all.
   */
  href?: string;
  active?: boolean;
  /** Optional rule across the top — used to carry a status colour. */
  accent?: string;
}) {
  /*
    SELECTED = LIT, NOT INVERTED, AND NOT EMPTY.

    Three attempts, and the failures are worth recording because each looked
    fine in the class names:

      1. A faint accent wash — swallowed whole by the glass surface.
      2. A gold border and fill — but accent-400/600 are the site's PALE CREAM
         gold, which reads as gold on cream and as plain white on near-black.
      3. Full inversion (cream fill, dark type) — which rendered as an EMPTY
         BOX. Not a colour problem: `bg-accent-300` and PANEL's own
         `dark:bg-brand-900` were both in one class string, and Tailwind
         resolves that collision by stylesheet order rather than by which was
         written last. The dark fill won and the dark type disappeared into
         it. Card in components/ui carries a comment about exactly this trap.

    So the background is now decided in ONE place — never two competing bg
    utilities on the same element — and selection is carried by a brighter
    surface, a solid accent rail down the left edge, a ring, and a gold label.
    The number stays light on dark, so the tile never loses its content, which
    is what made the inverted version feel broken.
  */
  const surface = [
    "relative block h-full p-5 border transition-colors",
    active
      ? "border-accent-500 bg-ink-100 ring-1 ring-accent-500/50 dark:border-accent-400/60 dark:bg-white/[0.13] dark:ring-accent-400/30"
      : "border-ink-200 bg-white dark:border-brand-800 dark:bg-brand-900" +
        (href ? " hover:border-accent-600/60 dark:hover:border-accent-400/60" : ""),
  ].join(" ");

  const body = (
    <>
      {/* The rail reads as "selected" at a glance from across the row; the
          status accent keeps its hairline when the tile is not selected. */}
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-accent-600 dark:bg-accent-400"
        />
      ) : (
        accent && (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: accent }}
          />
        )
      )}
      <span
        className={`block font-mono text-[10px] uppercase tracking-[0.18em] ${
          active
            ? "text-accent-700 dark:text-accent-300"
            : "text-ink-500 dark:text-ink-400"
        }`}
      >
        {label}
      </span>
      <span className="mt-3 block font-mono text-3xl font-semibold tabular-nums text-ink-900 dark:text-ink-100">
        {value}
      </span>
      {active ? (
        <span className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-700 dark:text-accent-300">
          <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-accent-600 dark:bg-accent-400" />
          Filtering · tap to clear
        </span>
      ) : (
        hint && (
          <span className="mt-1.5 block text-[12px] leading-snug text-ink-500 dark:text-ink-400">
            {hint}
          </span>
        )
      )}
    </>
  );

  if (!href) return <div className={surface}>{body}</div>;

  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={surface}
    >
      {body}
    </Link>
  );
}

/**
 * A compact, inline counter — the quiet half of the pipeline board.
 *
 * WHY THIS EXISTS ALONGSIDE StatTile. The pipeline was showing twelve
 * identical boxes that answered two completely different questions:
 *
 *   - "what does this file need from me" (documents to review, waiting on the
 *     applicant, ready to package) — the work
 *   - "where is this file in the process" (new, in contact, with a lender,
 *     approved) — the reporting
 *
 * Rendering both as the same large tile said they were the same kind of
 * thing, and gave the loudest box on screen to "New 42", which is the least
 * actionable number there. Worse, clicking one silently swapped which axis
 * the list was filtered on, with nothing to say so.
 *
 * So the work keeps StatTile and the status counts get this: same data, same
 * filtering, a fifth of the visual weight. Robert can still see the shape of
 * the book at a glance, but it no longer competes with the queue he actually
 * works.
 */
export function StatusChip({
  label,
  value,
  href,
  active = false,
  accent,
}: {
  label: string;
  value: number | string;
  href?: string;
  active?: boolean;
  accent?: string;
}) {
  const inner = (
    <>
      {accent && (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: accent }}
        />
      )}
      <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
        {label}
      </span>
      <span className="font-mono text-[13px] font-semibold tabular-nums">
        {value}
      </span>
    </>
  );

  const className = [
    "flex items-center gap-2 border px-3 py-2 transition-colors",
    active
      ? "border-accent-500 bg-ink-100 text-ink-900 ring-1 ring-accent-500/50 dark:border-accent-400/60 dark:bg-white/[0.13] dark:text-ink-100 dark:ring-accent-400/30"
      : "border-ink-200 bg-white text-ink-600 dark:border-brand-800 dark:bg-brand-900 dark:text-ink-300" +
        (href ? " hover:border-accent-600/60 dark:hover:border-accent-400/60" : ""),
  ].join(" ");

  if (!href) return <div className={className}>{inner}</div>;
  return (
    <Link href={href} aria-current={active ? "true" : undefined} className={className}>
      {inner}
    </Link>
  );
}
