import { createClient } from "@/lib/supabase/server";
import type { ExistingDebtRow } from "@/types/database";
import { isEditable } from "./load";

/**
 * The business debt schedule.
 *
 * Not a question, and that is why it was missing. Every other part of this form
 * is one row in `application_questions` producing one input; a debt schedule is
 * an unknown number of rows with four fields each, so it has no representation
 * in that model and quietly never got built. Meanwhile the completeness check
 * has required it since 0003 for anyone answering yes to existing debt — a bar
 * nobody could clear.
 *
 * REPLACED WHOLE, NOT MERGED. The form posts the complete schedule and this
 * deletes what was there and writes what came back. Diffing rows by id would
 * save a few writes and introduce the question of what to do with an id the
 * browser claims exists and the database has never heard of. A schedule is
 * small and self-contained; replacing it is both simpler and impossible to get
 * subtly wrong.
 */

export interface ObligationInput {
  lenderName: string;
  balance: number | null;
  monthlyPayment: number | null;
  debtType: string | null;
}

export type ObligationsResult =
  | { ok: true }
  | { ok: false; error: string };

export async function loadObligations(
  applicationId: string,
): Promise<ExistingDebtRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("existing_debts")
    .select("*")
    .eq("application_id", applicationId)
    .order("position", { nullsFirst: false })
    .order("created_at");

  return (data ?? []) as ExistingDebtRow[];
}

export async function saveObligations(
  applicationId: string,
  rows: ObligationInput[],
): Promise<ObligationsResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Your session expired. Please sign in and try again." };
  }

  const { data: application } = await supabase
    .from("applications")
    .select("id, status")
    .eq("id", applicationId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!application) {
    return { ok: false, error: "We couldn't find that application." };
  }

  if (!isEditable(application.status)) {
    return {
      ok: false,
      error:
        "Your application is with a funding source, so it can't be changed here. Your specialist can help with anything that needs correcting.",
    };
  }

  // A row with no lender is an empty row someone added and did not fill in.
  // Dropping it silently is right: they are telling us there is nothing there.
  const usable = rows.filter((row) => row.lenderName.trim().length > 0);

  const { error: clearError } = await supabase
    .from("existing_debts")
    .delete()
    .eq("application_id", applicationId);

  if (clearError) {
    return { ok: false, error: "We couldn't save that just then. Please try again." };
  }

  if (usable.length === 0) return { ok: true };

  const { error } = await supabase.from("existing_debts").insert(
    usable.map((row, index) => ({
      application_id: applicationId,
      lender_name: row.lenderName.trim().slice(0, 200),
      balance: row.balance,
      monthly_payment: row.monthlyPayment,
      debt_type: row.debtType?.trim().slice(0, 100) || null,
      // Preserves the order they were entered in, which is the order the
      // printed form renders them.
      position: index + 1,
    })),
  );

  if (error) {
    return { ok: false, error: "We couldn't save that just then. Please try again." };
  }

  return { ok: true };
}

/**
 * Whether this applicant has to fill in a schedule at all.
 *
 * Mirrors the requiredWhen on the `existing_debts` field in
 * FUNDING_APPLICATION_FIELDS: needed only when they have said they carry an
 * existing advance or loan. Asking a business with no debt to list its debts is
 * a section they cannot complete and will not understand.
 */
export function obligationsRequired(application: {
  has_existing_mca?: unknown;
}): boolean {
  return application.has_existing_mca === true;
}
