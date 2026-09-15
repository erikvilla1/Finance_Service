import type { Metadata } from "next";
import { Container } from "@/components/ui";
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
 *
 * MOVED UNDER (application), NOT (marketing). Same background and header as
 * /start and /sign-in — the warm gradient and the logo-only header — rather
 * than the full marketing site chrome. A legal page someone actually reads
 * (from the sign-in checkbox, from a footer link mid-application) benefits
 * from the same calm, low-navigation surface those flows already use; the
 * tinted hero band the marketing version had is dropped because a flat
 * bg-ink-50 strip with a hard border reads as a box sitting on top of the
 * gradient rather than part of the same surface.
 */
export default function Page() {
  return (
    <Container>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-600">
          How we collect, use, and protect your information.
        </p>
        <p className="mt-3 text-sm text-ink-500">
          Last updated September 14, 2026 · Effective September 14, 2026
        </p>

        <div className="mt-12">
          <PrivacyContent />
        </div>
      </div>
    </Container>
  );
}
