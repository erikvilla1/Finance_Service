"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STATUS_ORDER } from "@/lib/crm";
import type { ApplicationStatus } from "@/types/database";

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

  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/admin");
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

export async function assignToMe(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
  const { supabase, userId } = await requireStaff();

  const { error } = await supabase
    .from("applications")
    .update({ assigned_to: userId })
    .eq("id", applicationId);

  if (error) throw new Error("Could not assign the application.");

  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/admin");
}
