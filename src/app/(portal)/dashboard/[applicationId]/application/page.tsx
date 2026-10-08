import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Check, FileText, ShieldCheck } from "lucide-react";
import { PageHeader, Panel, Pill, primaryButton } from "@/components/portal/ui";
import { SignNowButton } from "@/components/portal/sign-now-button";
import { createClient } from "@/lib/supabase/server";
import { loadApplicationForm } from "@/lib/application-form/load";
import {
  loadObligations,
  obligationsApply,
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
 * progress is one they come back to. Every section saves as it's filled in
 * (see section-form.tsx), so leaving halfway costs nothing.
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
    .select("id, financing_goal, has_existing_mca, existing_debt_balance, signature_requested_at")
    .eq("id", applicationId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!application) notFound();

  const form = await loadApplicationForm(applicationId);

  // The debt schedule is not a question, so it cannot come from the question
  // engine. It is offered to anyone who has said the business carries
  // existing financing, and it is OPTIONAL: it never counts towards the
  // questions left or holds back a green check (client review, Notion
  // 09.27). It sits in the list so it is found, marked so it is not mistaken
  // for a requirement.
  const offersObligations = obligationsApply(application);
  const obligations = offersObligations ? await loadObligations(applicationId) : [];
  const obligationsDone = obligations.length > 0;

  if (!form || form.sections.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Your application" />
        <Panel className="mt-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-ink-100 text-ink-600">
            <FileText aria-hidden="true" className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-ink-900">Nothing to complete yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-600">
            There&apos;s no additional information we need from you right now.
          </p>
        </Panel>
      </div>
    );
  }

  const remaining = form.requiredTotal - form.requiredAnswered;
  const done = form.requiredAnswered;
  const total = form.requiredTotal;

  const firstIncomplete = form.sections.find((section) => !section.complete);
  const nextHref = firstIncomplete
    ? `/dashboard/${applicationId}/application/${firstIncomplete.module}`
    : null;

  // One list for the sections and, when it applies, the obligations schedule,
  // so it is found where the rest of the application is — labelled optional,
  // because it is.
  const rows: {
    key: string;
    href: string;
    title: string;
    answered?: number;
    required?: number;
    detail?: string;
    state: "done" | "progress" | "todo" | "optional";
  }[] = [
    ...form.sections.map((section) => ({
      key: section.module,
      href: `/dashboard/${applicationId}/application/${section.module}`,
      title: section.title,
      answered: section.requiredAnswered,
      required: section.requiredTotal,
      state: section.complete
        ? ("done" as const)
        : section.untouched
          ? ("todo" as const)
          : ("progress" as const),
    })),
    ...(offersObligations
      ? [
          {
            key: "obligations",
            href: `/dashboard/${applicationId}/application/obligations`,
            title: "Existing obligations",
            detail: obligationsDone
              ? `${obligations.length} listed`
              : "Optional. Listing what the business already owes saves a round trip later.",
            state: obligationsDone ? ("done" as const) : ("optional" as const),
          },
        ]
      : []),
  ];

  const status = {
    done: { tone: "done" as const, label: "Complete" },
    progress: { tone: "progress" as const, label: "In progress" },
    todo: { tone: "todo" as const, label: "Not started" },
    optional: { tone: "todo" as const, label: "Optional" },
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Your application"
        description={
          remaining === 0
            ? "Everything we need is here. You can still edit any section."
            : "A few short sections about your business. Your answers save as you go, so you can do this in more than one sitting."
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel aria-labelledby="sections-title" className="min-w-0">
          <h2 id="sections-title" className="text-base font-semibold text-ink-900">
            Sections
          </h2>
          <ol className="mt-4 divide-y divide-ink-100">
            {rows.map((row, index) => (
              <li key={row.key}>
                <Link
                  href={row.href}
                  className="group -mx-3 flex items-center gap-4 rounded-2xl px-3 py-4 transition-colors hover:bg-ink-900/[0.03]"
                >
                  <span
                    aria-hidden="true"
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-semibold ${
                      row.state === "done" ? "bg-success-50 text-success-700" : "bg-ink-100 text-ink-600"
                    }`}
                  >
                    {row.state === "done" ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-semibold text-ink-900">{row.title}</span>
                      <Pill tone={status[row.state].tone}>{status[row.state].label}</Pill>
                    </span>
                    {row.required !== undefined && row.required > 0 ? (
                      <span className="mt-2 flex items-center gap-3">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                          <span
                            className={`block h-full rounded-full ${row.state === "done" ? "bg-success-600" : "bg-brand-900"}`}
                            style={{ width: `${Math.round(((row.answered ?? 0) / row.required) * 100)}%` }}
                          />
                        </span>
                        <span className="min-w-12 whitespace-nowrap text-right text-xs tabular-nums text-ink-500">
                          {row.answered} of {row.required}
                        </span>
                      </span>
                    ) : (
                      row.detail && <span className="mt-1 block text-xs text-ink-500">{row.detail}</span>
                    )}
                  </span>
                  <span className="hidden w-16 shrink-0 text-right text-sm font-semibold text-brand-900 group-hover:underline sm:block">
                    {!form.editable
                      ? "View"
                      : row.state === "done"
                        ? "Edit"
                        : row.state === "todo"
                          ? "Start"
                          : row.state === "optional"
                            ? "Add"
                            : "Continue"}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-600 sm:hidden"
                  />
                </Link>
              </li>
            ))}
          </ol>
        </Panel>

        <aside className="space-y-6">
          <Panel className="sm:p-6">
            <p className="text-base font-semibold text-ink-900">
              {remaining === 0
                ? "Everything we need is here"
                : `${remaining} ${remaining === 1 ? "question" : "questions"} left`}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-600">
              {remaining === 0
                ? application.signature_requested_at
                  ? "Robert reviews the signed application alongside your documents."
                  : "Sign it when you are ready. Robert reviews the signed application alongside your documents."
                : "Do the sections in any order and come back as often as you like."}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                <span
                  className={`block h-full rounded-full ${remaining === 0 ? "bg-success-600" : "bg-brand-900"}`}
                  style={{ width: `${Math.round((done / Math.max(total, 1)) * 100)}%` }}
                />
              </span>
              <span className="whitespace-nowrap text-xs tabular-nums text-ink-500">
                {done} of {total}
              </span>
            </div>
            {form.editable && nextHref && (
              <Link href={nextHref} className={`${primaryButton} mt-5 w-full`}>
                {form.requiredAnswered === 0 ? "Start" : "Pick up where you left off"}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            )}
            {form.editable && remaining === 0 && (
              <SignNowButton
                applicationId={applicationId}
                label={application.signature_requested_at ? "Review and sign" : "Sign now"}
                className="mt-5"
              />
            )}
          </Panel>

          <Panel className="flex items-start gap-3 sm:p-6">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
            <p className="text-sm leading-relaxed text-ink-600">
              Some of this is personal information. It&apos;s stored securely, used
              only to review your application, and never shown publicly.
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
