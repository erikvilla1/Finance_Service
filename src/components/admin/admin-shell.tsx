"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType, type ReactNode } from "react";
import {
  Menu,
  Landmark,
  LayoutDashboard,
  Users,
} from "lucide-react";

/**
 * The internal chrome: collapsible sidebar, and the wrapper that scopes dark
 * mode to staff screens.
 *
 * DARK ONLY — THE THEME TOGGLE IS GONE. There was a sun/moon button here and a
 * matching `fls_admin_theme` cookie. It went because a light option on this
 * screen was a liability rather than a choice: the console is an instrument
 * panel whose charts, gold accents and status colours were designed and
 * validated against the dark surface, so "light mode" meant a second visual
 * system to keep correct forever in exchange for a preference nobody using
 * this had asked to exercise.
 *
 * The `dark:` variants scattered through the admin tree are deliberately left
 * in place. They now always apply — this wrapper is unconditionally `dark` —
 * and stripping several hundred of them would be a large, risky diff that
 * changes nothing on screen. Treat them as "the admin palette", not as a
 * branch that might one day be taken.
 *
 * THE SIDEBAR PREFERENCE STILL COMES FROM A COOKIE, read on the server and
 * passed in, so the first paint is already correct. Reading it on mount would
 * render the sidebar open and then jump it closed on every navigation, since
 * this is server-rendered and there is no persistent client to remember.
 *
 * THE `dark` CLASS LIVES HERE. Not on <html>, where it would reach the
 * customer portal — see the note in globals.css. Everything staff-facing
 * renders inside this wrapper.
 */

type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  /** Also match child routes, so a detail page keeps its section highlighted. */
  prefix?: boolean;
};

const NAV: NavItem[] = [
  // "Overview", not "Dashboard" — it now matches its own URL, and it stops
  // competing with "Pipeline" for the same meaning: both are dashboards in the
  // loose sense, and the distinction that matters is that one is for reading
  // and the other is for working.
  { href: "/admin/overview", label: "Overview", Icon: LayoutDashboard },
  { href: "/admin", label: "Pipeline", Icon: Users, prefix: true },
  { href: "/admin/lenders", label: "Lenders", Icon: Landmark },
];

