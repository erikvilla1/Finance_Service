import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, Lock } from "lucide-react";
import { PageHeader, Panel, textLink } from "@/components/portal/ui";
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
    .select("id")
    .eq("id", applicationId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!application) notFound();

  const form = await loadApplicationForm(applicationId);
  const index = form?.sections.findIndex((s) => s.module === module) ?? -1;

  if (!form || index === -1) notFound();

  const section = form.sections[index];
  // Saving goes back to the application overview, not on to the next
  // section. The overview is where the green checks live, and it is what
  // tells someone where they are; being carried straight into section two
  // after saving section one read as the form not having saved (client
  // review, Notion 09.27).
  const nextHref = `/dashboard/${applicationId}/application`;

  return (
    <div className="mx-auto max-w-3xl">
        <PageHeader
          eyebrow={`Your application · Section ${index + 1} of ${form.sections.length}`}
          title={section.title}
          description={section.description}
        />

        <div className="mt-8">
          <SectionSteps applicationId={applicationId} sections={form.sections} current={index} />
        </div>

        {!form.editable && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-white/70 p-4 ring-1 ring-inset ring-ink-200/70">
            <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
            <p className="text-sm leading-relaxed text-ink-700">
              Your application is with a funding source, so it can&apos;t be
              changed here. This is what you told us. If anything needs
              correcting,{" "}
              <Link href="/dashboard/support" className={textLink}>
                your specialist can help
              </Link>
              .
            </p>
          </div>
        )}

        {form.editable && section.requiredTotal > 0 && (
          <p className="mt-6 pl-3 text-sm text-ink-500 sm:pl-4">
            Questions marked <span className="font-semibold text-danger-600">*</span> are
            required; the rest help but can be skipped.{" "}
            <span className="text-ink-700">
              {section.requiredAnswered} of {section.requiredTotal} required answered.
            </span>
          </p>
        )}

        <Panel className="mt-4">
          <SectionForm
            applicationId={applicationId}
            module={module}
            // Every question, hidden ones included — the form decides what to
            // show from what is currently typed, not from what was saved.
            questions={section.allQuestions}
            values={section.values}
            rules={form.rules}
            baseValues={form.allValues}
            readOnly={!form.editable}
            nextHref={nextHref}
            coOwners={section.coOwners}
          />
        </Panel>
    </div>
  );
}

/**
 * Where this section sits in the application: one bar per section, named,
 * each filled by that section's own progress.
 *
 * Replaces a single bar labelled "Section 1 of 3" that was actually filled by
 * the required questions answered in THIS section, next to a bare "6 of 8":
 * two different measures on one line, and it read as neither.
 */
function SectionSteps({
  applicationId,
  sections,
  current,
}: {
  applicationId: string;
  sections: {
    module: string;
    title: string;
    requiredTotal: number;
    requiredAnswered: number;
    complete: boolean;
  }[];
  current: number;
}) {
  return (
    <nav aria-label="Application sections" className="mt-6">
      <p className="text-sm font-medium text-ink-600 sm:hidden">
        Step {current + 1} of {sections.length}
      </p>
      <ol className="mt-2 flex gap-2 sm:mt-0">
        {sections.map((s, i) => {
          const here = i === current;
          const fill = s.requiredTotal > 0 ? s.requiredAnswered / s.requiredTotal : 0;
          return (
            <li key={s.module} className="min-w-0 flex-1">
              <Link
                href={`/dashboard/${applicationId}/application/${s.module}`}
                aria-current={here ? "step" : undefined}
                className="group block"
              >
                <span className={`block h-1.5 overflow-hidden rounded-full ${here ? "bg-ink-300" : "bg-ink-200"}`}>
                  <span
                    className="block h-full rounded-full bg-brand-900 transition-[width] duration-500"
                    style={{ width: `${Math.round(fill * 100)}%` }}
                  />
                </span>
                <span
                  className={`mt-2 hidden items-center gap-1 truncate text-xs sm:flex ${
                    here ? "font-semibold text-ink-900" : "text-ink-500 group-hover:text-ink-800"
                  }`}
                >
                  {s.complete && <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-success-700" strokeWidth={2.5} />}
                  <span className="truncate">
                    {i + 1}. {s.title}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
