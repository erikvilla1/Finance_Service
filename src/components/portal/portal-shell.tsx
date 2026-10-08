"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  CircleHelp,
  FileText,
  FolderUp,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  PenLine,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/app/sign-in/actions";
import { Onboarding } from "@/components/portal/onboarding";

/**
 * The client portal's frame: a sidebar on desktop, a top bar and slide-over
 * menu on a phone, and the onboarding tour.
 *
 * WHAT IT'S FOR. The portal had a top bar with a name and "Sign out", and
 * every page linked back to one list. Someone who had just made an account
 * had no map of where anything was. The sidebar is that map: the four places
 * that matter (overview, application, documents, and signing when it's
 * asked for), settings, How this works, and their specialist's card (the
 * way into Support). Sign out sits top right. Each has one entry point;
 * pages don't repeat them.
 *
 * The links point at the applicant's most recent application; almost
 * everyone has one, and the overview lists any others.
 */

export interface PortalUser {
  id: string;
  name: string | null;
  email: string | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match on prefix rather than exactly (sections live under these). */
  prefix?: boolean;
  /** A small dot: something here is waiting on them. */
  attention?: boolean;
  /**
   * A sub-item, drawn indented under the item before it with a tree line —
   * Sign under Application, because the signature is the application's.
   */
  sub?: boolean;
  /** Shown but not reachable yet, greyed with a lock. */
  locked?: boolean;
  /** Finished: a check instead of the icon. */
  done?: boolean;
}