export function AdminShell({
  children,
  defaultOpen,
  userLabel,
  role,
  signOut,
}: {
  children: ReactNode;
  defaultOpen: boolean;
  userLabel: string;
  role: string;
  signOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const pathname = usePathname();

  function persist(name: string, value: string) {
    // A year, path-wide, lax. Nothing sensitive — a sidebar width and a colour
    // scheme — so it does not need to be httpOnly, and it must be readable by
    // the server on the next render, which rules out localStorage entirely.
    document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className="dark">
      <div className="flex min-h-dvh bg-ink-50 text-ink-900 dark:bg-brand-950 dark:text-ink-100">
        <nav
          aria-label="Admin"
          className={`sticky top-0 h-dvh shrink-0 border-r border-ink-200 bg-white p-2 transition-[width] duration-300 ease-in-out dark:border-brand-800 dark:bg-brand-900 ${
            open ? "w-60" : "w-16"
          }`}
        >
          {/*
            THE REAL MARK, NOT A LETTERED BADGE. This was a rounded square
            reading "FLS" beside the words "Financial Lending / Specialists" —
            the pre-rebrand identity, and the last place in the product still
            showing it. The customer-facing header, the sign-in card and the
            footer all use this artwork; the admin sidebar now does too, so
            someone moving between them sees one company.

            Two files for two themes, the same swap the marketing header makes:
            the light mark is white and vanishes on a white sidebar, the dark
            mark is ink and vanishes on the dark one. Rendered at twice the
            display height for retina.

            COLLAPSED, NOTHING AT ALL. Two standins were tried here and both
            were worse than the gap: fls-logo-icon.png is the retired red mark
            (still sitting in public/brand, which is how it crept back), and a
            lettered monogram in a 64px rail read as a cramped little box
            rather than a logo. A rail that is purely navigation icons is
            cleaner than one with a shrunken wordmark wedged above them, and
            the mark is one click away the moment the sidebar opens.

            CENTRED, NOT LEFT-HUGGING. The wordmark sat flush against the left
            edge while every nav row below it was inset by its icon column, so
            the logo looked like it had slipped out of the layout. Centring it
            in the panel gives the sidebar a single axis.
          */}
          {/*
            THE COLLAPSE CONTROL LIVES UP HERE, AS A HAMBURGER. It was a full
            "« Hide" bar pinned to the bottom edge, which put the one control
            that changes the sidebar's shape as far from the sidebar's start as
            the layout allowed, and cost a row of height to say a word the icon
            already says. Three stacked lines beside the mark is the convention
            everyone already reads, and it frees the bottom edge for the
            identity block.

            THE MARK LINES UP WITH THE NAV ICONS, not with the panel. Flush to
            the sidebar's own edge it looked like it had slipped out of the
            layout; dead-centred it agreed with nothing else on screen. The
            icons below start 18px in — 2px of active-state border plus 16px
            of centring inside their w-12 column — so the wordmark starts
            there too and the sidebar reads on one left axis.

            If the icon column or that border width changes, this number is
            downstream of both.
          */}
          <div className="relative mb-6 flex h-12 items-center border-b border-ink-200 pl-[18px] pr-2 dark:border-brand-800">
            {open && (
              /* The mark is home, the way it already is in the client portal
                 and on the marketing site. It stopped being a link when this
                 block was rewritten — an easy thing to lose, and people click
                 a logo expecting it to go somewhere. Pointing at Overview
                 rather than /admin: Overview is the admin's landing screen,
                 and /admin is the pipeline. Clicking it while already on
                 Overview re-navigates to the same route, which is the
                 refresh-in-place behaviour you would expect. */
              <Link
                href="/admin/overview"
                aria-label="FLS Capital Advisors, admin overview"
                className="group outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              >
                <Image
                  src="/brand/fls-capital-dark.png"
                  alt="FLS Capital Advisors"
                  width={2254}
                  height={1070}
                  className="h-8 w-auto max-w-none shrink-0 transition-opacity duration-300 group-hover:opacity-60 dark:hidden"
                  priority
                />
                <Image
                  src="/brand/fls-capital-light.png"
                  alt="FLS Capital Advisors"
                  width={2254}
                  height={1070}
                  className="hidden h-8 w-auto max-w-none shrink-0 transition-opacity duration-300 group-hover:opacity-60 dark:block"
                  priority
                />
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                const next = !open;
                setOpen(next);
                persist("fls_admin_sidebar", next ? "open" : "closed");
              }}
              aria-expanded={open}
              aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
              title={open ? "Collapse sidebar" : "Expand sidebar"}
              className={`grid size-9 place-content-center text-ink-500 transition-colors hover:text-accent-700 dark:text-ink-400 dark:hover:text-accent-300 ${
                // Centred in the rail when collapsed, tucked right when open.
                open ? "absolute right-1" : ""
              }`}
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>

          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = item.prefix
                ? pathname === item.href ||
                  (pathname.startsWith(`${item.href}/`) &&
                    !NAV.some(
                      (other) => other !== item && pathname.startsWith(other.href),
                    ))
                : pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={open ? undefined : item.label}
                    /* Square, not rounded, and the active item carries a rule
                       down its left edge rather than only a tint — the same
                       instrument vocabulary the console panels use, so the
                       sidebar belongs to the same product as the screen it is
                       sitting next to. */
                    className={`relative flex h-11 w-full items-center border-l-2 transition-colors ${
                      active
                        ? "border-accent-600 bg-accent-50 text-accent-700 dark:border-accent-400 dark:bg-accent-600/15 dark:text-accent-300"
                        : "border-transparent text-ink-600 hover:bg-ink-50 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-brand-800 dark:hover:text-ink-100"
                    }`}
                  >
                    <span className="grid h-full w-12 shrink-0 place-content-center">
                      <item.Icon className="h-4 w-4" />
                    </span>
                    {open && (
                      <span className="truncate font-mono text-[11px] uppercase tracking-[0.18em]">
                        {item.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/*
            WHO IS SIGNED IN LIVES HERE NOW, not in a header band of its own.
            The top bar was a full 64px row holding two words and a link, which
            is a lot of vertical space on a screen whose whole job is fitting
            numbers above the fold. Identity is ambient information — you check
            it once — so it belongs pinned in the sidebar with the other
            ambient chrome, and only the one action it implies stays in reach.

            Hidden when collapsed: a truncated email in a 64px rail is noise,
            and the rail is for navigation.
          */}
          {open && (
            <div className="absolute bottom-0 left-0 right-0 border-t border-ink-200 px-4 py-3 dark:border-brand-800">
              <p className="truncate font-mono text-[11px] uppercase tracking-[0.14em] text-ink-700 dark:text-ink-300">
                {userLabel}
              </p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-accent-700 dark:text-accent-400">
                {role}
              </p>
            </div>
          )}

        </nav>

        <div className="relative flex min-w-0 flex-1 flex-col">
          {/*
            NOT A BAR ANY MORE. This was a bordered, filled 64px header whose
            entire contents were a name and a link; with the name moved to the
            sidebar there was nothing left to justify the band, the rule under
            it, or the fill. What remains is the single action, floated in the
            corner over the page it belongs to, so every screen below starts at
            the top of the viewport instead of 64px down.

            Absolutely positioned rather than in flow: sitting in the flow it
            would still push the page down by its own height, which is the
            thing being removed.
          */}
          <form
            action={signOut}
            /* Right inset tracks Container's own padding (px-6 sm:px-10
               lg:px-14) so the button's right edge lands on the same line as
               every panel and row below it. A fixed inset agreed with the
               page only at the narrowest breakpoint and drifted 32px out of
               line at lg, which is exactly where it is usually read.

               top-12 rather than top-5: the content below now starts on the
               sidebar's 56px divider line, and at top-5 this floated well
               above everything, anchored to nothing. Here its centre lands on
               the page's own first line of type. */
            className="pointer-events-none absolute right-6 top-12 z-20 sm:right-10 lg:right-14"
          >
            <button
              type="submit"
              className="pointer-events-auto border border-ink-200 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-600 transition-colors hover:border-accent-600 hover:text-accent-700 dark:border-brand-800 dark:text-ink-400 dark:hover:border-accent-400 dark:hover:text-accent-300"
            >
              Sign out
            </button>
          </form>

          {/*
            pt-14 IS THE SIDEBAR'S DIVIDER, NOT A ROUND NUMBER. The rule under
            the mark sits at 56px: 8px of nav padding plus the 48px branding
            row. Matching it here starts every admin page's first line on that
            same rule, so the sidebar and the content share a horizon instead
            of each beginning wherever their own padding happened to land.

            IT ALSO LIVES HERE RATHER THAN PER PAGE. The console was adding its
            own py-8 on top of this one and starting 32px lower than the
            pipeline — two screens disagreeing about where a page begins, for
            no reason anyone could see in either file.
          */}
          <main id="main" className="flex-1 pb-8 pt-14">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
