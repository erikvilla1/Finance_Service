"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  notifyDocumentReturned,
  notifyDocumentsComplete,
  notifySignatureRequested,
} from "@/lib/email/notifications";
import { assessCompleteness } from "@/lib/funding-application/completeness";
import { loadFundingApplication } from "@/lib/funding-application/load";

/**
 * The specialist's side of the document loop.
 *
 * BUSINESS_CONTEXT §2 step 4: "requests missing docs through the portal (not
 * email tag)". Everything here exists so that a document arriving, being read,
 * and being accepted or sent back is one screen rather than a thread.
 *
 * Like the CRM actions next door, these run on the signed-in user's client, not
 * the service role. RLS enforces staff-only on every write, so a bug in the
 * role check below fails closed rather than open. The check is still there —
 * it produces a comprehensible error instead of a silent zero-row update.
 *
 * Nothing here writes document_requests.status directly. That column is derived
 * by the trigger in migration 0021 from the documents attached to the request,
 * and setting it by hand would be a second source of truth for the same fact.
 * The one exception is waiving, which is a decision about the request itself and
 * cannot be expressed as a fact about any document.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireStaff() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "customer") {
    throw new Error("Not permitted.");
  }

  return { supabase, userId: user.id };
}

function refresh(applicationId: string) {
  revalidatePath(`/admin/applications/${applicationId}`);
  // The applicant is looking at the same data through different words.
  revalidatePath(`/dashboard/${applicationId}/documents`);
  revalidatePath("/dashboard");
}

/**
 * This document is good.
 *
 * The trigger takes it from here: one accepted document satisfies its request,
 * which fills a segment of the applicant's progress bar and stops the item
 * appearing on their outstanding list.
 */
export async function acceptDocument(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");

  if (!UUID_PATTERN.test(documentId)) throw new Error("Unknown document.");

  const { supabase, userId } = await requireStaff();

  const { error } = await supabase
    .from("documents")
    .update({
      status: "accepted",
      verified_by: userId,
      verified_at: new Date().toISOString(),
      verification_note: null,
    })
    .eq("id", documentId);

  if (error) throw new Error("Could not accept the document.");

  // Sent once, when the last outstanding item settles — not on every
  // acceptance. Four "we accepted a document" emails in an afternoon teaches
  // someone to stop opening them, and the one that matters is the last.
  const { data: outstanding } = await supabase
    .from("document_requests")
    .select("status")
    .eq("application_id", applicationId)
    .eq("is_required", true);

  const allSettled =
    (outstanding?.length ?? 0) > 0 &&
    (outstanding ?? []).every(
      (request) => request.status === "accepted" || request.status === "waived",
    );

  if (allSettled) {
    await notifyDocumentsComplete(applicationId);
  }

  refresh(applicationId);
}

/**
 * Send it back, with a reason.
 *
 * THE REASON IS REQUIRED, and this is the whole point of the screen. A checklist
 * item that flips back to "needed" with no explanation is how the current
 * process works — the applicant re-sends the same unreadable scan, and the
 * second round trip is wasted too.
 *
 * The note is written to verification_note, which the applicant reads beside the
 * file on their own documents page. Write it to be read by them, not filed by
 * us: "the last page is cut off" rather than "illegible".
 */
export async function rejectDocument(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!UUID_PATTERN.test(documentId)) throw new Error("Unknown document.");
  if (!reason) throw new Error("Say what needs fixing — the applicant sees this.");

  const { supabase, userId } = await requireStaff();

  const { data: document, error } = await supabase
    .from("documents")
    .update({
      status: "rejected",
      verified_by: userId,
      verified_at: new Date().toISOString(),
      verification_note: reason.slice(0, 500),
    })
    .eq("id", documentId)
    .select("document_type_key")
    .maybeSingle();

  if (error) throw new Error("Could not send the document back.");

  // The reason travels with the message. Telling someone a document came back
  // without saying what was wrong produces the same document again.
  const label = await documentLabel(supabase, document?.document_type_key ?? null);
  await notifyDocumentReturned(applicationId, label, reason);

  refresh(applicationId);
}

/** The human name for a document type, for use in a sentence. */
async function documentLabel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  key: string | null,
): Promise<string> {
  if (!key) return "document";

  const { data } = await supabase
    .from("document_type_definitions")
    .select("label")
    .eq("key", key)
    .maybeSingle();

  return data?.label ?? "document";
}

/**
 * We don't need this one after all.
 *
 * The checklist is seeded generically from document_type_definitions, so it will
 * sometimes ask an applicant for something their deal doesn't involve. Waiving
 * is the honest way to clear that: the item reads "Not needed" rather than
 * quietly disappearing, so nobody later wonders whether it was missed.
 *
 * This is the one status written by hand. The trigger in 0021 never overwrites
 * 'waived' — a specialist deciding a document isn't required outranks a customer
 * uploading one anyway.
 */
