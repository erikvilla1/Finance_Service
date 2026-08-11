import { createClient } from "@/lib/supabase/server";
import { loadQuestions, type Question } from "@/lib/questions";
import type { ProductTrack } from "@/types/database";
import { coerceValue, isAnswered, targetFor, type FormModule } from "./mapping";
import { isEditable } from "./load";

/**
 * Writing one section of the full application.
 *
 * The section is saved as a unit and every field in it is written, including
 * the ones left blank — that is what makes clearing a field possible. Only
 * questions actually present in the submission are touched, so a conditional
 * question that was hidden this time is not silently erased.
 *
 * PARTIAL SAVES ARE THE POINT. Nothing here refuses a section because a required
 * field is empty. Someone filling in a funding application on a phone between
 * jobs should be able to put down what they know and come back, and a form that
 * only saves when perfect is a form that loses an afternoon's typing. Required
 * fields drive the progress display and the specialist's completeness check;
 * they do not gate the write.
 *
 * The two exceptions are structural rather than editorial: `businesses` and
 * `application_owners` each have a NOT NULL name column, so the first save that
 * creates one of those rows genuinely cannot proceed without it.
 */

export type SaveResult =
  | { ok: true }
  | { ok: false; error: string };

interface Loaded {
  id: string;
  status: string;
  business_id: string | null;
  track: ProductTrack | null;
  profile_id: string | null;
}

export async function saveSection(
  applicationId: string,
  module: FormModule,
  formData: FormData,
): Promise<SaveResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Your session expired. Please sign in and try again." };
  }

  // Scoped to the signed-in person explicitly. The RLS policy would also admit
  // staff, and a specialist saving through the applicant's own form is not a
  // path anyone intends — /admin is where staff edit a file.
  const { data: application } = await supabase
    .from("applications")
    .select("id, status, business_id, track, profile_id")
    .eq("id", applicationId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!application) {
    return { ok: false, error: "We couldn't find that application." };
  }

  const loaded = application as unknown as Loaded;

  // Checked here so the message is comprehensible. The database refuses it
  // regardless — migration 0022 — and that refusal is the real boundary.
  if (!isEditable(loaded.status as never)) {
    return {
      ok: false,
      error:
        "Your application is with a funding source, so it can't be changed here. Your specialist can help with anything that needs correcting.",
    };
  }

  const questions = (await loadQuestions([module], loaded.track)).filter(
    (question) => formData.has(question.key),
  );

  if (questions.length === 0) return { ok: true };

  const byTable = {
    application: {} as Record<string, unknown>,
    business: {} as Record<string, unknown>,
    owner: {} as Record<string, unknown>,
    answers: [] as { question: Question; value: unknown }[],
  };

  for (const question of questions) {
    const value = coerceValue(question, formData.get(question.key));
    const target = targetFor(question.key);

    switch (target.table) {
      case "application":
        byTable.application[target.column] = value;
        break;
      case "business":
        byTable.business[target.column] = value;
        break;
      case "owner":
        byTable.owner[target.column] = value;
        break;
      default:
        byTable.answers.push({ question, value });
    }
  }

  // ---------------------------------------------------------------- APPLICATION
  if (Object.keys(byTable.application).length > 0) {
    // Cast because the payload is assembled at runtime from the mapping table,
    // so its keys are not statically known. The generated Update type rejects
    // excess properties, which is the right default everywhere except here —
    // the guarantee that these column names are real comes from mapping.ts and
    // from the write failing loudly if one is not.
    const { error } = await supabase
      .from("applications")
      .update(byTable.application as never)
      .eq("id", applicationId);

    if (error) return { ok: false, error: saveFailed };
  }

  // ------------------------------------------------------------------ BUSINESS
  if (Object.keys(byTable.business).length > 0) {
    const result = await writeBusiness(supabase, loaded, user.id, byTable.business);
    if (!result.ok) return result;
  }

  // --------------------------------------------------------------------- OWNER
  if (Object.keys(byTable.owner).length > 0) {
    const result = await writeOwner(supabase, applicationId, byTable.owner);
    if (!result.ok) return result;
  }

  // ------------------------------------------------------------------- ANSWERS
  if (byTable.answers.length > 0) {
    const { error } = await supabase.from("application_answers").upsert(
      byTable.answers.map(({ question, value }) => ({
        application_id: applicationId,
        question_id: question.id,
        question_key: question.key,
        value: value as never,
        is_pii: question.isPii,
      })),
      { onConflict: "application_id,question_key" },
    );

    if (error) return { ok: false, error: saveFailed };
  }

  return { ok: true };
}

const saveFailed = "We couldn't save that just then. Please try again.";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * The business row is created lazily, on the first save that has a name for it.
 *
 * An application can exist without a business — the prequal never asks for one,
 * and inventing a placeholder row named "Untitled" to satisfy a NOT NULL would
 * put a nonsense company name on a lender package.
 */
async function writeBusiness(
  supabase: Client,
  application: Loaded,
  profileId: string,
  values: Record<string, unknown>,
): Promise<SaveResult> {
  if (application.business_id) {
    const { error } = await supabase
      .from("businesses")
      .update(values as never)
      .eq("id", application.business_id);

    return error ? { ok: false, error: saveFailed } : { ok: true };
  }

  const legalName = values.legal_name;

  if (!isAnswered(legalName)) {
    return {
      ok: false,
      error:
        "Start with the business's legal name — everything else in this section is filed under it.",
    };
  }

  const { data: created, error } = await supabase
    .from("businesses")
    .insert({ ...values, owner_profile_id: profileId } as never)
    .select("id")
    .single();

  if (error || !created) return { ok: false, error: saveFailed };

  const { error: linkError } = await supabase
    .from("applications")
    .update({ business_id: created.id })
    .eq("id", application.id);

  // The business row exists but nothing points at it. Say so rather than
  // reporting success — a silent orphan here means the next save creates a
  // second business and the applicant's details split across two rows.
  if (linkError) return { ok: false, error: saveFailed };

  return { ok: true };
}

/**
 * Primary owner, same lazy creation.
 *
 * `full_name` is NOT NULL and predates `first_name` / `last_name` being split
 * out, so it is kept in step on every write rather than left to drift. The
 * printed form and the CRM read different ones of the three.
 */
async function writeOwner(
  supabase: Client,
  applicationId: string,
  values: Record<string, unknown>,
): Promise<SaveResult> {
  const { data: existing } = await supabase
    .from("application_owners")
    .select("id, first_name, last_name")
    .eq("application_id", applicationId)
    .eq("is_primary", true)
    .maybeSingle();

  const first = "first_name" in values ? values.first_name : existing?.first_name;
  const last = "last_name" in values ? values.last_name : existing?.last_name;
  const fullName = [first, last].filter(isAnswered).join(" ").trim();

  if (existing) {
    const { error } = await supabase
      .from("application_owners")
      .update({ ...values, ...(fullName ? { full_name: fullName } : {}) })
      .eq("id", existing.id);

    return error ? { ok: false, error: saveFailed } : { ok: true };
  }

  if (!fullName) {
    return {
      ok: false,
      error: "Start with the owner's name — the rest of this section is recorded against it.",
    };
  }

  const { error } = await supabase.from("application_owners").insert({
    ...values,
    application_id: applicationId,
    full_name: fullName,
    is_primary: true,
  } as never);

  return error ? { ok: false, error: saveFailed } : { ok: true };
}
