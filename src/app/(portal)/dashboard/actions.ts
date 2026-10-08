"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isEditable } from "@/lib/application-form/load";
import { assessCompleteness } from "@/lib/funding-application/completeness";
import { loadFundingApplication } from "@/lib/funding-application/load";
import { notifySignatureRequested } from "@/lib/email/notifications";

/**
 * The applicant releases their own application for signature.
 *
 * Until the client review (Notion 09.27) only a specialist could do this,
 * from the admin file, on the reasoning that Robert knows things about a
 * file the completeness check does not. The client asked for the other
 * order: once every section is complete, a sign-now button, which also
 * sends the email with the signing link. The specialist's review moves to
 * the signed document — it lands on the checklist like any other, and a
 * copy with a problem is returned with a reason (notifyDocumentReturned),
 * which reopens signing.
 *
 * WHY THE SERVICE ROLE. Migration 0030's guard refuses a customer writing
 * signature_requested_at through their own client — correctly, since it
 * also keeps them from un-requesting one a specialist set. This action is
 * the one sanctioned path round it: ownership and completeness are checked
 * first, against the caller's own client, and only then does the trusted
 * client write the two columns and nothing else.
 *
 * THE COMPLETENESS CHECK IS THE LENDER'S, NOT THE DASHBOARD'S. The button
 * appears when the sections' required questions are answered; this action
 * asks the stricter question the specialist's button asks — can the
 * printed application go out without blanks — and names what is missing
 * if the two ever disagree.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SignNowState = { error?: string };

export async function requestOwnSignature(
  _prev: SignNowState,
  formData: FormData,
): Promise<SignNowState> {
  const applicationId = String(formData.get("applicationId") ?? "");
  if (!UUID_PATTERN.test(applicationId)) {
    return { error: "Something went wrong with that button. Please reload the page." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Please sign in and try again." };

  const { data: application } = await supabase
    .from("applications")
    .select("id, status, signature_requested_at")
    .eq("id", applicationId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!application) return { error: "We couldn't find that application." };

  if (!isEditable(application.status)) {
    return {
      error:
        "Your application is with a funding source, so it can't be signed from here. Your specialist can help.",
    };
  }

  if (!application.signature_requested_at) {
    const data = await loadFundingApplication(applicationId);
    const report = assessCompleteness(
      data?.context ?? {
        application: null, business: null, owners: [], answers: {}, debtCount: 0,
      },
    );

    if (!report.readyToSend) {
      const missing = report.missing.map((field) => field.formLabel).join(", ");
      return {
        error: `A few things are still blank on the application itself: ${missing}. Fill those in and the button will work.`,
      };
    }

    const service = createServiceRoleClient();
    const { error } = await service
      .from("applications")
      .update({
        signature_requested_at: new Date().toISOString(),
        signature_requested_by: user.id,
      })
      .eq("id", applicationId)
      .eq("profile_id", user.id)
      .is("signature_requested_at", null);

    if (error) return { error: "We couldn't prepare your application just then. Please try again." };

    // The email carries the same link, for signing later from an inbox.
    // Awaited so a failure is logged here; never thrown, because the
    // release has already happened.
    await notifySignatureRequested(applicationId, { requestedBy: "applicant" });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${applicationId}/application`);
  revalidatePath(`/dashboard/${applicationId}/sign`);
  redirect(`/dashboard/${applicationId}/sign`);
}
