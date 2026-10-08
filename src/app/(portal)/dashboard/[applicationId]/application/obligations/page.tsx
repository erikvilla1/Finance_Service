import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { PageHeader, Panel, textLink } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { isEditable } from "@/lib/application-form/load";
import {
  loadObligations,
  obligationsApply,
} from "@/lib/application-form/obligations";
import { ObligationsForm } from "./obligations-form";

export const metadata: Metadata = {
  title: "Existing obligations",
  robots: { index: false, follow: false },
};

/**
 * The business debt schedule.
 *
 * Only reachable when the applicant has said they carry an existing advance or
 * loan — the lender package requires it in exactly that case, and asking a
 * business with no debt to list its debts is a section they cannot complete and
 * will not understand.
 */
export default async function ObligationsPage({
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
    .select("id, status, has_existing_mca, existing_debt_balance")
    .eq("id", applicationId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!application) notFound();

  // Not applicable rather than not found: sending them back to the hub explains
  // itself, where a 404 on a link they were given would not.
  if (!obligationsApply(application)) {
    redirect(`/dashboard/${applicationId}/application`);
  }

  const debts = await loadObligations(applicationId);
  const editable = isEditable(application.status);

  return (
    <div className="mx-auto max-w-3xl">
        <PageHeader
          eyebrow="Your application"
          title="Existing obligations"
          description="You told us the business has existing financing. This section is optional, but a funding source will want to see what is already owed before it considers new financing, so listing each one here saves a round trip later."
        />

        {!editable && (
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

        <Panel className="mt-8">
          <ObligationsForm
            applicationId={applicationId}
            existing={debts}
            readOnly={!editable}
          />
        </Panel>

        <p className="mt-6 pl-3 text-sm leading-relaxed text-ink-600 sm:pl-4">
          An estimate is fine if you don&apos;t have the exact figure to hand.
          Your specialist will confirm the details against your bank statements.
        </p>
    </div>
  );
}
