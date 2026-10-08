import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { customerStatus } from "@/lib/customer-status";
import { formatDate } from "@/lib/crm";
import { loadLeadSummaries } from "@/lib/leads";
import { loadChecklist } from "@/lib/documents/checklist";
import { buildActivity, timeAgo } from "@/lib/activity";
import {
  AttentionBanner,
  Checklist,
  FileDetails,
  Greeting,
  NextStepCard,
  RecentActivity,
  StatusCard,
  WhatsNext,
  greetingLine,
  nextStepFor,
  readinessPercent,
} from "@/components/portal/overview";
import { FirstRunTour } from "@/components/portal/first-run-tour";

export const metadata: Metadata = {
  title: "Your dashboard",
  robots: { index: false, follow: false },
};

/**
 * The applicant's overview: where their file stands, the one thing to do
 * next, and what's done.
 *
 * WHAT CHANGED. The card this replaces showed a five-segment bar labelled only
 * at its two ends, a status badge, two progress tiles and up to three coloured
 * boxes, so the answer to "what's happening and what do I do?" was spread over
 * six elements that could disagree. Now:
 *
 *   1. STATUS. Four labelled steps with "you are here". The old fifth stage,
 *      "we need a few things", wasn't a step every file passes through, so a
 *      file that never needed anything showed it as done; it's now a flag on
 *      the review step instead of a place on the line.
 *   2. NEXT STEP. Exactly one, with one button, in priority order: sign (when
 *      asked), finish the application, send documents, or nothing needed.
 *   3. CHECKLIST. The same items as quiet rows with their progress.
 *
 * Everything still renders through customerStatus(), so no internal stage or
 * vocabulary reaches the screen (spec §18). The profile filter stays for the
 * reason the old page gave: RLS answers "may see", not "is theirs".
 */

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/dashboard");

  const [{ data: profile }, { data: applications }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase
      .from("applications")
      .select(
        "id, status, financing_goal, requested_amount, created_at, profile_id, business_id, signature_requested_at, has_existing_mca",
      )
      .eq("profile_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const list = applications ?? [];
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? null;

  if (list.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <Greeting firstName={firstName} line="Let's find the right financing for your business." />
        <div className="mt-8 rounded-3xl bg-white/80 p-8 text-center ring-1 ring-inset ring-ink-200/70 backdrop-blur sm:p-12">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent-100 text-accent-800">
            <Sparkles className="h-5 w-5" />
          </span>
          <h2 className="mt-5 text-xl font-bold tracking-tight text-ink-900">No applications yet</h2>
          <p className="mx-auto mt-2 max-w-md leading-relaxed text-ink-600">
            Answer a few questions and we&apos;ll show you which financing options may fit.
            It takes a couple of minutes and doesn&apos;t affect your credit.
          </p>
          <div className="mt-6 flex justify-center">
            <ButtonLink href="/start" variant="contrast" size="lg">
              See my financing options
            </ButtonLink>
          </div>
        </div>
        <FirstRunTour userId={user.id} firstName={firstName} />
      </div>
    );
  }

  const summaries = await loadLeadSummaries(supabase, list);

  // A copy the specialist sent back doesn't count as signed.
  const { data: signedDocuments } = await supabase
    .from("documents")
    .select("application_id")
    .in("application_id", list.map((application) => application.id))
    .eq("document_type_key", "signed_application")
    .neq("status", "rejected")
    .is("deleted_at", null);
  const signed = new Set((signedDocuments ?? []).map((d) => d.application_id));

  // What the applicant has done, so a finished draft reads as In review (see
  // customerStatus): every question answered and every document sent. The
  // existing-obligations schedule is optional and is not counted here; the
  // application overview is where it is offered.
  const progressOf = (application: (typeof list)[number]) => {
    const summary = summaries.get(application.id);
    if (!summary) return undefined;
    return {
      applicationDone:
        summary.formRequired > 0 && summary.formAnswered >= summary.formRequired,
      documentsSent: summary.docsOutstanding === 0,
    };
  };

  const [current, ...others] = list;
  const lead = summaries.get(current.id);

  // The current file's documents (for the activity feed and any "send another
  // copy" banner) and when its form was last saved. Reads only.
  const [checklist, { data: lastAnswer }, { data: business }] = await Promise.all([
    loadChecklist(supabase, current.id),
    supabase
      .from("application_answers")
      .select("updated_at")
      .eq("application_id", current.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    current.business_id
      ? supabase.from("businesses").select("updated_at").eq("id", current.business_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const formUpdatedAt =
    [lastAnswer?.updated_at, business?.updated_at].filter((v): v is string => Boolean(v)).sort().pop() ?? null;
  const activity = buildActivity({
    startedAt: current.created_at,
    applicationUpdatedAt: formUpdatedAt,
    applicationComplete: Boolean(progressOf(current)?.applicationDone),
    items: (checklist?.items ?? []).map((item) => ({ label: item.label, documents: item.documents })),
  }).map((event) => ({ ...event, when: timeAgo(event.at) }));
  const returned = (checklist?.items ?? [])
    .filter((item) => item.status === "rejected")
    .map((item) => ({
      label: item.label,
      note: item.documents.find((d) => d.status === "rejected")?.note ?? null,
    }));
  const view = customerStatus(current.status, progressOf(current));
  const next = nextStepFor(current, lead, view.actionNeeded, signed.has(current.id));

  return (
    <div className="mx-auto max-w-5xl">
      <Greeting firstName={firstName} line={greetingLine(view.stage, readinessPercent(lead))} />

      {returned.length > 0 && (
        <div className="mt-8">
          <AttentionBanner applicationId={current.id} items={returned} />
        </div>
      )}

      <div className={`${returned.length > 0 ? "mt-6" : "mt-8"} grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]`}>
        <div className="min-w-0 space-y-6">
          <StatusCard stage={view.stage} label={view.label} description={view.description} actionNeeded={view.actionNeeded} />
          <NextStepCard step={next} />
          <Checklist
            applicationId={current.id}
            lead={lead}
            signatureRequested={Boolean(current.signature_requested_at)}
            signed={signed.has(current.id)}
          />
        </div>

        <aside className="space-y-6">
          <FileDetails
            applicationId={current.id}
            businessName={lead?.businessName ?? null}
            goal={current.financing_goal}
            amount={current.requested_amount}
            started={current.created_at}
          />
          <WhatsNext stage={view.stage} />
          <RecentActivity events={activity} />
        </aside>
      </div>

      {others.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-500">
            Other applications
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {others.map((application) => {
              const other = customerStatus(application.status, progressOf(application));
              return (
                <li key={application.id}>
                  <Link
                    href={`/dashboard/${application.id}/application`}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 p-4 ring-1 ring-inset ring-ink-200/70 transition-colors hover:bg-white"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink-900">
                        {summaries.get(application.id)?.businessName ??
                          application.financing_goal ??
                          "Financing application"}
                      </span>
                      <span className="block text-xs text-ink-500">
                        {other.label} · started {formatDate(application.created_at)}
                      </span>
                    </span>
                    <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* The first-visit spotlight. It lives here, on the page it points at,
          so everything it highlights is already on screen when it starts. */}
      <FirstRunTour userId={user.id} firstName={firstName} />
    </div>
  );
}
