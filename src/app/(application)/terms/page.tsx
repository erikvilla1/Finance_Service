import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { TermsContent } from "@/components/legal/terms-content";

export const metadata: Metadata = { title: "Terms of Use" };

/**
 * ⚠️  DRAFT — NOT REVIEWED BY COUNSEL. Platform spec §29.
 *
 * STRUCTURED AFTER THE REFERENCE, NOT COPIED FROM IT. The supplied example
 * (siwacap.com/terms-of-use) is nine numbered sections with a table of
 * contents and an effective date, and that shape is worth borrowing. Its
 * substance is not transferable: that site is a brochure with a contact form,
 * so its terms cover reading pages and sending a message.
 *
 * This product does considerably more, and each of those things needs its own
 * clause:
 *
 *   - people create accounts with credentials (§5)
 *   - they submit business and owner information, including a partial SSN (§6)
 *   - they upload bank statements and tax returns (§7)
 *   - FLS then sends that package to third-party funders on their behalf (§8),
 *     which is an authorisation and the single most consequential term here
 *   - status updates and requests are delivered electronically (§9)
 *
 * Its "Investment Disclaimer" is also the wrong disclaimer — that site sells
 * securities exposure; this one brokers commercial credit, so §3 is a
 * no-offer-of-credit clause instead.
 *
 * The risk-allocation sections are still marked in [BRACKETS]. Those are
 * choices with consequences whose enforceability is state-specific, and the
 * reference's own wording is generic boilerplate that should not be inherited
 * on trust.
 *
 * MOVED UNDER (application), NOT (marketing). See the note on the Privacy
 * Policy page — same reasoning, same background and header, same reason the
 * old tinted hero band is gone.
 */
export default function Page() {
  return (
    <Container>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
          Terms of Use
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-600">
          The terms that govern your use of this site.
        </p>
        <p className="mt-3 text-sm text-ink-500">Effective September 14, 2026</p>

        <div className="mt-12">
          <TermsContent />
        </div>
      </div>
    </Container>
  );
}
