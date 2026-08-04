import type { Metadata } from "next";
import { Container, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Disclosures" };

export default function Page() {
  return (
    <>
      <div className="border-b border-ink-200 bg-ink-50">
        <Container>
          <div className="py-16 sm:py-20">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              Disclosures
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
              Important information about our role and the financing process.
            </p>
          </div>
        </Container>
      </div>
      <Section>
        <Container>
          <div className="rounded-card border border-dashed border-ink-300 bg-ink-50/50 p-10">
            <p className="text-sm leading-relaxed text-ink-600">
              PLACEHOLDER — NOT LEGAL LANGUAGE. Must state FLS&apos;s role (broker, lead generator, or originator), state licensing coverage, and that nothing on the site is a commitment to lend. FCRA authorization language already exists in Robert&apos;s application PDFs and should be reused, not rewritten (BUSINESS_CONTEXT §12).
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
