"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { ButtonLink, Container } from "@/components/ui";
import { useHeaderReveal, useScrolledPast } from "@/components/marketing/use-reduced-motion";
import { Reveal } from "@/components/marketing/reveal";

/**
 * Header and footer.
 *
 * Navigation follows platform spec §6. The primary CTA is "Get Your Free
 * Quote", never "Contact Us" — spec §4 is explicit that contact must not be
 * the primary conversion action.
 */

/**
 * In-page anchors, not routes.
 *
 * The marketing site is one scrolling page (see the home page's sections). The
 * only navigation that leaves it is "Get Your Free Quote" — every link
 * here moves within it, so a visitor cannot wander into a corner of the site
 * that has no path back to the application.
 *
 * Written with the leading "/" so they work from anywhere. On the home page the
 * browser scrolls; from a legal page it routes home and then scrolls, which is
 * the behaviour you want from a footer link on /privacy.
 *
 * The standalone routes still exist and still render — /how-it-works,
 * /financing-options, /about, /resources, /contact. They are simply no longer
 * linked from the header. Kept because they are indexable, deep-linkable, and
 * because deleting them would break any URL already shared.
 */
const NAV = [
  { href: "/", label: "Home" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#about", label: "Who We Are" },
  { href: "/#resources", label: "Resources" },
];

/**
 * Floating capsule header.
 *
 * Detached from the top edge and rounded, so it reads as an object sitting over
 * the page rather than a bar bolted to it — the hero video runs underneath it
 * and stays visible at the corners.
 *
 * DELIBERATELY LIGHT, NOT DARK. The reference this borrows from uses a dark
 * translucent capsule, which works because its wordmark is white. The FLS mark
 * is dark red on transparent and would disappear. A light capsule keeps the
 * logo legible and keeps the header usable on the marketing pages that have no
 * hero behind them at all.
 *
 * Still sticky. Floating and sticky are independent, and losing the persistent
 * CTA to buy a scroll effect would be a bad trade on the page whose whole job
 * is to start an application.
 */
/**
 * Every capsule is exactly this tall.
 *
 * Four separate floating pills only read as a set if they share a baseline and
 * a height — the moment one is a few pixels off, the row looks like it broke
 * rather than like it was composed. Declared once and applied to all four so
 * they cannot drift apart in a later edit.
 *
 * The hero's negative top margin is derived from this number. Changing it means
 * changing the arithmetic documented above the hero on the home page.
 */
const CAPSULE = "flex h-14 shrink-0 items-center rounded-full sm:h-16";

/*
 * THE SHARED CAPSULE SURFACE USED TO LIVE HERE, and it is gone because the logo
 * was the only thing still using it.
 *
 * It existed for a real reason worth recording, since the problem it solved has
 * not gone away — it has only moved onto the logo artwork. The header floats
 * over the home page's dark hero video, where a white border and a translucent
 * white fill read as glass. On every other page it floats over a near-white
 * document, where that same treatment is white on white. So the surface
 * switched on whether this was the home page.
 *
 * The nav pill and the Sign in link still make that switch inline, on
 * `onHome`. The logo now makes it by swapping to a dark copy of the mark. Same
 * problem, same trigger, three different solutions — if a fourth element is
 * added to this header, it will need one too.
 */

/**
 * Which nav entry is highlighted, tracked against scroll position.
 *
 * Returns "" for the top of the page, which is what marks Home active. Anything
 * else is the id of the section currently crossing the middle of the viewport.
 *
 * The -45% inset on both edges collapses the observer's root to a thin band
 * across the centre of the screen, so exactly one section can be intersecting
 * at a time. Without it, a tall section and the one after it are both "visible"
 * for most of a scroll and the highlight flickers between them.
 */
function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState("");

  useEffect(() => {
    if (!enabled) return;

    const ids = NAV.map((item) => item.href.split("#")[1]).filter(Boolean) as string[];
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => n !== null);

    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        // No hit means the band is above the first section — the hero — so
        // nothing is active and Home takes the highlight.
        if (hit) setActive(hit.target.id);
        else if (window.scrollY < window.innerHeight * 0.6) setActive("");
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [enabled]);

  return active;
}

