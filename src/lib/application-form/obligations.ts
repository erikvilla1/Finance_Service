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
 * had required it since 0003 for anyone answering yes to existing debt — a bar
 * nobody could clear. It is optional now (obligationsApply, below).
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
/** The prequal answers that say the business already carries financing. */
const PREQUAL_DEBT_KEYS = [
  "open_positions_count",
  "debt_position_count",
  "debt_types",
  "current_financing_balance",
  "debt_total_balance",
];

/**
 * Whether the schedule is offered.
 *
 * OFFERED, NOT REQUIRED, AND ONLY BY THE PREQUAL. The client review (Notion
 * 09.27) made the debt schedule optional, and the 10-08 review narrowed
 * when it appears at all: only when the prequal said the business has
 * existing financing — open positions, a balance to refinance, an advance
 * among the debt types. The financials section's own "existing advances or
 * loans?" does not bring it up; the client wants the schedule to follow
 * what was said at the start, not to surface mid-form.
 *
 * Read from the prequal's raw answers rather than the application columns,
 * because the financials section writes the same columns and would
 * otherwise trigger it. Runs on the caller's client, so RLS scopes it.
 */
export async function obligationsApply(applicationId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("application_answers")
    .select("question_key, value")
    .eq("application_id", applicationId)
    .in("question_key", PREQUAL_DEBT_KEYS);

  for (const row of data ?? []) {
    const value = row.value as unknown;
    switch (row.question_key) {
      case "open_positions_count":
      case "debt_position_count":
        if (typeof value === "string" && value !== "" && value !== "0") return true;
        break;
      case "debt_types":
        if (Array.isArray(value) && value.some((type) => type && type !== "none")) return true;
        break;
      case "current_financing_balance":
      case "debt_total_balance": {
        const amount = Number(value);
        if (Number.isFinite(amount) && amount > 0) return true;
        break;
      }
    }
  }

  return false;
}