export function PortalShell({
  user,
  applicationId,
  signatureRequested,
  signed = false,
  documentsAttention = false,
  children,
}: {
  user: PortalUser;
  /** The most recent application, for the Application / Documents links. */
  applicationId: string | null;
  signatureRequested: boolean;
  /** A signed application is on file (and has not been returned). */
  signed?: boolean;
  /** Something in Documents was sent back and needs another copy. */
  documentsAttention?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // "How this works": the illustrated explainer, opened on purpose from the
  // sidebar (the "?" in the top bar on a phone). The first-run walkthrough is the Overview's own
  // spotlight tour (first-run-tour.tsx), which points at the real page.
  const [tourOpen, setTourOpen] = useState(false);

  const firstName = user.name?.trim().split(/\s+/)[0] ?? null;

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    ...(applicationId
      ? [
          {
            href: `/dashboard/${applicationId}/application`,
            label: "Application",
            icon: FileText,
            prefix: true,
          },
          // Always listed, under Application, because the signature belongs
          // to it: locked and greyed until the application is released for
          // signature (Sign now, or the specialist), live with a dot while
          // it waits, and checked once signed (client review, 10-08).
          {
            href: `/dashboard/${applicationId}/sign`,
            label: "Sign",
            icon: PenLine,
            prefix: true,
            sub: true,
            locked: !signatureRequested && !signed,
            done: signed,
            attention: signatureRequested && !signed,
          },
          {
            href: `/dashboard/${applicationId}/documents`,
            label: "Documents",
            icon: FolderUp,
            prefix: true,
            attention: documentsAttention,
          },
        ]
      : []),
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  const supportActive = pathname === "/dashboard/support";

  const isActive = (item: NavItem) =>
    item.prefix ? pathname.startsWith(item.href) : pathname === item.href;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-6 pb-6 pt-7">
        {/* To the overview, never the marketing site: once signed in, the
            logo is "home" within the dashboard. */}
        <Link
          href="/dashboard"
          aria-label="FLS Capital Advisors, your dashboard"
          className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-4"
        >
          <Image
            src="/brand/fls-capital-dark.png"
            alt=""
            width={2254}
            height={1070}
            className="h-10 w-auto max-w-none transition-opacity duration-300 group-hover:opacity-60"
            priority
          />
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
          className="grid h-9 w-9 place-items-center rounded-full text-ink-600 hover:bg-ink-100 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav aria-label="Dashboard" className="px-3">
        <ul data-tour="nav" className="space-y-1">
          {nav.map((item) => {
            const active = isActive(item);
            const Icon = item.done ? Check : item.locked ? Lock : item.icon;
            // The tree line: a sub-item hangs off the item above it.
            const wrap = item.sub ? "relative ml-[1.45rem] pl-3" : undefined;
            const branch = item.sub && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-1 bottom-1/2 left-0 w-3 rounded-bl-lg border-b border-l border-ink-300"
              />
            );
            if (item.locked) {
              return (
                <li key={item.href} className={wrap}>
                  {branch}
                  <span
                    aria-disabled="true"
                    title="Unlocks once every section of your application is complete"
                    className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-400"
                  >
                    <Icon aria-hidden="true" className="h-[1.125rem] w-[1.125rem] shrink-0 text-ink-300" strokeWidth={1.9} />
                    <span className="flex-1">{item.label}</span>
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-ink-400">Locked</span>
                  </span>
                </li>
              );
            }
            return (
              <li key={item.href} className={wrap}>
                {branch}
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand-900 text-white shadow-[0_8px_20px_-12px_rgb(0_0_0/0.6)]"
                      : "text-ink-700 hover:bg-ink-900/[0.04] hover:text-ink-900"
                  }`}
                >
                  <Icon
                    aria-hidden="true"
                    className={`h-[1.125rem] w-[1.125rem] shrink-0 ${
                      active ? "text-white" : item.done ? "text-success-700" : "text-ink-500 group-hover:text-ink-800"
                    }`}
                    strokeWidth={item.done ? 2.5 : 1.9}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.attention && (
                    <span
                      aria-label="Needs your attention"
                      className={`h-2 w-2 rounded-full ${active ? "bg-accent-300" : "bg-accent-600"}`}
                    />
                  )}
                </Link>
              </li>
            );
          })}
          {/* Opens the explainer rather than going anywhere, so a button, but
              styled as one of the list. Desktop only: a phone has the "?" in
              its top bar. */}
          <li className="hidden lg:block">
            <button
              type="button"
              data-tour="help"
              onClick={() => {
                setMenuOpen(false);
                setTourOpen(true);
              }}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-900/[0.04] hover:text-ink-900"
            >
              <CircleHelp
                aria-hidden="true"
                className="h-[1.125rem] w-[1.125rem] shrink-0 text-ink-500 group-hover:text-ink-800"
                strokeWidth={1.9}
              />
              How this works
            </button>
          </li>
        </ul>
      </nav>

      <div className="mt-auto space-y-3 px-3 pb-5">
        {/* Your specialist, and the way into Support: there's no separate
            "Support" nav item, so this is the one door. The tour introduces
            him; this keeps him in reach. */}
        <Link
          href="/dashboard/support"
          onClick={() => setMenuOpen(false)}
          data-tour="specialist"
          aria-current={supportActive ? "page" : undefined}
          className={`flex items-center gap-3 rounded-2xl p-3 ring-inset transition-colors ${
            supportActive
              ? "bg-white ring-2 ring-brand-900"
              : "bg-white/70 ring-1 ring-ink-200/70 hover:bg-white"
          }`}
        >
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-ink-100 ring-1 ring-ink-200">
            <Image src="/brand/robert.jpg" alt="" fill sizes="40px" className="object-cover object-top" />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.7rem] font-semibold uppercase tracking-wider text-accent-800">
              Your specialist
            </span>
            <span className="block truncate text-sm font-semibold text-ink-900">
              Robert Saucedo
            </span>
            <span className="block text-xs text-ink-500">Send a message</span>
          </span>
        </Link>


        <div className="flex items-center gap-3 border-t border-ink-200/70 px-2 pt-4">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-100 text-sm font-semibold text-accent-800 ring-1 ring-inset ring-accent-300/60"
          >
            {(firstName ?? user.email ?? "?").charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink-900">
              {user.name ?? "Your account"}
            </span>
            <span className="block truncate text-xs text-ink-500">{user.email}</span>
          </span>
          {/* Phone menu only; on desktop it's the top-right button. */}
          <form action={signOut} className="lg:hidden">
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="grid h-9 w-9 place-items-center rounded-full text-ink-500 transition-colors hover:bg-ink-900/[0.05] hover:text-ink-900"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-ink-200/70 bg-white/75 backdrop-blur-xl lg:block">
        {sidebar}
      </aside>

      {/* Phone / tablet top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-200/70 bg-white/80 px-4 backdrop-blur-xl lg:hidden">
        <Link
          href="/dashboard"
          aria-label="FLS Capital Advisors, your dashboard"
          className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-4"
        >
          <Image
            src="/brand/fls-capital-dark.png"
            alt=""
            width={2254}
            height={1070}
            className="h-9 w-auto max-w-none"
            priority
          />
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTourOpen(true)}
            data-tour="help-mobile"
            aria-label="How this works"
            className="grid h-10 w-10 place-items-center rounded-full text-ink-700 hover:bg-ink-100"
          >
            <CircleHelp className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            data-tour="menu"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="grid h-10 w-10 place-items-center rounded-full text-ink-700 hover:bg-ink-100"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Phone / tablet slide-over */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${menuOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!menuOpen}
      >
        <div
          onClick={() => setMenuOpen(false)}
          className={`absolute inset-0 bg-brand-950/30 backdrop-blur-sm transition-opacity duration-300 ${menuOpen ? "opacity-100" : "opacity-0"}`}
        />
        <div
          className={`absolute inset-y-0 left-0 w-[19rem] max-w-[85vw] bg-[#FBF8F2] shadow-2xl transition-transform duration-300 ease-out ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          {sidebar}
        </div>
      </div>

      <div className="relative lg:pl-72">
        {/* Sign out, top right on desktop. top-12 / right-12 match the main's
            lg padding (portal layout), so the button sits level with each
            page's heading. On a phone it lives in the menu instead. */}
        <form action={signOut} className="absolute right-12 top-12 z-10 hidden lg:block">
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white/70 px-4 text-sm font-semibold text-ink-700 ring-1 ring-inset ring-ink-200/70 backdrop-blur transition-colors hover:bg-white hover:text-ink-900"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Sign out
          </button>
        </form>
        {children}
      </div>

      {tourOpen && <Onboarding firstName={firstName} onClose={() => setTourOpen(false)} />}
    </>
  );
}
