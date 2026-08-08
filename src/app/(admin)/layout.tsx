import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/sign-in/actions";

/**
 * Internal chrome.
 *
 * Gate is enforced in three places: proxy.ts redirects, this layout checks the
 * role, and RLS refuses the data. Only the third is load-bearing (spec §21) —
 * the first two exist so a customer who wanders in gets a clean redirect rather
 * than an empty screen.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "customer") redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <Container>
          <div className="flex h-16 items-center justify-between gap-6">
            <div className="flex items-center gap-8">
              <Link href="/admin" className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 place-items-center rounded-lg bg-brand-800 text-sm font-bold text-white"
                >
                  FLS
                </span>
                <span className="text-sm font-semibold text-ink-900">
                  Financial Lending Specialists
                </span>
              </Link>

              <nav aria-label="Admin">
                <ul className="flex items-center gap-5">
                  <li>
                    <Link
                      href="/admin"
                      className="text-sm font-medium text-ink-600 hover:text-brand-700"
                    >
                      Pipeline
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/admin/overview"
                      className="text-sm font-medium text-ink-600 hover:text-brand-700"
                    >
                      Overview
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-ink-600 sm:block">
                {profile.full_name ?? profile.email}
                <span className="ml-2 text-ink-400">({profile.role})</span>
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-sm font-medium text-ink-600 hover:text-brand-700"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </Container>
      </header>

      <main id="main" className="flex-1 py-8">
        {children}
      </main>
    </div>
  );
}
