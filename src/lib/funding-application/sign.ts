import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { storagePathFor } from "@/lib/documents/upload-rules";
import { notifyStaff } from "@/lib/email/notifications";
import {
  FCRA_AUTHORIZATION_V1,
  hashConsentText,
  type ConsentTextVersion,
} from "./consent-text";
import { loadFundingApplication } from "./load";
import { buildFundingApplicationPdf, isPngDataUrl } from "./pdf";

/**
 * Signing the funding application.
 *
 * The document is generated here rather than received from the browser. A client
 * that hands the server a finished PDF is a client that can hand it any PDF —
 * the signer draws a mark and types their name, and everything else on the page
 * is assembled from what the database already holds.
 *
 * TWO CONSENTS, NOT ONE. The FCRA authorization is the wording from Robert's
 * paper form and covers the credit pull. ESIGN separately requires agreement to
 * transact electronically at all, which paper never needed to ask. Recording one
 * and calling it both is the most common way an electronic signature turns out
 * not to be one.
 *
 * SSN AND TAX ID PASS THROUGH AND ARE NOT KEPT. They are drawn into the PDF and
 * then out of scope — no column, no log, no audit row. `source: "signer"` in
 * fields.ts has said this from the start, and buildMergePayload excludes them
 * structurally so a future change cannot start sending what we do not hold.
 */

export const E_SIGN_CONSENT: ConsentTextVersion = {
  version: "esign-2026-08-13",
  effectiveFrom: "2026-08-13",
  consentType: "e_sign",
  source: "ESIGN Act consent, drafted for this platform",
  body: `You agree to sign this application electronically and to receive the signed copy and related notices electronically. An electronic signature has the same legal effect as a handwritten one. You may instead request a paper copy to sign by hand at no charge by contacting your specialist, and you may withdraw this consent at any time before signing. To sign and to keep a copy you will need a device with a web browser and either a printer or somewhere to save a PDF.`,
};

export type SignResult =
  | { ok: true; documentId: string }
  | { ok: false; error: string };

export interface SignInput {
  applicationId: string;
  signatureDataUrl: string;
  signerName: string;
  signerTitle: string | null;
  ssn: string | null;
  taxId: string | null;
  agreedFcra: boolean;
  agreedESign: boolean;
  ipAddress: string | null;
  userAgent: string | null;
}

