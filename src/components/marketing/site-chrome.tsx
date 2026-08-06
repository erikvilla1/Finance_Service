import Image from "next/image";
import Link from "next/link";
import { ButtonLink, Container } from "@/components/ui";

/**
 * Header and footer.
 *
 * Navigation follows platform spec §6. The primary CTA is "See My Financing
 * Options", never "Contact Us" — spec §4 is explicit that contact must not be
 * the primary conversion action.
 */

const NAV = [
  { href: "/financing-options", label: "Financing Options" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/about", label: "About Us" },
  { href: "/resources", label: "Resources" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/95 backdrop-blur">
      <div className="grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-6 px-5 sm:px-8">
        <Link
          href="/"
          aria-label="Financial Lending Specialists"
          className="ml-2 flex items-center justify-self-start sm:ml-4"
        >
          <Image
            src="/brand/fls-logo-icon.png"
            alt=""
            width={824}
            height={714}
            className="h-12 w-auto max-w-none shrink-0 sm:hidden"
            priority
          />
          <Image
            src="/brand/fls-logo-full.png"
            alt=""
            width={2613}
            height={527}
            className="hidden h-14 w-auto max-w-none shrink-0 sm:block"
            priority
          />
        </Link>

        <nav aria-label="Main" className="hidden justify-self-center lg:block">
          <ul className="flex items-center gap-8">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="whitespace-nowrap text-base font-medium text-ink-600 transition-colors hover:text-brand-700"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center justify-self-end gap-3">
          <Link
            href="/sign-in"
            className="hidden whitespace-nowrap rounded-lg bg-ink-100 px-5 py-2.5 text-[0.95rem] font-semibold text-ink-700 transition-colors hover:bg-ink-200 sm:inline-flex sm:items-center"
          >
            Sign in
          </Link>
          <ButtonLink href="/start" size="md" className="whitespace-nowrap">
            See My Financing Options
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 bg-ink-50">
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
            <h2 className="text-sm font-semibold text-ink-900">Get started</h2>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/start" className="text-sm text-ink-600 hover:text-brand-700">
                  See my financing options
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className="text-sm text-ink-600 hover:text-brand-700">
                  Sign in
                </Link>
              </li>
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
          <p className="text-xs leading-relaxed text-ink-500">
            Financial Lending Specialists arranges financing through third-party
            funding sources. Nothing on this site is a commitment to lend or an
            offer of credit. All financing is subject to qualification, lender
            review, and program availability. Program terms and availability vary
            and may change.
          </p>
          <p className="mt-4 text-xs text-ink-400">
            © {new Date().getFullYear()} Financial Lending Specialists. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
