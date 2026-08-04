import type { Metadata } from "next";
import { Container, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Contact" };

export default function Page() {
  return (
    <>
      <div className="border-b border-ink-200 bg-ink-50">
        <Container>
          <div className="py-16 sm:py-20">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              Contact
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
              Speak with a financing specialist about your situation.
            </p>
          </div>
        </Container>
      </div>
      <Section>
        <Container>
          <div className="rounded-card border border-dashed border-ink-300 bg-ink-50/50 p-10">
            <p className="text-sm leading-relaxed text-ink-600">
              Placeholder. Contact details are pending verification — source materials list two different phone numbers (BUSINESS_CONTEXT §5 critical notice). Note that per platform spec §4, contact must not become the primary conversion action; the primary CTA remains &quot;See My Financing Options&quot;.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
