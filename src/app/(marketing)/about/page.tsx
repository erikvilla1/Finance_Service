import type { Metadata } from "next";
import { Container, Section } from "@/components/ui";

export const metadata: Metadata = { title: "About Us" };

export default function Page() {
  return (
    <>
      <div className="border-b border-ink-200 bg-ink-50">
        <Container>
          <div className="py-16 sm:py-20">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              About Us
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
              Financial Lending Specialists helps businesses, investors, and professionals explore financing for opportunities that don&apos;t always fit traditional lending programs.
            </p>
          </div>
        </Container>
      </div>
      <Section>
        <Container>
          <div className="rounded-card border border-dashed border-ink-300 bg-ink-50/50 p-10">
            <p className="text-sm leading-relaxed text-ink-600">
              Placeholder. Company story, team, and differentiators are pending the brand and ICP positioning session (BUSINESS_CONTEXT §13.3). Do not publish claims about lender counts, years in business, or volume until verified.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
