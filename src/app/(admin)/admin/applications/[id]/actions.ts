"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STATUS_ORDER } from "@/lib/crm";
import { notifyFunded } from "@/lib/email/notifications";
import type { ApplicationStatus } from "@/types/database";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * CRM mutations.
 *
 * All of these run on the *user's* client, not the service role. That is
 * deliberate: RLS then enforces staff-only access on every write, so a bug here
 * fails closed. The service role is reserved for the anonymous prequal path,
 * where there is genuinely no user to authorise against.
 */

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

export async function updateStatus(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
  const status = String(formData.get("status") ?? "") as ApplicationStatus;

  if (!STATUS_ORDER.includes(status)) throw new Error("Unknown status.");

  const { supabase } = await requireStaff();

  // What it was, so "funded" is acted on once: the email and the funding
  // record below are for the move into funded, not for every re-save.
  const { data: before } = await supabase
    .from("applications")
    .select("status")
    .eq("id", applicationId)
    .maybeSingle();

  // The status-history trigger records who changed it and when — no need to
  // write the audit row here, and no way to skip it.
  const { error } = await supabase
    .from("applications")
    .update({
      status,
      // Stamp the funnel timestamps spec §19's metrics depend on.
      ...(status === "contacted" ? { first_contact_at: new Date().toISOString() } : {}),
      ...(status === "funded" ? { funded_at: new Date().toISOString() } : {}),
      ...(status === "approved" || status === "declined"
        ? { decision_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", applicationId);

  if (error) throw new Error("Could not update the status.");

  if (status === "funded" && before?.status !== "funded") {
    // A funding record to complete, dated today. Robert fills in the amount,
    // the lender and the commission on the file (FundingCard); creating the
    // row here is what makes the card ask for them. ignoreDuplicates: a
    // record he already wrote is never overwritten by a status change.
    await supabase
      .from("application_fundings")
      .upsert(
        { application_id: applicationId, funded_on: new Date().toISOString().slice(0, 10) },
        { onConflict: "application_id", ignoreDuplicates: true },
      );

    // The applicant hears it from us, once. The send never blocks the status
    // change (send.ts, rule 1): a failed email is a missing email, not a file
    // stuck at the previous status.
    await notifyFunded(applicationId);
  }

  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/overview");
}

/** "$125,000.00" → 125000; blank or nonsense → null, never NaN. */
function parseMoney(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").replace(/[$,\s]/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

/**
 * What happened when the file funded: amount, lender, date, FLS commission.
 *
 * One row per application, replaced whole on each save (upsert on the
 * application id), so there is never a question of which of two records is
 * current. Lives in its own staff-only table (0040) rather than on the
 * application, because the applicant can read their own application row and
 * the commission is not theirs to see.
 */
export async function recordFunding(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
  if (!UUID_PATTERN.test(applicationId)) throw new Error("Unknown application.");

  const lenderIdRaw = String(formData.get("lenderId") ?? "").trim();
  const lenderId = UUID_PATTERN.test(lenderIdRaw) ? lenderIdRaw : null;

  const fundedOnRaw = String(formData.get("fundedOn") ?? "").trim();
  const fundedOn = /^\d{4}-\d{2}-\d{2}$/.test(fundedOnRaw) ? fundedOnRaw : null;

  const notes = String(formData.get("notes") ?? "").trim().slice(0, 2000) || null;

  const { supabase, userId } = await requireStaff();

  const { error } = await supabase.from("application_fundings").upsert(
    {
      application_id: applicationId,
      lender_id: lenderId,
      funded_amount: parseMoney(formData.get("fundedAmount")),
      funded_on: fundedOn,
      commission_amount: parseMoney(formData.get("commissionAmount")),
      notes,
      recorded_by: userId,
    },
    { onConflict: "application_id" },
  );

  if (error) throw new Error("Could not save the funding record.");

  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/overview");
}

export async function addNote(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!body) return;

  const { supabase, userId } = await requireStaff();

  const { error } = await supabase.from("crm_notes").insert({
    application_id: applicationId,
    author_profile_id: userId,
    body: body.slice(0, 5000),
  });

  if (error) throw new Error("Could not save the note.");

  revalidatePath(`/admin/applications/${applicationId}`);
}
