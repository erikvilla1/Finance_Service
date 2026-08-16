import type { Metadata } from "next";
import { Container, Section } from "@/components/ui";
import { PrivacyContent } from "@/components/legal/privacy-content";

export const metadata: Metadata = { title: "Privacy Policy" };

/**
 * ⚠️  DRAFT — NOT REVIEWED BY COUNSEL. Platform spec §29.
 *
 * WHAT THIS IS. A substantive first draft written from what the application
 * actually does, not from a template. Every factual claim below was checked
 * against the schema and the code:
 *
 *   - the data listed in "What we collect" is the union of contact_submissions,
 *     profiles, businesses, application_owners, documents and consents;
 *   - "we store only the last four digits" is true — funding-application/fields
 *     marks the full SSN as signer-input, never persisted, and the only stored
 *     column is owner.ssn_last4;
 *   - "no advertising or analytics trackers" is true as of this commit: there
 *     is no gtag, GA, Segment, PostHog, Meta pixel or similar anywhere in src/,
 *     and the only cookies set are Supabase's auth cookies;
 *   - the consents table records IP address and user agent, so that is
 *     disclosed rather than omitted.
 *
 * WHY IT STILL NEEDS A LAWYER. A privacy policy is a representation about a
 * company's actual practices. Getting it wrong is a deceptive act under FTC Act
 * §5 regardless of intent. The parts I cannot verify from code are marked in
 * [BRACKETS] on the page — they are deliberately visible so this cannot ship
 * unnoticed. Retention periods, the legal entity, the state-law rights section
 * and any sale/sharing of data are Robert's facts to state, not mine to guess.
 *
 * ALSO OUTSTANDING: if FLS serves California or other states with commercial
 * financing disclosure laws, this policy is not the whole obligation. See the
 * note on /disclosures.
 */


export default function Page() {
  return (
    <>
      <div className="border-b border-ink-200 bg-ink-50">
        <Container>
          <div className="py-16 sm:py-20">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
              How we collect, use, and protect your information.
            </p>
            <p className="mt-3 text-sm text-ink-500">
              Last updated [DATE] · Effective [DATE]
            </p>
          </div>
        </Container>
      </div>

      <Section>
        <Container>
          <div className="max-w-3xl">
          <PrivacyContent />
          </div>
        </Container>
      </Section>
    </>
  );
}
