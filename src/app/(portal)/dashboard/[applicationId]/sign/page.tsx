import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { CircleAlert, CircleCheck, Hourglass } from "lucide-react";
import { PageHeader, Panel } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { FCRA_AUTHORIZATION_V1 } from "@/lib/funding-application/consent-text";
import { E_SIGN_CONSENT } from "@/lib/funding-application/sign";
import { loadFundingApplication } from "@/lib/funding-application/load";
import { FundingApplicationSheet } from "@/components/application/funding-application-sheet";
import { SignForm } from "./sign-form";

export const metadata: Metadata = {
  title: "Sign your application",
  robots: { index: false, follow: false },
};

/**
 * Reviewing and signing the funding application.
 *
 * Reachable only once a specialist has released it. A client signing a document
 * before Robert has read it is worse than a client waiting a day — he knows
 * things about the file that the completeness check does not.
 *
 * THE DOCUMENT IS ON THE PAGE. The prefilled funding application — the same
 * sheet the print route produces and the same layout the signed PDF will carry
 * — is rendered above the signature form. A signature against a document the
 * signer never saw is the weakest kind, and "review and sign" has to mean both
 * words.
 *
 * A SENT-BACK SIGNATURE REOPENS THIS PAGE. When a specialist returns the
 * signed application, the fix is to sign again — not to upload a file, which
 * is the paper route. Only the LATEST signed document decides: an earlier
 * rejected copy under a good one is history, not an open task. The reason the
 * specialist wrote travels to the top of the page, because signing again
 * without knowing what was wrong produces the same document again.
 */
export default async function SignPage({
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
    .select("id, signature_requested_at")
    .eq("id", applicationId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!application) notFound();

  const [{ data: owner }, { data: signed }] = await Promise.all([
    supabase
      .from("application_owners")
      .select("full_name, title")
      .eq("application_id", applicationId)
      .eq("is_primary", true)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("id, created_at, status, verification_note")
      .eq("application_id", applicationId)
      .eq("document_type_key", "signed_application")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // A signature that came back is not a signature we hold. The latest copy
  // governs; its rejection reopens the flow.
  const returned = signed?.status === "rejected" ? signed : null;
  const alreadySigned = Boolean(signed) && !returned;

  const readyToSign =
    Boolean(application.signature_requested_at) && !alreadySigned;

  // Loaded only when there is something to review — through the signed-in
  // user's client, so RLS scopes it to their own file.
  const data = readyToSign ? await loadFundingApplication(applicationId) : null;

  return (
    <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Sign your application"
          description={
            alreadySigned || !application.signature_requested_at
              ? undefined
              : "This is the application that goes to a funding source, prefilled from what you've told us. Review it, then read the authorization, add the details below, and sign at the bottom."
          }
        />

        {alreadySigned ? (
          <SignState
            icon={<CircleCheck aria-hidden="true" className="h-5 w-5" />}
            tone="done"
            title="Already signed"
            description="Your signed application is with your specialist. You can see it under your documents."
          />
        ) : !application.signature_requested_at ? (
          <SignState
            icon={<Hourglass aria-hidden="true" className="h-5 w-5" />}
            tone="waiting"
            title="Not ready to sign yet"
            description="Your specialist will review everything first and let you know when the application is ready for your signature."
          />
        ) : (
          <>
            {returned && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-warning-50 p-4 ring-1 ring-inset ring-warning-600/20">
                <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning-700" />
                <div>
                  <p className="text-sm font-semibold text-warning-700">Your specialist needs you to sign again</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-700">
                    {returned.verification_note ??
                      "Something on the signed copy needs another look. Review the application below and sign it again."}
                  </p>
                </div>
              </div>
            )}

            <p className="mt-4 pl-3 text-sm leading-relaxed text-ink-500 sm:pl-4">
              Tax ID and Social Security number are added when you sign. They
              appear on the signed document only.
            </p>

            {data && (
              <Panel className="mt-6 overflow-x-auto bg-white">
                <FundingApplicationSheet
                  context={data.context}
                  debts={data.debts}
                  referenceCode={data.referenceCode}
                  mode="review"
                />
              </Panel>
            )}

            <Panel className="mt-6">
              <SignForm
                applicationId={applicationId}
                fcra={FCRA_AUTHORIZATION_V1}
                esign={E_SIGN_CONSENT}
                defaultName={owner?.full_name ?? ""}
                defaultTitle={owner?.title ?? ""}
              />
            </Panel>
          </>
        )}
    </div>
  );
}

function SignState({
  icon,
  tone,
  title,
  description,
}: {
  icon: ReactNode;
  tone: "done" | "waiting";
  title: string;
  description: string;
}) {
  return (
    <Panel className="mt-8 text-center">
      <span
        className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl ${
          tone === "done" ? "bg-success-50 text-success-700" : "bg-ink-100 text-ink-600"
        }`}
      >
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-bold text-ink-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-600">{description}</p>
    </Panel>
  );
}
