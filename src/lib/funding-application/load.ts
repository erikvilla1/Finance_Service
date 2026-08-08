import { createClient } from "@/lib/supabase/server";
import type { CompletenessContext } from "./fields";
import type { ExistingDebtRow } from "@/types/database";

/**
 * Loads everything the funding application needs for one deal.
 *
 * Reads through the signed-in user's client, so RLS applies — a customer who
 * somehow reached a staff URL gets nothing back rather than someone else's
 * file.
 */
export interface FundingApplicationData {
  context: CompletenessContext;
  debts: ExistingDebtRow[];
  referenceCode: string | null;
}

export async function loadFundingApplication(
  applicationId: string,
): Promise<FundingApplicationData | null> {
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) return null;

  const [{ data: business }, { data: owners }, { data: answers }, { data: debts }] =
    await Promise.all([
      application.business_id
        ? supabase
            .from("businesses")
            .select("*")
            .eq("id", application.business_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("application_owners")
        .select("*")
        .eq("application_id", applicationId)
        // Primary owner first — the form's layout depends on the order.
        .order("is_primary", { ascending: false })
        .order("created_at"),
      supabase
        .from("application_answers")
        .select("question_key, value")
        .eq("application_id", applicationId),
      supabase
        .from("existing_debts")
        .select("*")
        .eq("application_id", applicationId)
        .order("position", { nullsFirst: false }),
    ]);

  const answerMap: Record<string, unknown> = {};
  for (const row of answers ?? []) answerMap[row.question_key] = row.value;

  return {
    context: {
      application: application as unknown as Record<string, unknown>,
      business: (business ?? null) as unknown as Record<string, unknown> | null,
      owners: (owners ?? []) as unknown as Record<string, unknown>[],
      answers: answerMap,
      debtCount: debts?.length ?? 0,
    },
    debts: (debts ?? []) as ExistingDebtRow[],
    referenceCode: application.reference_code,
  };
}
