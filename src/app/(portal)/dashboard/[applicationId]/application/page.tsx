import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Badge,
  ButtonLink,
  Card,
  Container,
  EmptyState,
  ProgressBar,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { loadApplicationForm } from "@/lib/application-form/load";
import {
  loadObligations,
  obligationsRequired,
} from "@/lib/application-form/obligations";

export const metadata: Metadata = {
  title: "Your application",
  robots: { index: false, follow: false },
};

/**
 * The full application, section by section.
 *
 * The prequal answered six questions to produce an indicative result. This is
 * the rest — the information a lender actually needs, and the thing that has
 * been collected by phone and email until now (BUSINESS_CONTEXT §3).
 *
 * Split into sections rather than presented as one long form. Forty fields on a
 * single page is a form people abandon; three named sections with visible
 * progress is one they come back to. Every section saves independently, so
 * leaving halfway costs nothing.
 */
export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?next=/dashboard");

  const { data: application } = await supabase
    .from("applications")
    .select("id, reference_code, financing_goal, has_existing_mca")
    .eq("id", applicationId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!application) notFound();

  const form = await loadApplicationForm(applicationId);

  // The debt schedule is not a question, so it cannot come from the question
  // engine — but it is required by the lender package whenever someone says
  // they carry existing debt, and leaving it off this list is what let an
  // applicant be told they were finished while the file could not be sent.
  const needsObligations = obligationsRequired(application);
  const obligations = needsObligations ? await loadObligations(applicationId) : [];
  const obligationsDone = obligations.length > 0;

  if (!form || form.sections.length === 0) {
    return (
      <Container>
        <div className="mx-auto max-w-2xl">
          <BackLink />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900">
            Your application
          </h1>
          <div className="mt-8">
            <EmptyState
              title="Nothing to complete yet"
              description="There's no additional information we need from you right now."
            />
          </div>
        </div>
      </Container>
    );
  }

  const remaining =
    form.requiredTotal -
    form.requiredAnswered +
    (needsObligations && !obligationsDone ? 1 : 0);

  const firstIncomplete = form.sections.find((section) => !section.complete);
  const nextHref =
    firstIncomplete
      ? `/dashboard/${applicationId}/application/${firstIncomplete.module}`
      : needsObligations && !obligationsDone
        ? `/dashboard/${applicationId}/application/obligations`
        : null;

  return (
    <Container>
      <div className="mx-auto max-w-2xl">
        <BackLink />

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900">
          Your application
        </h1>
        <p className="mt-1 font-mono text-sm text-ink-500">
          {application.reference_code}
        </p>

        <Card className="mt-6">
          <p className="text-lg font-semibold text-ink-900">
            {remaining === 0
              ? "Everything we need is here"
              : `${remaining} ${remaining === 1 ? "question" : "questions"} left`}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">
            {remaining === 0
              ? "A specialist will review this alongside your documents."
              : "This is the information a funding source needs to look at your file properly. You can do it in any order and come back as often as you like."}
          </p>

          <div className="mt-5">
            <ProgressBar
              value={
                form.requiredAnswered + (needsObligations && obligationsDone ? 1 : 0)
              }
              max={form.requiredTotal + (needsObligations ? 1 : 0)}
              label="Application complete"
            />
          </div>

          {form.editable && nextHref && (
            <div className="mt-5">
              <ButtonLink href={nextHref}>
                {form.requiredAnswered === 0 ? "Start" : "Pick up where you left off"}
              </ButtonLink>
            </div>
          )}
        </Card>

        <ul className="mt-6 space-y-3">
          {form.sections.map((section, index) => (
            <Card as="li" key={section.module}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-400">
                    Section {index + 1}
                  </p>
                  <h2 className="mt-0.5 text-base font-semibold text-ink-900">
                    <Link
                      href={`/dashboard/${applicationId}/application/${section.module}`}
                      className="hover:text-brand-700 hover:underline"
                    >
                      {section.title}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm text-ink-600">
                    {section.requiredAnswered} of {section.requiredTotal} required
                    answered
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge tone={section.complete ? "success" : section.untouched ? "neutral" : "warning"}>
                    {section.complete
                      ? "Complete"
                      : section.untouched
                        ? "Not started"
                        : "In progress"}
                  </Badge>
                  <Link
                    href={`/dashboard/${applicationId}/application/${section.module}`}
                    className="text-sm font-semibold text-brand-700 hover:underline"
                  >
                    {!form.editable
                      ? "View"
                      : section.untouched
                        ? "Start"
                        : "Continue"}
                  </Link>
                </div>
              </div>
            </Card>
          ))}

          {needsObligations && (
            <Card as="li">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-400">
                    Section {form.sections.length + 1}
                  </p>
                  <h2 className="mt-0.5 text-base font-semibold text-ink-900">
                    <Link
                      href={`/dashboard/${applicationId}/application/obligations`}
                      className="hover:text-brand-700 hover:underline"
                    >
                      Existing obligations
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm text-ink-600">
                    {obligationsDone
                      ? `${obligations.length} listed`
                      : "Needed because you have an existing advance or loan"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge tone={obligationsDone ? "success" : "warning"}>
                    {obligationsDone ? "Complete" : "Not started"}
                  </Badge>
                  <Link
                    href={`/dashboard/${applicationId}/application/obligations`}
                    className="text-sm font-semibold text-brand-700 hover:underline"
                  >
                    {!form.editable ? "View" : obligationsDone ? "Edit" : "Start"}
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </ul>

        <p className="mt-8 text-sm leading-relaxed text-ink-600">
          Some of this is personal information. It is stored securely, used only
          to review your application, and never shown publicly.
        </p>
      </div>
    </Container>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard"
      className="text-sm font-semibold text-brand-700 hover:underline"
    >
      ← Your applications
    </Link>
  );
}
