import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Supabase client for server components, route handlers, and server actions.
 * Still subject to RLS — this is the authenticated user's client.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware refreshes the session,
            // so this is safe to ignore.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. BYPASSES ROW LEVEL SECURITY.
 *
 * Only for server-side operations that legitimately need to act outside a
 * user's permissions:
 *   • writing qualification_results (the engine's output is not user-writable)
 *   • creating applications for anonymous prequalification
 *   • writing audit_logs
 *
 * Never import this into a client component. Never pass its results to the
 * browser without filtering. Every call site should be reviewable in one sitting
 * — if this starts appearing in many files, something has gone wrong.
 */
export function createServiceRoleClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. This client cannot be used.",
    );
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
