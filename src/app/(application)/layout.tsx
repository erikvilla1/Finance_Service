import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui";
import { SilkGradient } from "@/components/marketing/silk-gradient";

/**
 * Application flow chrome.
 *
 * Deliberately stripped down: no marketing navigation, no footer links. Once
 * someone starts an application, every additional link is a way to leave it.
 *
 * The silk gradient runs at low opacity behind the whole flow — an ambient
 * texture, not a focal graphic, so it doesn't compete with form legibility.
 */
export default function ApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-ink-50">
      <SilkGradient className="fixed inset-0" opacity={0.14} />

      <header className="relative border-b border-ink-200 bg-white">
        <Container>
          <div className="flex h-16 items-center justify-between">
            <Link href="/" aria-label="Financial Lending Specialists" className="flex items-center">
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
            <Link
              href="/"
              className="text-sm font-medium text-ink-500 hover:text-ink-800"
            >
              Save &amp; exit
            </Link>
          </div>
        </Container>
      </header>

      <main id="main" className="relative flex-1 py-10 sm:py-14">
        {children}
      </main>

      <footer className="relative border-t border-ink-200 bg-white py-6">
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