/**
 * Whether the dark hero video is still behind the sticky header.
 *
 * THE BUG THIS REPLACES. The logo and "Sign in" swap to their light,
 * white-on-dark styling whenever `onHome` is true — but `onHome` only means
 * "this is the home page's URL," not "the hero footage is currently behind
 * the header." Scroll past the hero into "Who We Are" or any later section
 * and the header is still sticky at the top of a page whose path is still
 * "/", so it kept rendering white-on-white: the mark and "Sign in" vanished
 * against the light section now sitting behind them. Scrolling back up from
 * mid-page reproduced the same thing without ever visiting the very top.
 *
 * Nav does not have this problem — see the comment on its className — because
 * it carries its own grey capsule surface everywhere. The logo and "Sign in"
 * do not have a surface of their own (the point of the light-header variant
 * is the mark sitting directly on the footage), so they have nothing to fall
 * back on except knowing whether that footage is actually there.
 *
 * -60% BOTTOM MARGIN, NOT 0. A plain "is #hero intersecting at all" flips only
 * once the hero has scrolled completely out of view — a full screen too late,
 * since the header sits over the TOP of the hero, not its bottom. Shrinking
 * the observed band to the header's own neighbourhood (top edge, ~40% of the
 * viewport tall) flips the state exactly when the hero's trailing edge passes
 * under the header instead.
 */
