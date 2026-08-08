import type { Metadata } from "next";
import Link from "next/link";
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
 * RLS does the real isolation: the query below has no user filter, because
 * "users read own applications" already restricts it to the signed-in person.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: applications } = await supabase
    .from("applications")
    .select("id, reference_code, status, financing_goal, requested_amount, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const list = applications ?? [];

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

                  {view.actionNeeded && (
                    <div className="mt-5 rounded-lg bg-warning-50 p-4">
                      <p className="text-sm font-semibold text-warning-700">
                        Something needs your attention
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-700">
                        Your document checklist will appear here. Uploading is
                        not built yet — your specialist will reach out in the
                        meantime.
                      </p>
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