export async function signFundingApplication(
  input: SignInput,
): Promise<SignResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Your session expired. Please sign in and try again." };
  }

  const { data: application } = await supabase
    .from("applications")
    .select("id, reference_code, signature_requested_at, business_id")
    .eq("id", input.applicationId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!application) {
    return { ok: false, error: "We couldn't find that application." };
  }

  // Released by a specialist, not reached by guessing a URL. The page hides
  // itself too, but a hidden page is not a closed door.
  if (!application.signature_requested_at) {
    return {
      ok: false,
      error: "This application isn't ready for signature yet. Your specialist will let you know.",
    };
  }

  if (!input.agreedFcra || !input.agreedESign) {
    return { ok: false, error: "Both agreements have to be accepted before signing." };
  }

  if (!input.signerName.trim()) {
    return { ok: false, error: "Type your full name as it should appear on the document." };
  }

  if (!isPngDataUrl(input.signatureDataUrl)) {
    return { ok: false, error: "We didn't receive your signature. Please draw it again." };
  }

  const data = await loadFundingApplication(input.applicationId);
  if (!data) {
    return { ok: false, error: "We couldn't load your application just then. Please try again." };
  }

  const signedAt = new Date();
  const consents = [FCRA_AUTHORIZATION_V1, E_SIGN_CONSENT];

  let pdf: Uint8Array;
  try {
    pdf = await buildFundingApplicationPdf(data.context, {
      signatureDataUrl: input.signatureDataUrl,
      signerName: input.signerName.trim().slice(0, 120),
      signerTitle: input.signerTitle?.trim().slice(0, 120) || null,
      ssn: input.ssn?.trim() || null,
      taxId: input.taxId?.trim() || null,
      signedAt,
      consents,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      referenceCode: application.reference_code,
    });
  } catch {
    return { ok: false, error: "We couldn't produce the signed document. Please try again." };
  }

  // Service role for the write, and only for the write. The signed application
  // is evidence: the applicant must not be able to replace it later through the
  // ordinary upload path, so it is stored by us rather than by them.
  const service = createServiceRoleClient();

  const path = storagePathFor(
    application.id,
    "signed_application",
    `Signed Funding Application ${application.reference_code}.pdf`,
  );

  const { error: uploadError } = await service.storage
    .from("application-documents")
    .upload(path, pdf, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    return { ok: false, error: "We couldn't save the signed document. Please try again." };
  }

  // The checklist item it satisfies. Seeded at account claim; created here if a
  // file somehow arrived without one, because a signed application with nowhere
  // to hang is invisible to both sides.
  const { data: request } = await service
    .from("document_requests")
    .upsert(
      {
        application_id: application.id,
        document_type_key: "signed_application",
        is_required: true,
        status: "uploaded" as const,
      },
      { onConflict: "application_id,document_type_key", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  const requestId =
    request?.id ??
    (
      await service
        .from("document_requests")
        .select("id")
        .eq("application_id", application.id)
        .eq("document_type_key", "signed_application")
        .maybeSingle()
    ).data?.id ??
    null;

  const { data: document, error: documentError } = await service
    .from("documents")
    .insert({
      application_id: application.id,
      document_request_id: requestId,
      document_type_key: "signed_application",
      storage_path: path,
      file_name: `Signed Funding Application ${application.reference_code}.pdf`,
      mime_type: "application/pdf",
      size_bytes: pdf.byteLength,
      uploaded_by: user.id,
      status: "uploaded",
      // The distinction 0033 exists for. Anything else in this slot is a scan
      // or an upload; only this is backed by consent records and an audit trail.
      source: "e_signature",
    })
    .select("id")
    .single();

  if (documentError || !document) {
    return { ok: false, error: "We couldn't record the signed document. Please try again." };
  }

  // ------------------------------------------------------------------ consents
  //
  // Written after the document exists, so a consent row never claims a signature
  // that failed to save. Both carry the hash of the exact wording shown — the
  // version says which text, the hash proves it.
  await service.from("consents").insert(
    await Promise.all(
      consents.map(async (consent) => ({
        application_id: application.id,
        profile_id: user.id,
        // Tied to the document it produced (0033). "Did they ever accept the
        // FCRA wording" is a weaker question than "what did they accept when
        // they signed this", and only the second is worth having.
        document_id: document.id,
        // Taken from the text itself now, rather than inferred from position
        // in the array — the two could drift, and the consent record is
        // evidence.
        consent_type: consent.consentType,
        granted: true,
        text_version: consent.version,
        text_hash: await hashConsentText(consent.body),
        granted_at: signedAt.toISOString(),
        ip_address: input.ipAddress,
        user_agent: input.userAgent?.slice(0, 500) ?? null,
      })),
    ),
  );

  // Last four of the Tax ID is the one fragment the schema does keep, so a
  // specialist can match a file to a lender's reference without us holding the
  // number itself.
  // The end of the applicant's part in this. Robert wants to know the moment it
  // happens, because a signed application is a file that can go out today.
  await notifyStaff(
    application.id,
    "Application signed",
    "The funding application has been signed electronically and is in the lender package.",
  );

  const taxIdDigits = input.taxId?.replace(/\D/g, "") ?? "";
  if (application.business_id && taxIdDigits.length >= 4) {
    await service
      .from("businesses")
      .update({ ein_last4: taxIdDigits.slice(-4) })
      .eq("id", application.business_id);
  }

  return { ok: true, documentId: document.id };
}
