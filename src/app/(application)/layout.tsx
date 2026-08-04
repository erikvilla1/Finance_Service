import Link from "next/link";
import { Container } from "@/components/ui";

/**
 * Application flow chrome.
 *
 * Deliberately stripped down: no marketing navigation, no footer links. Once
 * someone starts an application, every additional link is a way to leave it.
 */
export default function ApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <Container>
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="grid h-9 w-9 place-items-center rounded-lg bg-brand-800 text-sm font-bold text-white"
              >
                FLS
              </span>
              <span className="text-sm font-semibold text-ink-900">
                Financial Lending Specialists
              </span>
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-ink-500 hover:text-ink-800"
            >
              Save &amp; exit
            </Link>
          </div>
        </Container>
      </header>

      <main id="main" className="flex-1 py-10 sm:py-14">
        {children}
      </main>

      <footer className="border-t border-ink-200 bg-white py-6">
        <Container>
          <p className="text-xs leading-relaxed text-ink-500">
            Your information is submitted for review. Nothing on this site is a
            commitment to lend or an offer of credit. All financing is subject to
            qualification, lender review, and program availability.
          </p>
        </Container>
      </footer>
    </div>
  );
}
