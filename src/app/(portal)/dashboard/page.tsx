import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Badge,
  ButtonLink,
  Card,
  Container,
  EmptyState,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import {
  CUSTOMER_STAGES,
  CUSTOMER_STAGE_LABELS,
  customerStatus,
} from "@/lib/customer-status";
import { formatCurrency, formatDate } from "@/lib/crm";
import { loadLeadSummaries } from "@/lib/leads";

/**
 * One half of what we are waiting for, as a tile.
 *
 * Reads "Complete" rather than "5 of 5" when it is done. A ratio is what you
 * need while there is work left; once there isn't, the only thing worth saying
 * is that there isn't.
 */
function ProgressTile({
  href,
  label,
  done,
  total,
}: {
  href: string;
  label: string;
  done: number;
  total: number;
}) {
  const complete = total > 0 && done === total;
  const started = done > 0;

  return (
    <Link
      href={href}
      className="block rounded-lg p-4 ring-1 ring-inset ring-ink-200 transition-colors hover:bg-ink-50 hover:ring-brand-300"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink-900">{label}</span>
        <span
          className={
            complete
              ? "text-xs font-semibold text-success-700"
              : started
                ? "text-xs font-semibold text-warning-700"
                : "text-xs font-semibold text-ink-500"
          }
        >
          {complete ? "Complete" : started ? "In progress" : "Not started"}
        </span>
      </span>

      <span className="mt-2 block h-2 w-full overflow-hidden rounded-full bg-ink-200">
        <span
          className={
            complete
              ? "block h-full rounded-full bg-success-600"
              : "block h-full rounded-full bg-brand-600"
          }
          style={{ width: total > 0 ? `${(done / total) * 100}%` : "0%" }}
        />
      </span>

      <span className="mt-1.5 block text-xs tabular-nums text-ink-500">
        {total === 0 ? "Nothing needed yet" : `${done} of ${total}`}
      </span>
    </Link>
  );
}

export const metadata: Metadata = {
  title: "Your applications",
  robots: { index: false, follow: false },
};

