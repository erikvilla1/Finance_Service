import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, Container, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { FCRA_AUTHORIZATION_V1 } from "@/lib/funding-application/consent-text";
import { E_SIGN_CONSENT } from "@/lib/funding-application/sign";
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
    .select("id, reference_code, signature_requested_at")
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
      .select("id, created_at")
      .eq("application_id", applicationId)
      .eq("document_type_key", "signed_application")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <Container>
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-brand-700 hover:underline"
        >
          ← Your applications
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900">
          Sign your application
        </h1>
        <p className="mt-1 font-mono text-sm text-ink-500">
          {application.reference_code}
        </p>

        {signed ? (
          <div className="mt-8">
            <EmptyState
              title="Already signed"
              description="Your signed application is with your specialist. You can see it under your documents."
            />
          </div>
        ) : !application.signature_requested_at ? (
          <div className="mt-8">
            <EmptyState
              title="Not ready to sign yet"
              description="Your specialist will review everything first and let you know when the application is ready for your signature."
            />
          </div>
        ) : (
          <>
            <p className="mt-3 leading-relaxed text-ink-600">
              This is the application that goes to a funding source. Read the
              authorization, add the details below, and sign at the bottom.
            </p>

            <Card className="mt-6">
              <SignForm
                applicationId={applicationId}
                fcra={FCRA_AUTHORIZATION_V1}
                esign={E_SIGN_CONSENT}
                defaultName={owner?.full_name ?? ""}
                defaultTitle={owner?.title ?? ""}
              />
            </Card>

            <p className="mt-6 text-sm leading-relaxed text-ink-600">
              Would you rather sign on paper? There is no charge either way —{" "}
              <Link
                href="/contact"
                className="font-semibold text-brand-700 hover:underline"
              >
                ask your specialist
              </Link>{" "}
              and they will send you a copy to print.
            </p>
          </>
        )}
      </div>
    </Container>
  );
}
