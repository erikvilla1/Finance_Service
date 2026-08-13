"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType, type ReactNode } from "react";
import { ChevronsRight, LayoutDashboard, Moon, Sun, Users } from "lucide-react";

/**
 * The internal chrome: collapsible sidebar, theme toggle, and the wrapper that
 * scopes dark mode.
 *
 * PREFERENCES COME FROM COOKIES, NOT localStorage. Both are read on the server
 * and passed in as props, so the first paint is already correct. Reading them
 * on mount instead would mean the sidebar renders open and then jumps closed,
 * and the theme flashes light before going dark — on every navigation, because
 * this is a server-rendered app and there is no persistent client to remember.
 *
 * They are then written client-side on toggle, so collapsing the sidebar is
 * instant rather than a round trip to a server action.
 *
 * THE `dark` CLASS LIVES HERE. Not on <html>, where it would reach the customer
 * portal — see the note in globals.css. Everything staff-facing renders inside
 * this wrapper.
 */

type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  /** Also match child routes, so a detail page keeps its section highlighted. */
  prefix?: boolean;
};

const NAV: NavItem[] = [
  { href: "/admin/overview", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin", label: "Pipeline", Icon: Users, prefix: true },
];

export function AdminShell({
  children,
  defaultOpen,
  defaultDark,
  userLabel,
  role,
  signOut,
}: {
  children: ReactNode;
  defaultOpen: boolean;
  defaultDark: boolean;
  userLabel: string;
  role: string;
  signOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [dark, setDark] = useState(defaultDark);
  const pathname = usePathname();

  function persist(name: string, value: string) {
    // A year, path-wide, lax. Nothing sensitive — a sidebar width and a colour
    // scheme — so it does not need to be httpOnly, and it must be readable by
    // the server on the next render, which rules out localStorage entirely.
    document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className={dark ? "dark" : undefined}>
      <div className="flex min-h-dvh bg-ink-50 text-ink-900 dark:bg-brand-950 dark:text-ink-100">
        <nav
          aria-label="Admin"
          className={`sticky top-0 h-dvh shrink-0 border-r border-ink-200 bg-white p-2 transition-[width] duration-300 ease-in-out dark:border-brand-800 dark:bg-brand-900 ${
            open ? "w-60" : "w-16"
          }`}
        >
          <div className="mb-6 flex items-center gap-3 border-b border-ink-200 p-2 pb-4 dark:border-brand-800">
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-content-center rounded-lg bg-brand-800 text-sm font-bold text-white dark:bg-accent-600"
            >
              FLS
            </span>
            {open && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink-900 dark:text-ink-100">
                  Financial Lending
                </span>
                <span className="block truncate text-xs text-ink-500 dark:text-ink-400">
                  Specialists
                </span>
              </span>
            )}
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
                    className={`relative flex h-11 w-full items-center rounded-md transition-colors ${
                      active
                        ? "bg-accent-50 text-accent-700 dark:bg-accent-600/15 dark:text-accent-300"
                        : "text-ink-600 hover:bg-ink-50 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-brand-800 dark:hover:text-ink-100"
                    }`}
                  >
                    <span className="grid h-full w-12 shrink-0 place-content-center">
                      <item.Icon className="h-4 w-4" />
                    </span>
                    {open && (
                      <span className="truncate text-sm font-medium">
                        {item.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => {
              const next = !open;
              setOpen(next);
              persist("fls_admin_sidebar", next ? "open" : "closed");
            }}
            aria-expanded={open}
            className="absolute bottom-0 left-0 right-0 border-t border-ink-200 text-left transition-colors hover:bg-ink-50 dark:border-brand-800 dark:hover:bg-brand-800"
          >
            <span className="flex items-center p-3">
              <span className="grid size-10 shrink-0 place-content-center">
                <ChevronsRight
                  className={`h-4 w-4 text-ink-500 transition-transform duration-300 dark:text-ink-400 ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </span>
              {open && (
                <span className="text-sm font-medium text-ink-600 dark:text-ink-300">
                  Hide
                </span>
              )}
            </span>
          </button>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-ink-200 bg-white dark:border-brand-800 dark:bg-brand-900">
            <div className="flex h-16 items-center justify-end gap-3 px-6">
              <span className="hidden text-sm text-ink-600 sm:block dark:text-ink-400">
                {userLabel}
                <span className="ml-2 text-ink-400 dark:text-ink-500">({role})</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  const next = !dark;
                  setDark(next);
                  persist("fls_admin_theme", next ? "dark" : "light");
                }}
                aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
                className="flex size-10 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900 dark:border-brand-800 dark:bg-brand-900 dark:text-ink-400 dark:hover:bg-brand-800 dark:hover:text-ink-100"
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <form action={signOut}>
                <button
                  type="submit"
                  className="text-sm font-medium text-ink-600 hover:text-accent-700 dark:text-ink-400 dark:hover:text-accent-300"
                >
                  Sign out
                </button>
              </form>
            </div>
          </header>

          <main id="main" className="flex-1 py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
