"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ButtonLink, Container } from "@/components/ui";
import { useScrolledPast } from "@/components/marketing/use-reduced-motion";

/**
 * Header and footer.
 *
 * Navigation follows platform spec §6. The primary CTA is "See My Financing
 * Options", never "Contact Us" — spec §4 is explicit that contact must not be
 * the primary conversion action.
 */

/**
 * In-page anchors, not routes.
 *
 * The marketing site is one scrolling page (see the home page's sections). The
 * only navigation that leaves it is "See My Financing Options" — every link
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

/**
 * Shared surface for the neutral capsules — one for the hero, one for
 * everything else.
 *
 * The header floats over the home page's dark hero video, where a white border
 * and a translucent white fill read as glass. On every other page it floats
 * over a near-white document, where that same treatment is white on white: the
 * capsules lose their edges and the Sign in link disappears entirely, because
 * it was written as white text with a drop shadow for the video behind it.
 *
 * So the surface switches on whether this is the home page. Same shape and
 * size either way — only the contrast changes.
 */
const CAPSULE_SURFACE_HERO =
  "border border-white/70 bg-white/80 shadow-card backdrop-blur-xl";
const CAPSULE_SURFACE_PAGE =
  "border border-ink-200 bg-white/90 shadow-card backdrop-blur-xl";

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

export function SiteHeader() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const activeSection = useActiveSection(onHome);
  const scrolled = useScrolledPast(80);

  /**
   * The outer capsules lift away on scroll; the nav stays.
   *
   * Timing, easing and the lg-only guard live in .header-capsule in globals.css
   * — see the comment there for why this is a written-out declaration rather
   * than a stack of utilities.
   */
  const capsule = `header-capsule${scrolled ? " header-capsule--out" : ""}`;
  const surface = onHome ? CAPSULE_SURFACE_HERO : CAPSULE_SURFACE_PAGE;

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
      {/* Padding matches the gap between the video card's top edge and this
          row, so the logo sits the same distance from the card's left edge as
          it does from its top. See the hero arithmetic on the home page. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Link
          href="/"
          aria-label="Financial Lending Specialists"
          className={`${CAPSULE} ${surface} ${capsule} justify-self-start px-5 sm:px-6`}
        >
          <Image
            src="/brand/fls-logo-icon.png"
            alt=""
            width={824}
            height={714}
            className="h-9 w-auto max-w-none shrink-0 sm:hidden"
            priority
          />
          <Image
            src="/brand/fls-logo-full.png"
            alt=""
            width={2613}
            height={527}
            className="hidden h-9 w-auto max-w-none shrink-0 sm:block"
            priority
          />
        </Link>

        {/* Grey capsule, white pill on the active item — the reference's
            arrangement. It only works this way round: a white bar cannot show a
            white highlight, so the container has to be the darker of the two. */}
        <nav
          aria-label="Main"
          className={`${CAPSULE} hidden justify-self-center border ${onHome ? "border-white/50" : "border-ink-200"} bg-ink-100/80 px-2 shadow-card backdrop-blur-xl lg:flex`}
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
              onHome
                ? "text-white drop-shadow-sm hover:text-white/70"
                : "text-ink-700 hover:text-ink-900"
            }`}
          >
            Sign in
          </Link>

          {/* Padding comes from size="lg" alone. Adding px-* here would put two
              competing padding utilities on one element, and which wins is
              decided by Tailwind's stylesheet order rather than by the order
              they are written — a coin flip that reads as a bug. */}
          <ButtonLink
            href="/start"
            size="lg"
            className={`${CAPSULE} whitespace-nowrap shadow-card`}
          >
            See My Financing Options
          </ButtonLink>
        </div>
      </div>
    </header>
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
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Image
                src="/brand/fls-logo-icon.png"
                alt=""
                width={824}
                height={714}
                className="h-7 w-auto max-w-none shrink-0"
              />
              <span className="text-sm font-semibold text-ink-900">
                Financial Lending Specialists
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-600">
              Financing solutions for real-world business needs.
            </p>
            {/* The primary action, repeated at the end of the page so it is
                there when someone finishes reading rather than only in the
                sticky header. Spec §4: this stays the primary conversion. */}
            <ButtonLink href="/start" className="mt-6">
              See My Financing Options
            </ButtonLink>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ink-900">Get started</h2>
            <ul className="mt-3 space-y-2">
              {/* "See my financing options" was here as a text link too. It
                  is a button in the left column now, and the same label twice
                  in one footer reads as an oversight rather than emphasis. */}
              <li>
                <Link href="/sign-in" className="text-sm text-ink-600 hover:text-brand-700">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ink-900">Explore</h2>
            <ul className="mt-3 space-y-2">
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
            <h2 className="text-sm font-semibold text-ink-900">Legal</h2>
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
        <div className="border-t border-ink-200 py-8">
          <p className="text-xs leading-relaxed text-ink-600">
            Financial Lending Specialists arranges financing through third-party
            funding sources. Nothing on this site is a commitment to lend or an
            offer of credit. All financing is subject to qualification, lender
            review, and program availability. Program terms and availability vary
            and may change.
          </p>
          <p className="mt-4 text-xs text-ink-600">
            © {new Date().getFullYear()} Financial Lending Specialists. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
