import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadFundingApplication } from "@/lib/funding-application/load";
import { FundingApplicationSheet } from "@/components/application/funding-application-sheet";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: "Funding Application",
  robots: { index: false, follow: false },
};

/**
 * The funding application, prefilled and ready to print.
 *
 * Deliberately not a server-generated PDF. Print-to-PDF from the browser needs
 * no headless Chrome, no vendor, and no serverless bundle bloat, and it
 * produces a real PDF today.
 *
 * The form itself lives in FundingApplicationSheet, shared with the portal's
 * sign page so the paper copy and the reviewed copy are the same document.
 */
export default async function PrintApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/admin/applications/${id}/print`);

  const data = await loadFundingApplication(id);
  if (!data) notFound();

  return (
    <div className="print-page mx-auto max-w-[8.5in] bg-white p-8 text-ink-900 print:p-0">
      <div className="mb-6 print:hidden">
        <PrintButton />
        {/*
          This page is now the paper fallback, not the main route.

          Signing happens in the portal: "Send for signature" on the application
          releases it, the applicant signs there, and a PDF with the mark, the
          consents and an audit trail is generated and filed automatically.

          This exists for the applicant who would rather sign by hand — which
          ESIGN requires being offered at no charge, and which the signing page
          says in as many words.
        */}
        <p className="mt-2 text-sm text-ink-600">
          The paper route. Most applicants sign in the portal — use{" "}
          <strong>Send for signature</strong> on the application instead. Print
          this only for someone who has asked to sign by hand; they complete Tax
          ID, SSN and signature on the printed copy, and it comes back as an
          upload against the signed application.
        </p>
      </div>

      <FundingApplicationSheet
        context={data.context}
        debts={data.debts}
        referenceCode={data.referenceCode}
        mode="paper"
      />
    </div>
  );
}
