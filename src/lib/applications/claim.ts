import { createServiceRoleClient } from "@/lib/supabase/server";
import type { ProductTrack } from "@/types/database";

/**
 * Attaching an anonymous prequalification to a newly created account.
 *
 * WHY THIS NEEDS THE SERVICE ROLE. Prequal applications are written with
 * profile_id null — there is no account at that point in the funnel. The RLS
 * policy "users update own draft applications" has profile_id = auth.uid() in
 * its USING clause, so a row with a null profile_id matches no user and can
 * never be claimed by the very person it belongs to. Loosening that policy to
 * allow "profile_id is null" in USING would let ANY authenticated user claim
 * ANY unclaimed application, which is far worse than a narrow service-role path.
 *
 * WHAT AUTHORIZES THE CLAIM. Possession of public_token — the unguessable uuid
 * from migration 0009 that is only ever handed to the person who submitted the
 * form. This is the same trust model the result page already runs on.
 *
 * The claim is conditional on profile_id being null and is expressed as a
 * single UPDATE ... WHERE profile_id IS NULL rather than a read-then-write, so
 * two simultaneous claims cannot both succeed. A token that has already been
 * claimed is refused rather than reassigned: a shared or leaked result link must
 * not hand someone else's financial application to a stranger.
 */

export type ClaimResult =
  | { ok: true; applicationId: string; referenceCode: string }
  | { ok: false; reason: "not_found" | "already_claimed" };

export async function claimApplication(
  publicToken: string,
  profileId: string,
): Promise<ClaimResult> {
  const supabase = createServiceRoleClient();

  const { data: claimed } = await supabase
    .from("applications")
    .update({ profile_id: profileId })
    .eq("public_token", publicToken)
    .is("profile_id", null)
    .select("id, reference_code, track")
    .maybeSingle();

  if (claimed) {
    // Best-effort. A missing checklist is a dashboard that looks empty, which is
    // recoverable; a failed claim is not, so it must not be undone by this.
    await seedDocumentChecklist(claimed.id, claimed.track);

    return {
      ok: true,
      applicationId: claimed.id,
      referenceCode: claimed.reference_code,
    };
  }

  // Nothing updated. Distinguish "no such application" from "someone already
  // owns it" so the caller can say something useful.
  const { data: existing } = await supabase
    .from("applications")
    .select("id, profile_id")
    .eq("public_token", publicToken)
    .maybeSingle();

  if (!existing) return { ok: false, reason: "not_found" };

  // Re-running the claim for the same person is a success, not a collision —
  // a double-submitted signup form should not read as an error.
  if (existing.profile_id === profileId) {
    const { data: row } = await supabase
      .from("applications")
      .select("id, reference_code")
      .eq("id", existing.id)
      .single();

    return row
      ? { ok: true, applicationId: row.id, referenceCode: row.reference_code }
      : { ok: false, reason: "not_found" };
  }

  return { ok: false, reason: "already_claimed" };
}

/**
 * Seed the document checklist for an application.
 *
 * Sourced from document_type_definitions rather than hardcoded (the same
 * principle as questions in spec §9): adding a required document is an insert,
 * not a deploy. Universal types apply to everyone; track-specific types only to
 * matching applications, so an equipment applicant is not asked for a rent roll.
 *
 * Idempotent. document_requests has unique (application_id, document_type_key),
 * and ignoreDuplicates leans on it — re-running this never duplicates a row and
 * never overwrites a request a specialist has since edited.
 */
export async function seedDocumentChecklist(
  applicationId: string,
  track: ProductTrack | null,
): Promise<number> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("document_type_definitions")
    .select("key, sort_order")
    .eq("is_active", true);

  query = track
    ? query.or(`is_universal.eq.true,track.eq.${track}`)
    : query.eq("is_universal", true);

  const { data: definitions } = await query;

  if (!definitions?.length) return 0;

  const { data: inserted } = await supabase
    .from("document_requests")
    .upsert(
      definitions.map((definition) => ({
        application_id: applicationId,
        document_type_key: definition.key,
        is_required: true,
        status: "requested" as const,
      })),
      { onConflict: "application_id,document_type_key", ignoreDuplicates: true },
    )
    .select("id");

  return inserted?.length ?? 0;
}