export async function waiveRequest(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
  const requestId = String(formData.get("requestId") ?? "");

  if (!UUID_PATTERN.test(requestId)) throw new Error("Unknown request.");

  const { supabase } = await requireStaff();

  const { error } = await supabase
    .from("document_requests")
    .update({ status: "waived", satisfied_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("application_id", applicationId);

  if (error) throw new Error("Could not waive the request.");

  refresh(applicationId);
}

/**
 * Put an item back on the list after waiving it.
 *
 * Recovering from a misclick has to be possible, and it cannot be done by
 * writing 'requested' and hoping — a waived request may already have documents
 * attached, in which case 'requested' would be wrong the moment it was written.
 * Setting it to 'requested' hands the question to the trigger, which recomputes
 * it from the documents that are actually there.
 */
export async function unwaiveRequest(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
  const requestId = String(formData.get("requestId") ?? "");

  if (!UUID_PATTERN.test(requestId)) throw new Error("Unknown request.");

  const { supabase } = await requireStaff();

  const { error } = await supabase
    .from("document_requests")
    .update({ status: "requested", satisfied_at: null })
    .eq("id", requestId)
    .eq("application_id", applicationId);

  if (error) throw new Error("Could not reinstate the request.");

  // Nudge the trigger into recomputing: it only fires on public.documents, so a
  // request with files already attached would otherwise sit at 'requested' until
  // the next upload. Touching the newest document is enough to settle it.
  const { data: existing } = await supabase
    .from("documents")
    .select("id, status")
    .eq("document_request_id", requestId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("documents")
      .update({ status: existing.status })
      .eq("id", existing.id);
  }

  refresh(applicationId);
}

/**
 * Release the funding application for signature.
 *
 * The applicant sees no signing page until this happens. Deliberately a
 * decision rather than a consequence of the form being complete: Robert knows
 * things about a file that the completeness check does not, and a client
 * signing a document before he has read it is worse than a client waiting a
 * day.
 *
 * Reversible. Withdrawing it hides the page again — useful when something is
 * spotted after releasing and before signing. It does nothing to a signature
 * already given, which is evidence and not ours to take back.
 */
export async function requestSignature(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
  const withdraw = formData.get("withdraw") === "true";

  if (!UUID_PATTERN.test(applicationId)) throw new Error("Unknown application.");

  const { supabase, userId } = await requireStaff();

  // The application has to be complete before anyone signs it.
  //
  // A signed document is evidence, and a signed document with blanks on it is
  // evidence of a mess: the applicant has attested that everything in it is
  // "true, complete and accurate" — the FCRA wording says exactly that — while
  // half the fields are empty. A lender receiving it either returns it or, worse,
  // does not notice.
  //
  // Checked here rather than only in the UI. A disabled button is a courtesy,
  // not a control, and this action is reachable by POST.
  if (!withdraw) {
    const data = await loadFundingApplication(applicationId);
    const report = assessCompleteness(
      data?.context ?? {
        application: null, business: null, owners: [], answers: {}, debtCount: 0,
      },
    );

    if (!report.readyToSend) {
      const missing = report.missing.map((field) => field.formLabel).join(", ");
      throw new Error(
        `The application is not complete yet, so it cannot be signed. Still needed: ${missing}`,
      );
    }
  }

  const { error } = await supabase
    .from("applications")
    .update({
      signature_requested_at: withdraw ? null : new Date().toISOString(),
      signature_requested_by: withdraw ? null : userId,
    })
    .eq("id", applicationId);

  if (error) throw new Error("Could not update the signature request.");

  // Awaited so a send failure is logged in the same request, but never thrown:
  // releasing the file for signature has already succeeded, and an unreachable
  // mail server is not a reason to tell the specialist it did not.
  if (!withdraw) {
    await notifySignatureRequested(applicationId);
  }

  refresh(applicationId);
}

/**
 * Ask for something that wasn't on the seeded list.
 *
 * The generic checklist covers the common case; real deals need one more thing.
 * Adding it here rather than in an email is what keeps the applicant's page the
 * single answer to "what do you still need from me".
 *
 * Instructions are optional but worth writing — they replace the request's
 * generic description on the applicant's screen, and "the 2024 return, all
 * schedules" saves a round trip that "Business Tax Returns" does not.
 */
export async function requestDocument(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
  const documentTypeKey = String(formData.get("documentTypeKey") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();

  if (!UUID_PATTERN.test(applicationId)) throw new Error("Unknown application.");
  if (!documentTypeKey) throw new Error("Pick a document type.");

  const { supabase, userId } = await requireStaff();

  // The key is a foreign key to document_type_definitions, so an invented one
  // is refused by the database. Checking is_active as well keeps a retired type
  // from being requested through a stale form.
  const { data: definition } = await supabase
    .from("document_type_definitions")
    .select("key")
    .eq("key", documentTypeKey)
    .eq("is_active", true)
    .maybeSingle();

  if (!definition) throw new Error("Unknown document type.");

  // Idempotent by the unique constraint on (application_id, document_type_key).
  // Asking twice is a no-op rather than an error, and never overwrites
  // instructions already written on an existing request.
  const { error } = await supabase
    .from("document_requests")
    .upsert(
      {
        application_id: applicationId,
        document_type_key: definition.key,
        is_required: true,
        status: "requested",
        instructions: instructions ? instructions.slice(0, 1000) : null,
        requested_by: userId,
      },
      { onConflict: "application_id,document_type_key", ignoreDuplicates: true },
    );

  if (error) throw new Error("Could not add that to the checklist.");

  refresh(applicationId);
}
