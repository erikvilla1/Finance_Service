import type { Metadata } from "next";
import { Container, Section } from "@/components/ui";

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
 */

const H = "mt-10 text-xl font-semibold tracking-tight text-ink-900";
const P = "mt-4 leading-relaxed text-ink-600";
const UL = "mt-4 list-disc space-y-2 pl-5 leading-relaxed text-ink-600";

const SECTIONS = [
  "Acceptance of these terms",
  "What Financial Lending Specialists does",
  "Nothing here is an offer of credit",
  "Use of the website",
  "Your account",
  "Information you submit",
  "Documents you upload",
  "Authorising us to approach funding sources",
  "Electronic communications",
  "Our materials",
  "Third-party sites and funding sources",
  "Disclaimers and limitation of liability",
  "Indemnity",
  "Termination",
  "Governing law and disputes",
  "Changes to these terms",
  "Contact us",
];

export default function Page() {
  return (
    <>
      <div className="border-b border-ink-200 bg-ink-50">
        <Container>
          <div className="py-16 sm:py-20">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              Terms of Use
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
              The terms that govern your use of this site.
            </p>
            <p className="mt-3 text-sm text-ink-500">Effective [DATE]</p>
          </div>
        </Container>
      </div>

      <Section>
        <Container>
          <div className="max-w-3xl">
            <p className={P}>
              These terms are an agreement between you and Financial Lending
              Specialists (&ldquo;FLS,&rdquo; &ldquo;we,&rdquo;
              &ldquo;us&rdquo;). By using this site, creating an account, or
              submitting information through it, you agree to them. If you do
              not agree, do not use the site.
            </p>

            <h2 className={H}>These terms contain the following sections</h2>
            <ol className="mt-4 list-decimal space-y-1.5 pl-5 leading-relaxed text-ink-600">
              {SECTIONS.map((title) => (
                <li key={title}>{title}</li>
              ))}
            </ol>

            <h2 className={H}>1. Acceptance of these terms</h2>
            <p className={P}>
              By using this site you acknowledge that you have read, understood,
              and agreed to these terms and to our Privacy Policy. We may modify
              these terms; continued use after a change means you accept the
              updated version.
            </p>

            <h2 className={H}>
              2. What Financial Lending Specialists does
            </h2>
            <p className={P}>
              FLS is a financing broker. We help businesses identify and apply
              for financing from third-party funding sources. We are not a bank
              or a lender. We do not lend money, and we do not decide whether
              you are approved — the funding source does, under its own
              underwriting.
            </p>

            <h2 className={H}>3. Nothing here is an offer of credit</h2>
            <p className={P}>
              Any figure, range, or program shown on this site — including
              anything produced by the pre-qualification questions — is an
              estimate based on information you supplied and have not yet
              verified. It is not a commitment to lend, an offer of credit, a
              pre-approval, or a guarantee that financing will be available on
              any terms. Actual terms are set by the funding source and depend
              on its verification and program availability, both of which change.
            </p>

            <h2 className={H}>4. Use of the website</h2>
            <p className={P}>
              You agree to use this site only for lawful purposes. You must not:
            </p>
            <ul className={UL}>
              <li>Violate any applicable law or regulation.</li>
              <li>
                Attempt to access accounts, data, or systems that are not yours.
              </li>
              <li>
                Copy, scrape, or reproduce the site&apos;s content or program
                materials for commercial use without written consent.
              </li>
              <li>
                Upload malicious software or otherwise interfere with the
                operation or security of the site.
              </li>
            </ul>

            <h2 className={H}>5. Your account</h2>
            <p className={P}>
              You are responsible for keeping your credentials confidential and
              for activity carried out under your account. Tell us promptly if
              you believe it has been accessed without your permission. We may
              suspend an account we reasonably believe has been compromised.
            </p>

            <h2 className={H}>6. Information you submit</h2>
            <p className={P}>
              You agree that the information you provide is accurate and
              complete to the best of your knowledge, and that you are
              authorised to provide it — including information about a business
              and about any other owner named in an application. Submitting
              information that is false or misleading may cause an application
              to be declined and may carry consequences beyond this site.
            </p>

            <h2 className={H}>7. Documents you upload</h2>
            <p className={P}>
              Where a file requires supporting documents, you confirm you have
              the right to share them and that they are genuine and unaltered.
              We store them to prepare and support your application. See the
              Privacy Policy for how they are handled.
            </p>

            <h2 className={H}>
              8. Authorising us to approach funding sources
            </h2>
            <p className={P}>
              When you ask us to seek financing, you authorise FLS to share your
              application and supporting documents with funding sources we
              believe fit your situation, for the purpose of obtaining offers.
              Each of those parties handles your information under its own
              privacy policy and may conduct its own review, which can include a
              credit check. We do not control their decisions, their terms, or
              their treatment of your information.
            </p>

            <h2 className={H}>9. Electronic communications</h2>
            <p className={P}>
              We deliver status updates, document requests, and other notices
              electronically — through the portal and by email. You agree to
              receive them that way.
            </p>
            <p className={P}>
              [COUNSEL: if any disclosure required by law will be delivered
              electronically, the federal E-SIGN Act sets out specific consent
              requirements that this clause does not currently meet. Confirm
              which disclosures are in scope and whether a separate consent flow
              is needed.]
            </p>

            <h2 className={H}>10. Our materials</h2>
            <p className={P}>
              The content on this site, including the program brochures
              available for download, belongs to FLS or its licensors. You may
              read and download them to evaluate financing for your own
              business. All other rights are reserved.
            </p>

            <h2 className={H}>
              11. Third-party sites and funding sources
            </h2>
            <p className={P}>
              This site links to third parties, and arranging financing means
              introducing you to them. We do not control them and are not
              responsible for their content, their products, their decisions, or
              their practices. Your dealings with a funding source are between
              you and that funding source.
            </p>

            <h2 className={H}>
              12. Disclaimers and limitation of liability
            </h2>
            <p className={P}>
              [COUNSEL TO DRAFT. Should address the &ldquo;as is&rdquo;
              disclaimer of warranties, the exclusion and cap on damages, and
              any statutory limits on those. The reference site&apos;s version
              is generic boilerplate and should not be inherited on trust —
              enforceability is state-specific, and this business carries
              obligations a brochure site does not.]
            </p>

            <h2 className={H}>13. Indemnity</h2>
            <p className={P}>[COUNSEL TO DRAFT.]</p>

            <h2 className={H}>14. Termination</h2>
            <p className={P}>
              We may suspend or end your access to this site if you breach these
              terms or use the site unlawfully. You may stop using it at any
              time. Sections that by their nature should survive termination
              will do so.
            </p>

            <h2 className={H}>15. Governing law and disputes</h2>
            <p className={P}>
              [COUNSEL TO DRAFT. Specify governing state law and venue, and
              decide whether to include an arbitration provision and a
              class-action waiver. That is a business decision with real
              consequences, not boilerplate, and the drafting requirements
              differ by state.]
            </p>

            <h2 className={H}>16. Changes to these terms</h2>
            <p className={P}>
              If we change these terms we will update the effective date at the
              top of this page.
            </p>

            <h2 className={H}>17. Contact us</h2>
            <p className={P}>
              [LEGAL ENTITY NAME] · [BUSINESS MAILING ADDRESS] ·
              [CONTACT EMAIL]
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
