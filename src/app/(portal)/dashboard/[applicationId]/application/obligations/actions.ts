"use server";

import { revalidatePath } from "next/cache";
import {
  saveObligations,
  type ObligationInput,
} from "@/lib/application-form/obligations";

/**
 * Saving the debt schedule.
 *
 * Rows arrive as parallel indexed fields rather than JSON, so the form still
 * works as a plain form: `lender_name.0`, `balance.0`, `lender_name.1` and so
 * on. Nothing about it depends on JavaScript having run.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Enough for any real schedule, and a ceiling on what one POST can create. */
const MAX_ROWS = 25;

export type ObligationsState = { error?: string; saved?: boolean };

export async function saveObligationsAction(
  _prevState: ObligationsState,
  formData: FormData,
): Promise<ObligationsState> {
  const applicationId = String(formData.get("application_id") ?? "");

  if (!UUID_PATTERN.test(applicationId)) {
    return { error: "Something went wrong with that form. Please reload the page." };
  }

  const rows: ObligationInput[] = [];

  for (let index = 0; index < MAX_ROWS; index++) {
    const lenderName = formData.get(`lender_name.${index}`);
    if (lenderName === null) continue;

    rows.push({
      lenderName: String(lenderName),
      balance: money(formData.get(`balance.${index}`)),
      monthlyPayment: money(formData.get(`monthly_payment.${index}`)),
      debtType: text(formData.get(`debt_type.${index}`)),
    });
  }

  const result = await saveObligations(applicationId, rows);

  revalidatePath(`/dashboard/${applicationId}/application`);
  revalidatePath(`/dashboard/${applicationId}/application/obligations`);
  revalidatePath("/dashboard");

  if (!result.ok) return { error: result.error };

  return { saved: true };
}

/** Same tolerance as the rest of the form: people type dollar signs and commas. */
function money(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? "").replace(/[$,\s]/g, "").trim();
  if (!text) return null;

  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function text(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  return value ? value : null;
}
