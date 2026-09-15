/**
 * Terms of Use body, extracted so it can be rendered in more than one place.
 *
 * WHY THIS IS A COMPONENT AND NOT JUST A PAGE. The account-creation form opens
 * this text in a dialog rather than sending someone away mid-form, and the
 * person ticking that box is agreeing to THIS wording — a consent row is
 * written recording the version and a hash of the label they saw (see
 * lib/funding-application/consent-text.ts).
 *
 * If the dialog held its own copy, the two would drift, and the day they
 * drifted the site would be recording agreement to words nobody was shown. One
 * source rendered twice is the only arrangement that cannot do that.
 *
 * The page keeps the hero, the effective date and the surrounding chrome. This
 * is the body only.
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

export function TermsContent() {
  return (
    <>
            <p className={P}>
              These terms are an agreement between you and Financial Lending
              Specialists D.B.A. FLS Capital Advisors (&ldquo;FLS,&rdquo;
              &ldquo;we,&rdquo; &ldquo;us&rdquo;). By using this site, creating
              an account, or
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
              Where the law requires your consent before we can deliver a
              disclosure electronically, using this site or the portal after
              being shown that requirement is how you give it. You can
              withdraw that consent at any time by contacting us at the
              address below, after which we will deliver any future
              legally-required disclosure on paper instead. You will need a
              device and software capable of viewing a PDF to access
              documents delivered this way, and you should keep your contact
              information with us current so you continue to receive them.
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
              This site and the portal are provided &ldquo;as is&rdquo; and
              &ldquo;as available,&rdquo; without warranties of any kind,
              express or implied, including any warranty of merchantability,
              fitness for a particular purpose, or non-infringement. We do
              not warrant that the site will be uninterrupted, error-free, or
              secure, or that any estimate, program description, or other
              content is accurate or current.
            </p>
            <p className={P}>
              To the fullest extent the law allows, FLS will not be liable
              for any indirect, incidental, consequential, special, or
              punitive damages, or for lost profits or lost business, arising
              from your use of this site or the portal, even if we have been
              advised of the possibility. Our total liability for any claim
              arising from your use of this site or the portal will not
              exceed one hundred dollars ($100). Some jurisdictions do not
              allow the exclusion or limitation of certain damages, so some
              of these limits may not apply to you.
            </p>

            <h2 className={H}>13. Indemnity</h2>
            <p className={P}>
              You agree to indemnify and hold FLS, its officers, employees,
              and agents harmless from any claim, loss, liability, or expense
              (including reasonable attorneys&apos; fees) arising from your
              breach of these terms, your misuse of the site or the portal, or
              your violation of any law or of another person&apos;s rights.
            </p>

            <h2 className={H}>14. Termination</h2>
            <p className={P}>
              We may suspend or end your access to this site if you breach these
              terms or use the site unlawfully. You may stop using it at any
              time. Sections that by their nature should survive termination
              will do so.
            </p>

            <h2 className={H}>15. Governing law and disputes</h2>
            <p className={P}>
              These terms are governed by the laws of the State of
              California, without regard to its conflict-of-laws rules. Any
              dispute arising from these terms or your use of the site will
              be brought in the state or federal courts located in
              California, and you consent to their jurisdiction.
            </p>
            <p className={P}>
              [COUNSEL TO CONFIRM: this draft does not include an
              arbitration clause or a class-action waiver — adding either is
              a business decision with real consequences (it trades a court
              proceeding for a private one, and drafting requirements to
              make either enforceable differ by state), not boilerplate to
              inherit by default.]
            </p>

            <h2 className={H}>16. Changes to these terms</h2>
            <p className={P}>
              If we change these terms we will update the effective date at the
              top of this page.
            </p>

            <h2 className={H}>17. Contact us</h2>
            <p className={P}>
              Financial Lending Specialists, Inc. D.B.A. FLS Capital Advisors ·
              [BUSINESS MAILING ADDRESS] · [CONTACT EMAIL]
            </p>
    </>
  );
}
