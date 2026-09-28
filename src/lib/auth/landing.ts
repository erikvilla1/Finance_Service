import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Where a freshly-authenticated person belongs: staff to the pipeline,
 * customers to their own file.
 *
 * WHY THIS IS A FUNCTION AND NOT THREE TERNARIES. It was three ternaries —
 * one on the sign-in page (for someone already signed in who visits it
 * again), one in the sign-in action, one after a password reset — and two of
 * the three were wrong, hardcoding "/dashboard" regardless of role. Signing
 * in as an admin therefore landed on the customer portal, and the only way to
 * the pipeline was typing /admin into the address bar.
 *
 * Getting that wrong is easy precisely because it is a one-liner: each site
 * looks obviously correct on its own, and nothing points out that the other
 * two disagree.
 *
 * `role !== "customer"` RATHER THAN `=== "admin"`. Specialist and manager are
 * staff too — the (admin) layout and proxy.ts both admit all three — so
 * testing for the one role that is *not* staff means a new staff role added
 * to the enum works here without an edit. That is the same test the layout
 * makes, and the reason the two cannot drift.
 *
 * NOT A SECURITY BOUNDARY. This chooses a landing page; it grants nothing.
 * Access to /admin is refused by proxy.ts, then by the (admin) layout's own
 * role check, then by RLS at the data layer (spec §21) — and only the last of
 * those is load-bearing. A customer sent here by a crafted `next` parameter
 * still gets bounced.
 */
export async function landingPathFor(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<"/admin" | "/dashboard"> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  // No profile row is the safe-by-default case: send them to the customer
  // side rather than the pipeline. The signup trigger creates one for every
  // account, so this is the "something is wrong" branch, not a normal path.
  return profile && profile.role !== "customer" ? "/admin" : "/dashboard";
}
