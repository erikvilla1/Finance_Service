import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/sign-in/actions";

/**
 * Customer portal chrome.
 *
 * Distinct from the admin layout on purpose — nothing here hints that an
 * internal view exists. No pipeline links, no staff vocabulary.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?next=/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" aria-label="Financial Lending Specialists" className="flex items-center">
              <Image
                src="/brand/fls-logo-icon.png"
                alt=""
                width={824}
                height={714}
                className="h-10 w-auto max-w-none shrink-0 sm:hidden"
              />
              <Image
                src="/brand/fls-logo-full.png"
                alt=""
                width={2613}
                height={527}
                className="hidden h-11 w-auto max-w-none shrink-0 sm:block"
              />
            </Link>

            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-ink-600 sm:block">
                {profile?.full_name ?? profile?.email}
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

      <main id="main" className="flex-1 py-10">
        {children}
      </main>

      <footer className="border-t border-ink-200 bg-white py-6">
        <Container>
          <p className="text-xs leading-relaxed text-ink-500">
            Nothing shown here is a commitment to lend or an offer of credit.
            All financing is subject to qualification, lender review, and program
            availability.
          </p>
        </Container>
      </footer>
    </div>
  );
}
