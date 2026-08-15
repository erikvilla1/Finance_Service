import type { Metadata } from "next";
import { Container, Section } from "@/components/ui";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = { title: "Contact" };

/**
 * The contact form now lives here rather than on the home page.
 *
 * WHY IT MOVED. The home page's contact section was removed by request. This
 * page already existed and is already linked from nine places across the app —
 * the dashboard, the application error states, financing options — but it was
 * a placeholder with no form on it. Leaving it that way would have meant the
 * site had no working contact form at all, since the one on the home page was
 * the only one wired to submitContact.
 *
 * WHAT WAS ON THIS PAGE BEFORE. A dashed placeholder box whose visible copy
 * cited "BUSINESS_CONTEXT §5" and "platform spec §4" — internal references
 * rendered to visitors. That is gone; the notes it carried are below so they
 * are not lost:
 *
 *   - Contact details are still pending verification. The source materials
 *     list two different phone numbers, so no number is published here yet.
 *   - Platform spec §4: contact must not become the primary conversion action.
 *     The primary CTA remains "See My Financing Options", which is in the
 *     sticky header on every page and in the hero.
 */
export default function Page() {
  // Per-render token, used to reject a double submit of the same form.
  const submissionToken = crypto.randomUUID();

  return (
    <Section>
      <Container>
        <ContactForm submissionToken={submissionToken} />
      </Container>
    </Section>
  );
}
