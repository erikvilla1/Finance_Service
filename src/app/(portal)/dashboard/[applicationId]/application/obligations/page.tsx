import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, Container } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { isEditable } from "@/lib/application-form/load";
import {
  loadObligations,
  obligationsRequired,
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
    .select("id, reference_code, status, has_existing_mca")
    .eq("id", applicationId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!application) notFound();

  // Not applicable rather than not found: sending them back to the hub explains
  // itself, where a 404 on a link they were given would not.
  if (!obligationsRequired(application)) {
    redirect(`/dashboard/${applicationId}/application`);
  }

  const debts = await loadObligations(applicationId);
  const editable = isEditable(application.status);

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
          Existing obligations
        </h1>
        <p className="mt-2 leading-relaxed text-ink-600">
          You told us the business has an existing advance or loan. Lenders need
          to see what is already owed before they can consider new financing —
          list each one below.
        </p>

        {!editable && (
          <div className="mt-6 rounded-lg bg-ink-100 p-4">
            <p className="text-sm leading-relaxed text-ink-700">
              Your application is with a funding source, so it can&apos;t be
              changed here. This is what you told us — if anything needs
              correcting,{" "}
              <Link
                href="/contact"
                className="font-semibold text-brand-700 hover:underline"
              >
                your specialist can help
              </Link>
              .
            </p>
          </div>
        )}

        <Card className="mt-6">
          <ObligationsForm
            applicationId={applicationId}
            existing={debts}
            readOnly={!editable}
          />
        </Card>

        <p className="mt-6 text-sm leading-relaxed text-ink-600">
          An estimate is fine if you don&apos;t have the exact figure to hand.
          Your specialist will confirm the details against your bank statements.
        </p>
      </div>
    </Container>
  );
}