function useOverHero(enabled: boolean) {
  const [overHero, setOverHero] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    const node = document.getElementById("hero");
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setOverHero(entry.isIntersecting),
      { rootMargin: "0px 0px -60% 0px", threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return overHero;
}

export function SiteHeader() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const activeSection = useActiveSection(onHome);
  // Direction-aware: hides on scroll-down, reveals on scroll-up, from any
  // scroll position. See the comment on useHeaderReveal for why this
  // replaced a plain useScrolledPast(80) — that only ever revealed the
  // header again once scrolled back within 80px of the very top.
  const hidden = useHeaderReveal();
  // Only actually light-on-dark while the hero footage is behind the
  // header — see useOverHero for the bug this fixes. Called unconditionally
  // (rules of hooks) and then combined with onHome, rather than the other
  // way round.
  const heroInView = useOverHero(onHome);
  const overHero = onHome && heroInView;

  /**
   * Guide landing pages (/resources/[slug]) get the logo and nothing else.
   *
   * These are a deliberate exit from the single-page marketing site — someone
   * lands on one from a search result, a shared link, or the PDF, not from
   * clicking through the nav — so the nav pill's in-page anchors and "Sign
   * in" have nothing relevant to point at. The page's own CTA (below the
   * headline) is the only conversion action that belongs here; repeating it
   * a second time in the header read as two competing asks on a page that
   * has exactly one job.
   */
  const isGuidePage = pathname?.startsWith("/resources/") ?? false;

  /**
   * All three capsules — logo, nav, trailing — lift away together on scroll.
   *
   * Timing, easing and the lg-only guard live in .header-capsule in globals.css
   * — see the comment there for why this is a written-out declaration rather
   * than a stack of utilities.
   */
  const capsule = `header-capsule${hidden ? " header-capsule--out" : ""}`;

  return (
    <header
      className={`sticky top-0 z-40 px-6 pt-6 sm:px-10 sm:pt-9 ${
        // Off the home page the next thing down is usually a tinted hero
        // block, and with no bottom padding it started flush against the
        // underside of the capsules — the white margin read as uneven.
        // Matching the top padding puts the same gap above and below them.
        //
        // NOT ON HOME. The hero card there is pulled up under the header with
        // a negative margin derived from this element's exact height (see the
        // arithmetic above the hero in page.tsx). Adding padding here would
        // shift the card down and break that.
        onHome ? "" : "pb-6 sm:pb-9"
      }`}
    >
      {/*
        THE BACKDROP BAR, BEHIND EVERYTHING IN THIS HEADER.

        The logo and "Sign in" swapping to dark-on-light (see overHero) makes
        them legible over whatever is behind them, but "legible" and "reads as
        one clean bar" are different things — a dark logo directly on top of a
        photo, a headline, or a card edge scrolling past underneath it still
        looks like two things overlapping. This is the fix: a solid bar the
        full width of the header, filled in behind the logo/nav/CTA row
        exactly when they are dark-on-light, so the page scrolling underneath
        is fully covered rather than showing through around the edges of each
        element individually.

        NOT ON GUIDE PAGES. Those already sit on the gradient hero band with
        just the logo floating on it, by design (see the note on that band in
        resources/[slug]/page.tsx) — this bar would flatten that back into an
        ordinary opaque header.

        TWO SIGNALS, NESTED RATHER THAN COMBINED INTO ONE. The bar should be
        gone whenever the capsules themselves are gone (scrolling down —
        `hidden`) and ALSO whenever the page is scrolled back up but still
        over the hero (`overHero`) — appearing only on the one combination
        that actually happens: scrolling up, past the hero. Both conditions
        need to independently darken it to nothing, which is exactly what
        opacities multiplying through nested elements does for free.

        Outer element carries `capsule` (header-capsule / --out) — the exact
        same class the logo/nav/trailing use for the scroll-direction fade,
        so this bar's slide-and-fade is pixel-identical to theirs and, being
        lg-only (see .header-capsule--out's media guard in globals.css),
        leaves it always visible on mobile exactly as the rest of the header
        does. Inner element carries the overHero opacity, unconditionally at
        every breakpoint — mobile has no scroll-direction hide, but it still
        must not show a light-page bar while sitting over the dark hero.

        FIXED HEIGHT (6.5rem / 8.5rem = pt-6+CAPSULE+pt-6 / pt-9+CAPSULE+pt-9),
        NOT inset-0 and not just pt+CAPSULE. inset-0 would stretch this bar
        through the header's own pb-6/sm:pb-9 (present on non-home pages —
        see the comment on <header>'s className), leaving its border floating
        in blank whitespace below the capsules instead of sitting flush under
        them. But pt+CAPSULE alone (this bar's first version) went too far the
        other way: flush against the capsule's *own* bottom edge, with none of
        the breathing room it has above. Repeating the top gap below the
        capsule — the same pt-6/pt-9 again — gives the bar a symmetric margin
        on both sides of the row it holds, rather than hugging one edge of it.
      */}
      {!isGuidePage && (
        <div aria-hidden="true" className={`absolute inset-x-0 top-0 ${capsule}`}>
          <div
            className="h-[6.5rem] border-b border-ink-200/80 bg-white/95 shadow-card backdrop-blur-xl transition-opacity duration-300 sm:h-[8.5rem]"
            style={{ opacity: overHero ? 0 : 1 }}
          />
        </div>
      )}
      {/* Padding matches the gap between the video card's top edge and this
          row, so the logo sits the same distance from the card's left edge as
          it does from its top. See the hero arithmetic on the home page. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Link
          href="/"
          aria-label="FLS Capital Advisors"
          className={`${CAPSULE} ${capsule} group justify-self-start pl-2`}
        >
          {/*
            NO CAPSULE ON THE LOGO — the reference's arrangement, where the mark
            sits directly on the hero footage. CAPSULE is still applied for its
            height alone, so the mark stays on the same centre line as the nav
            pill and the CTA beside it; only the surface classes are dropped.
            The other capsules are untouched.

            pl-2 REPLACES THE BOX'S INSET. The capsule carried px-5 sm:px-6, and
            dropping it took the mark's horizontal breathing room with it: the
            logo landed 20px from the hero card's left edge while sitting 28px
            below its top, and the note further down this file says those two
            distances are meant to match. 8px restores the equality rather than
            splitting the difference by eye. If the header's px-* or the card's
            mx-3 ever change, this number is downstream of both.

            TWO FILES, ONE MARK. The mark is white, which works over the hero
            video and nowhere else — every other page in this header's scope
            (How It Works, Who We Are, Resources, the legal pages) is cream or
            white, and a white logo with no capsule behind it on a cream page is
            not subtle, it is absent. The dark file is the same artwork with the
            alpha channel preserved and the colour set to ink-900, so the two
            are guaranteed to be the same shape.

            Rendered at twice the display size for retina. The source artwork is
            small, so it is upscaled rather than downsampled — if a larger
            export turns up, drop it in and delete this note.
          */}
          {/*
            HOVER, PORTED FROM THE REFERENCE RATHER THAN COPIED.

            Measured on siwacap.com: the mark is #FFFFFF at rest and #D6D6D6 on
            hover, over `color 0.3s`. That works there because their logo is an
            inline SVG whose fills inherit currentColor, so recolouring the link
            recolours the artwork. Ours is a PNG — `color` does nothing to it.

            Opacity is the equivalent that survives both of our variants, and
            unlike a brightness filter it moves the right way on the dark mark
            too: brightness() would push the ink-900 file DARKER on a cream
            page, which is the opposite of receding. Opacity means "step back"
            on both.

            60%, NOT THE REFERENCE'S 84%. #D6D6D6 is white at 84%, and matching
            it exactly was the first attempt — but the reference sits on a
            near-black city skyline where a 16% drop is plainly visible, and
            ours sits on a brighter one where the same drop was not noticeable
            enough to register as feedback. A hover state nobody sees is not a
            hover state, so this is deliberately further from the source than
            the measurement suggests.

            ON THE IMAGE, NOT ON THE LINK. The link carries .header-capsule,
            which already transitions opacity and sets it to 0 to slide the
            header away on scroll. A hover:opacity on that same element outranks
            the --out rule, so passing the cursor over the top-left corner of a
            scrolled page would fade a hidden header back into view.

            Keyboard users get the global :focus-visible ring from globals.css,
            so this is not the only affordance on the link.
          */}
          <Image
            src={overHero ? "/brand/fls-capital-light.png" : "/brand/fls-capital-dark.png"}
            alt=""
            width={2254}
            height={1070}
            className="h-10 w-auto max-w-none shrink-0 transition-opacity duration-300 group-hover:opacity-60 sm:h-12"
            priority
          />
        </Link>

        {!isGuidePage && (
          <>
            {/*
              Grey capsule, white pill on the active item — the reference's
              arrangement. It only works this way round: a white bar cannot
              show a white highlight, so the container has to be the darker
              of the two.

              ALWAYS HAS THE SURFACE, including at the very top of home over
              the hero video. A transparent-over-the-hero variant was tried —
              pills floating directly on the footage, the way the logo does —
              and reverted: without a surface behind it the nav read as
              missing rather than as a deliberate treatment. border-white/50
              still swaps in over the hero so the hairline stays visible
              against the dark video where border-ink-200 would nearly
              disappear — keyed to overHero, not onHome, so it swaps back
              once the page scrolls past the hero into a light section. See
              useOverHero for why onHome alone was wrong here too.
            */}
            <nav
              aria-label="Main"
              className={`${CAPSULE} ${capsule} hidden justify-self-center border ${
                overHero ? "border-white/50" : "border-ink-200"
              } bg-ink-100/80 px-2 shadow-card backdrop-blur-xl lg:flex`}
            >
              <ul className="flex items-center gap-1">
                {NAV.map((item) => {
                  const hash = item.href.split("#")[1];
                  const active = onHome
                    ? hash
                      ? activeSection === hash
                      : activeSection === ""
                    : false;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={[
                          "block whitespace-nowrap rounded-full px-4 py-2 text-[0.95rem] font-medium transition-colors",
                          active
                            ? "bg-white text-ink-900 shadow-sm"
                            : "text-ink-600 hover:bg-white/60 hover:text-brand-700",
                        ].join(" ")}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div
              className={`flex items-center gap-4 justify-self-end ${capsule} header-capsule--trailing`}
            >
              {/* No capsule. It is a tertiary action sitting beside a primary one,
                  and giving it a surface of its own made the two read as a pair of
                  equals. */}
              <Link
                href="/sign-in"
                className={`hidden whitespace-nowrap text-base font-semibold transition-colors sm:inline ${
                  overHero
                    ? "text-white drop-shadow-sm hover:text-white/70"
                    : "text-ink-700 hover:text-ink-900"
                }`}
              >
                Sign in
              </Link>

              {/* Padding comes from size="md" alone. Adding px-* here would put two
                  competing padding utilities on one element, and which wins is
                  decided by Tailwind's stylesheet order rather than by the order
                  they are written — a coin flip that reads as a bug.

                  size="md", not "lg": "lg"'s px-7 was sized for "See Your
                  Personalized Quote" — against the shorter "Get Your Free Quote"
                  it read as an oversized box around the text. "md" trims the
                  padding; the capsule's fixed height (below) still pins this to
                  the same height as the nav pill and logo regardless of size, so
                  the row stays aligned either way. */}
              <ButtonLink
                href="/start"
                size="md"
                className={`${CAPSULE} whitespace-nowrap shadow-card`}
              >
                Get Your Free Quote
              </ButtonLink>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

/**
 * "Back to Top", from the reference's footer.
 *
 * A BUTTON, NOT A LINK. The obvious version is <a href="#top">, but that needs
 * an id="top" on something at the top of every page and it writes "#top" into
 * the address bar — which then sits in history, so Back takes you to the same
 * page rather than the previous one. This performs an action rather than
 * navigating anywhere, and button is the element for that. It is keyboard
 * reachable and Enter-activated for free, which an <a> without an href is not.
 *
 * SMOOTH SCROLL IS CHECKED, NOT ASSUMED. A long smooth scroll is exactly the
 * kind of movement prefers-reduced-motion exists to stop, so it is asked
 * directly here.
 *
 * "instant", NOT "auto", for the reduced case. They are not synonyms: "auto"
 * means "defer to the CSS", and globals.css sets html { scroll-behavior:
 * smooth } — so "auto" would animate anyway. It happens to come out right today
 * only because the reduced-motion block further down that file overrides
 * scroll-behavior to auto with !important. "instant" forces the jump here and
 * does not depend on a rule in another file continuing to exist.
 *
 * No visibility toggle. The control lives at the bottom of the document rather
 * than floating over the corner, so by definition you have already scrolled to
 * reach it — there is no state in which it is present and pointless.
 */
function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduced ? "instant" : "smooth" });
      }}
      className="group inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 transition-colors hover:text-brand-700"
    >
      Back to Top
      <ArrowUp
        aria-hidden="true"
        className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5"
      />
    </button>
  );
}

export function SiteFooter() {
  // ink-100 rather than ink-50: at #FAFAFA the footer was a shade off pure
  // white and read as more page rather than as a distinct block at the end of
  // it. ink-100 is #F5F5F4 — still light, but it reads as a surface.
  // Top corners rounded to match the hero card's radius, so the page opens and
  // closes on the same shape. The white body behind shows through the corners,
  // which is what makes the curve read.
  return (
    <footer className="rounded-t-[1.75rem] border-t border-ink-200 bg-ink-100 sm:rounded-t-[2rem]">
      <Container>
        {/*
          THREE COLUMNS. The brand column is deliberately just the mark, the
          name, and the one-line tagline — no CTA, no Sign in. Both live in
          the sticky header already, and repeating them here was adding
          height to the shortest-looking way to say "here's who we are"
          rather than adding anything a visitor could not already do. It also
          meant this column ran taller than Explore, so the divider below sat
          lower than it needed to for the amount of content up top.

          py-10, down from py-14. It was padding a shape that was lopsided.
        */}
        {/*
          THE WHOLE FOOTER REVEALS AS ONE PIECE.

          Reveal, not a fresh mechanism — it is the same IntersectionObserver
          the marketing sections use, so the footer arrives in the page's own
          language rather than inventing a second one. It also inherits the
          parts that are easy to get wrong: it reveals once and then disconnects
          (re-animating on every pass makes content flicker when a reader
          scrolls back up), it reads prefers-reduced-motion during render rather
          than in an effect, and it renders VISIBLE before hydration — so a
          browser that never runs the script gets a footer rather than a blank
          block.

          ONE Reveal, NOT four staggered ones (the earlier version of this).
          Each Reveal owns its own IntersectionObserver, watching only its own
          element — right for marketing sections spread down a long page,
          where each should animate in on its own moment. A footer is a
          single object a reader either has or hasn't scrolled to, and the
          legal block sits far enough below the three columns (past the
          column grid's own padding, then a border and more padding of its
          own) that its observer was firing on a distinct, later scroll
          position — the columns would finish their entrance and then, a beat
          later, the disclosure text would fade in on its own, reading as a
          second, disconnected animation rather than the rest of the same
          reveal. One Reveal around all of it fixes that by construction:
          there is only one trigger point, so there is nothing left to fall
          out of sync.
        */}
        <Reveal>
        <div className="grid gap-10 py-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            {/* The mark, then the name under it rather than beside it. Set
                side by side, the wordmark and the words "Financial Lending
                Specialists" read as one run-on lockup — and at the old h-7 the
                CAPITAL line under the mark was about three pixels tall and
                illegible. Stacked, the mark gets the height it needs and the
                full name reads as the caption it is. */}
            <Link
              href="/"
              className="group flex flex-col items-start gap-5"
            >
              <Image
                src="/brand/fls-capital-dark.png"
                alt=""
                width={2254}
                height={1070}
                className="h-10 w-auto max-w-none shrink-0 transition-opacity duration-300 group-hover:opacity-60"
              />
              <span className="text-sm font-semibold text-ink-900 transition-colors group-hover:text-brand-700">
                FLS Capital Advisors
              </span>
            </Link>
            {/* No max-w here on purpose — at max-w-xs (20rem) "needs." wrapped
                onto its own line, leaving this column a full line taller than
                Explore/Legal and out of step with their last line. The column
                is comfortably wider than one line of this sentence needs.

                mt-4, not mt-3. This column's own total height (logo + gap-5
                + name + this line) needs to land exactly on Explore's total
                height (4 links, no heading) for "Resources" and this line to
                share a bottom edge. The logo-to-name gap grew from gap-4 to
                gap-5 (name sat too close to the mark), so this margin came
                down from mt-5 to mt-4 by the same 4px to hold that total
                height — and therefore the flush bottom edge — steady. */}
            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              Financing solutions for real-world business needs.
            </p>
          </div>

          <div>
            <ul className="space-y-2">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-ink-600 hover:text-brand-700"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm text-ink-600">Legal</h2>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/privacy" className="text-sm text-ink-600 hover:text-brand-700">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-ink-600 hover:text-brand-700">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link href="/disclosures" className="text-sm text-ink-600 hover:text-brand-700">
                  Disclosures
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/*
          Platform spec §29: legal language is placeholder until counsel
          approves it. This notice is deliberately conservative.
        */}
        <div className="border-t border-ink-200 py-6">
          <p className="text-xs leading-relaxed text-ink-600">
            Financial Lending Specialists D.B.A. FLS Capital Advisors arranges
            financing through third-party funding sources. Nothing on this
            site is a commitment to lend or an offer of credit. All financing
            is subject to qualification, lender review, and program
            availability. Program terms and availability vary and may change.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-ink-600">
              © {new Date().getFullYear()} Financial Lending Specialists D.B.A. FLS Capital Advisors. All rights reserved.
            </p>
            <BackToTop />
          </div>
        </div>
        </Reveal>
      </Container>
    </footer>
  );
}
