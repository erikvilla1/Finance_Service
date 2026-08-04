import type { Metadata } from "next";
import { Container, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy Policy" };

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
          </div>
        </Container>
      </div>
      <Section>
        <Container>
          <div className="rounded-card border border-dashed border-ink-300 bg-ink-50/50 p-10">
            <p className="text-sm leading-relaxed text-ink-600">
              PLACEHOLDER — NOT LEGAL LANGUAGE. Platform spec §29 requires counsel-approved wording before launch. This page must address GLBA-style safeguards, data retention, and third-party sharing before the site accepts any real applicant data.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
