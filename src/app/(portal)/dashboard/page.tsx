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
import { loadOutstandingCounts } from "@/lib/documents/checklist";

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
    .select("id, reference_code, status, financing_goal, requested_amount, created_at")
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const list = applications ?? [];

  // One query for every card rather than one per card. The dashboard is the
  // first thing someone sees after signing in, and it is the only place the
  // outstanding count appears before they have decided to go looking for it.
  const outstandingByApplication = await loadOutstandingCounts(
    supabase,
    list.map((application) => application.id),
  );

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
              const outstanding =
                outstandingByApplication.get(application.id) ?? 0;

              return (
                <Card as="li" key={application.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm text-ink-500">
                        {application.reference_code}
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-ink-900">
                        {application.financing_goal ?? "Financing application"}
                      </h2>
                      <p className="mt-1 text-sm text-ink-600">
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

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
                    <p className="text-sm text-ink-600">
                      Questions about this application?{" "}
                      <Link
                        href="/contact"
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        Talk with your specialist
                      </Link>
                    </p>
                    <Link
                      href={`/dashboard/${application.id}/documents`}
                      className="text-sm font-semibold text-brand-700 hover:underline"
                    >
                      Your documents
                    </Link>
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
