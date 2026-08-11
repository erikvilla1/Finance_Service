import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, Container, ProgressBar } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { loadApplicationForm } from "@/lib/application-form/load";
import { isFormModule } from "@/lib/application-form/mapping";
import { SectionForm } from "./section-form";

export const metadata: Metadata = {
  title: "Your application",
  robots: { index: false, follow: false },
};

/**
 * One section of the full application.
 *
 * Scoped by profile_id, not left to RLS — the applications policy also admits
 * staff, and this is the applicant's own form. See the sibling documents page
 * for the same reasoning.
 */
export default async function SectionPage({
  params,
}: {
  params: Promise<{ applicationId: string; module: string }>;
}) {
  const { applicationId, module } = await params;

  if (!isFormModule(module)) notFound();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?next=/dashboard");

  const { data: application } = await supabase
    .from("applications")
    .select("id, reference_code")
    .eq("id", applicationId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!application) notFound();

  const form = await loadApplicationForm(applicationId);
  const index = form?.sections.findIndex((s) => s.module === module) ?? -1;

  if (!form || index === -1) notFound();

  const section = form.sections[index];
  const next = form.sections[index + 1];

  return (
    <Container>
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/dashboard/${applicationId}/application`}
          className="text-sm font-semibold text-brand-700 hover:underline"
        >
          ← Your application
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900">
          {section.title}
        </h1>
        {section.description && (
          <p className="mt-2 leading-relaxed text-ink-600">
            {section.description}
          </p>
        )}

        <div className="mt-6">
          <ProgressBar
            value={section.requiredAnswered}
            max={section.requiredTotal}
            label={`Section ${index + 1} of ${form.sections.length}`}
          />
        </div>

        {!form.editable && (
          <div className="mt-6 rounded-lg bg-ink-100 p-4">
            <p className="text-sm leading-relaxed text-ink-700">
              Your application is with a funding source, so it can&apos;t be
              changed here. This is what you told us — if anything needs
              correcting,{" "}
              <Link href="/contact" className="font-semibold text-brand-700 hover:underline">
                your specialist can help
              </Link>
              .
            </p>
          </div>
        )}

        <Card className="mt-6">
          <SectionForm
            applicationId={applicationId}
            module={module}
            questions={section.questions}
            values={section.values}
            readOnly={!form.editable}
          />
        </Card>

        {next && (
          <p className="mt-6 text-sm text-ink-600">
            Next:{" "}
            <Link
              href={`/dashboard/${applicationId}/application/${next.module}`}
              className="font-semibold text-brand-700 hover:underline"
            >
              {next.title}
            </Link>
          </p>
        )}
      </div>
    </Container>
  );
}
