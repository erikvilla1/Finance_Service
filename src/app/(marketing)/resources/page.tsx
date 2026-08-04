import type { Metadata } from "next";
import { Container, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Resources" };

export default function Page() {
  return (
    <>
      <div className="border-b border-ink-200 bg-ink-50">
        <Container>
          <div className="py-16 sm:py-20">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              Resources
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
              Educational guides on financing options, qualification, and the application process.
            </p>
          </div>
        </Container>
      </div>
      <Section>
        <Container>
          <div className="rounded-card border border-dashed border-ink-300 bg-ink-50/50 p-10">
            <p className="text-sm leading-relaxed text-ink-600">
              Placeholder. SEO landing pages and educational content are planned per platform spec §31. Content must be genuinely useful and must not keyword-stuff or restate unverified program terms.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
