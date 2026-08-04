import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Supabase client for browser/client components.
 *
 * Uses the anon key, so every query is subject to Row Level Security.
 * Platform spec §21: never rely on frontend authorization alone — the policies
 * in migration 0005 are the real boundary.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
