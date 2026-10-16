"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RemoveLenderResult = { ok: true } | { ok: false; error: string };

/**
 * Remove a lender from the book.
 *
 * A SOFT DELETE, FOR TWO REASONS. lender_submissions references lenders with
 * ON DELETE RESTRICT, so a lender anything was ever sent to cannot be hard
 * deleted at all; and the record of what went where is the most reusable
 * information in the business (0031), which a mistyped contact email is no
 * reason to lose. deleted_at is set: the page stops listing them,
 * suggestLenders stops suggesting them, and every past submission still
 * shows their name, because loadSubmissions fetches lenders by id whether
 * or not they are deleted.
 *
 * THE NAME IS FREE AGAIN STRAIGHT AWAY (0039). The usual reason to remove a
 * lender is having entered the details wrong, and the fix is to add it back
 * properly, under the same name.
 *
 * Staff only, checked the same way the other admin actions check it. The
 * table has no customer policy, so RLS would refuse anyway; the check is
 * here so the refusal has words.
 */
export async function removeLender(lenderId: string): Promise<RemoveLenderResult> {
  if (!UUID_PATTERN.test(lenderId)) {
    return { ok: false, error: "That lender could not be found." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "customer") return { ok: false, error: "Not permitted." };

  const { data, error } = await supabase
    .from("lenders")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", lenderId)
    .is("deleted_at", null)
    .select("id");

  if (error) {
    return { ok: false, error: "Could not remove that lender just now. Please try again." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "That lender is no longer on the list." };
  }

  revalidatePath("/admin/lenders");
  revalidatePath("/admin");
  return { ok: true };
}