/**
 * The applicant's view of their own file.
 *
 * Everything renders through customerStatus(), which collapses the sixteen
 * internal stages to five. Nothing on this page reads the raw status directly —
 * that is the mechanism keeping internal state off a customer's screen
 * (spec §18), and it should stay that way.
 *
 * THE PROFILE FILTER BELOW IS NOT REDUNDANT, though it reads that way. The
 * policy behind it is `profile_id = auth.uid() or public.is_staff()`, so RLS
 * answers "may this person see this row", not "is this person the applicant".
 * The moment the first staff account existed, the unfiltered version of this
 * query started rendering every applicant's file inside the customer portal —
 * not a leak, since staff are entitled to that data, but the wrong data on the
 * wrong screen, and one refactor away from being shown to the wrong person.
 *
 * Staff are deliberately not redirected away from here. A specialist can also
 * be a customer, and /admin is where they go to see other people's files.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The layout already redirected an unauthenticated visitor. This is belt and
  // braces: without a user id the filter below would be silently dropped.
  if (!user) redirect("/sign-in?next=/dashboard");

  const { data: applications } = await supabase
    .from("applications")
    .select(
      "id, reference_code, status, financing_goal, requested_amount, created_at, profile_id, business_id",
    )
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const list = applications ?? [];

  // One pass for every card rather than a lookup per card. Carries the business
  // name and both progress counts, which is everything a card needs.
  const summaries = await loadLeadSummaries(supabase, list);

  return (
    <Container>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">
          Your applications
        </h1>

        {list.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="Nothing here yet"
              description="When you start an application it will appear here, along with anything we need from you."
              action={<ButtonLink href="/start">See my financing options</ButtonLink>}
            />
          </div>
        ) : (
          <ul className="mt-8 space-y-5">
            {list.map((application) => {
              const view = customerStatus(application.status);
              const lead = summaries.get(application.id);
              const outstanding = lead?.docsOutstanding ?? 0;
              const settled = lead?.docsSettled ?? 0;

              return (
                <Card as="li" key={application.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      {/*
                        The reference code is ours, not theirs. An applicant
                        knows their own company; FLS-2026-000011 is a filing
                        number that means something to a specialist and nothing
                        to the person who typed the form. It still exists on the
                        application and documents pages, where someone might be
                        reading it out on a call.
                      */}
                      <h2 className="text-lg font-semibold text-ink-900">
                        {lead?.businessName ?? (
                          <Link
                            href={`/dashboard/${application.id}/application/core_business`}
                            className="text-accent-700 hover:underline"
                          >
                            Add your business name
                          </Link>
                        )}
                      </h2>
                      <p className="mt-1 text-sm text-ink-600">
                        {application.financing_goal ?? "Financing application"} ·{" "}
                        {formatCurrency(application.requested_amount)} · started{" "}
                        {formatDate(application.created_at)}
                      </p>
                    </div>
                    <Badge tone={view.actionNeeded ? "warning" : "brand"}>
                      {view.label}
                    </Badge>
                  </div>

                  {/* Progress track — five stages, not sixteen. */}
                  <ol className="mt-6 flex items-center gap-1" aria-label="Progress">
                    {CUSTOMER_STAGES.map((stage, index) => {
                      const reached = index < view.step;
                      const current = index === view.step - 1;
                      return (
                        <li key={stage} className="flex flex-1 items-center gap-1">
                          <span
                            aria-current={current ? "step" : undefined}
                            className={
                              reached
                                ? "h-1.5 w-full rounded-full bg-brand-600"
                                : "h-1.5 w-full rounded-full bg-ink-200"
                            }
                          />
                        </li>
                      );
                    })}
                  </ol>
                  <div className="mt-2 flex justify-between text-xs text-ink-500">
                    <span>{CUSTOMER_STAGE_LABELS[CUSTOMER_STAGES[0]]}</span>
                    <span>
                      {CUSTOMER_STAGE_LABELS[
                        CUSTOMER_STAGES[CUSTOMER_STAGES.length - 1]
                      ]}
                    </span>
                  </div>

                  <p className="mt-5 leading-relaxed text-ink-700">
                    {view.description}
                  </p>

                  {/*
                    The two halves of what we need, side by side and phrased the
                    same way. Previously the card only mentioned documents, so
                    someone who had finished those saw nothing about the
                    half-empty application form and reasonably assumed they were
                    done.
                  */}
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <ProgressTile
                      href={`/dashboard/${application.id}/application`}
                      label="Your application"
                      done={lead?.formAnswered ?? 0}
                      total={lead?.formRequired ?? 0}
                    />
                    <ProgressTile
                      href={`/dashboard/${application.id}/documents`}
                      label="Your documents"
                      done={settled}
                      total={lead?.docsTotal ?? 0}
                    />
                  </div>

                  {/*
                    Being finished is worth saying out loud. Previously this box
                    simply disappeared once everything was accepted, so the only
                    difference between "your documents were approved" and
                    "nothing has happened yet" was the absence of a warning —
                    which is not something anyone notices.
                  */}
                  {outstanding === 0 && settled > 0 && !view.actionNeeded && (
                    <div className="mt-5 rounded-lg bg-success-50 p-4">
                      <p className="text-sm font-semibold text-success-700">
                        Your documents have been accepted
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-700">
                        Your specialist has everything they asked for. Nothing
                        needed from you right now.
                      </p>
                    </div>
                  )}

                  {/* The checklist and the pipeline stage can disagree — a
                      specialist can request a document without moving the file,
                      and a stage can advance while an item is still open. The
                      checklist is the concrete one, so it wins the wording and
                      the stage only widens when the box appears. */}
                  {(outstanding > 0 || view.actionNeeded) && (
                    <div className="mt-5 rounded-lg bg-warning-50 p-4">
                      <p className="text-sm font-semibold text-warning-700">
                        {outstanding === 0
                          ? "Something needs your attention"
                          : outstanding === 1
                            ? "One document still to send"
                            : `${outstanding} documents still to send`}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-700">
                        {outstanding === 0
                          ? "Your specialist will be in touch about what's needed."
                          : "Sending these is usually what moves a file forward fastest."}
                      </p>
                      {outstanding > 0 && (
                        <div className="mt-3">
                          <ButtonLink
                            href={`/dashboard/${application.id}/documents`}
                            size="sm"
                          >
                            Send documents
                          </ButtonLink>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-5 border-t border-ink-100 pt-4">
                    <p className="text-sm text-ink-600">
                      Questions about this application?{" "}
                      <Link
                        href="/contact"
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        Talk with your specialist
                      </Link>
                    </p>
                  </div>
                </Card>
              );
            })}
          </ul>
        )}
      </div>
    </Container>
  );
}
