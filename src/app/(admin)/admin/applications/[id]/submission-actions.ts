"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LenderSubmissionStatus } from "@/types/database";

/**
 * Recording what happens with a funder.
 *
 * Everything runs on the signed-in user's client, so RLS enforces staff-only on
 * every write — and these two tables have no customer policy at all, so a
 * mistake here returns nothing rather than leaking Robert's lender list.
 *
 * NOTHING HERE SENDS ANYTHING. The package is downloaded and emailed by a human,
 * because that is how Robert works and pretending otherwise would mean a
 * "Submitted" row for a package nobody sent. These actions record a decision
 * that has already been made in the world.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUSES: LenderSubmissionStatus[] = [
  "prepared",
  "sent",
  "in_review",
  "countered",
  "approved",
  "declined",
  "withdrawn",
  "funded",
];

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

  if (!profile || profile.role === "customer") throw new Error("Not permitted.");

  return { supabase, userId: user.id };
}

function refresh(applicationId: string) {
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/admin");
}

/**
 * Record that a file has gone to a lender.
 *
 * Defaults to 'sent' rather than 'prepared', because the moment a specialist
 * reaches for this is the moment after they emailed the package. 'prepared'
 * exists for the other order — lining several up before sending any.
 */
export async function addSubmission(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
  const lenderId = String(formData.get("lenderId") ?? "");
  const markSent = formData.get("markSent") !== "false";
  const notes = String(formData.get("notes") ?? "").trim();

  if (!UUID_PATTERN.test(applicationId) || !UUID_PATTERN.test(lenderId)) {
    throw new Error("Unknown application or lender.");
  }

  const { supabase, userId } = await requireStaff();

  const { error } = await supabase.from("lender_submissions").insert({
    application_id: applicationId,
    lender_id: lenderId,
    status: markSent ? "sent" : "prepared",
    submitted_at: markSent ? new Date().toISOString() : null,
    submitted_by: markSent ? userId : null,
    notes: notes ? notes.slice(0, 2000) : null,
  });

  if (error) throw new Error("Could not record that submission.");

  refresh(applicationId);
}

/**
 * Record what a funder said.
 *
 * A decline needs a reason and the form requires one. It is the most reusable
 * information in the business: it tells the next submission what to fix, and
 * over time it tells Robert which lender to stop sending a certain kind of file
 * to. "Declined" on its own tells the next person nothing.
 *
 * Deliberately does not touch applications.status. A decline from one funder is
 * not the file's outcome — BUSINESS_CONTEXT §2, "a denial is not a forever no" —
 * and moving the whole application on the strength of one answer is what made
 * that fact impossible to represent before this table existed.
 */
export async function recordResponse(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
  const submissionId = String(formData.get("submissionId") ?? "");
  const status = String(formData.get("status") ?? "") as LenderSubmissionStatus;
  const declineReason = String(formData.get("declineReason") ?? "").trim();
  const offeredAmountRaw = String(formData.get("offeredAmount") ?? "").replace(/[$,\s]/g, "");
  const offeredTerms = String(formData.get("offeredTerms") ?? "").trim();

  if (!UUID_PATTERN.test(submissionId)) throw new Error("Unknown submission.");
  if (!STATUSES.includes(status)) throw new Error("Unknown status.");

  if (status === "declined" && !declineReason) {
    throw new Error("Say why they declined — the next submission depends on it.");
  }

  const offeredAmount = offeredAmountRaw ? Number(offeredAmountRaw) : null;

  const { supabase } = await requireStaff();

  const decided = ["approved", "declined", "countered", "funded"].includes(status);

  const { error } = await supabase
    .from("lender_submissions")
    .update({
      status,
      responded_at: decided ? new Date().toISOString() : null,
      decline_reason: status === "declined" ? declineReason.slice(0, 2000) : null,
      offered_amount:
        offeredAmount != null && Number.isFinite(offeredAmount) ? offeredAmount : null,
      offered_terms: offeredTerms ? offeredTerms.slice(0, 2000) : null,
    })
    .eq("id", submissionId);

  if (error) throw new Error("Could not record that response.");

  refresh(applicationId);
}

/**
 * Add a lender to the book.
 *
 * Kept on the application page as well as the lenders page, because the moment
 * Robert discovers he needs a lender that is not in the list is the moment he is
 * looking at a file that needs one.
 */
export async function addLender(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) throw new Error("A lender needs a name.");

  const { supabase } = await requireStaff();

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const { error } = await supabase.from("lenders").insert({
    name: name.slice(0, 200),
    // Collisions are possible and the unique constraint will say so, which is
    // a better failure than silently filing two lenders under one slug.
    slug: slug || `lender-${Date.now()}`,
    contact_name: contactName || null,
    contact_email: contactEmail || null,
    notes: notes ? notes.slice(0, 2000) : null,
  });

  if (error) throw new Error("Could not add that lender. Is the name already used?");

  revalidatePath("/admin/lenders");
}
