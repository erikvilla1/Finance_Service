import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/sign-in/actions";

/**
 * Internal chrome.
 *
 * Gate is enforced in three places: proxy.ts redirects, this layout checks the
 * role, and RLS refuses the data. Only the third is load-bearing (spec §21) —
 * the first two exist so a customer who wanders in gets a clean redirect rather
 * than an empty screen.
 *
 * The sidebar and theme preferences are read here, on the server, and handed to
 * the shell as its initial state. Reading them in the browser instead would
 * mean every navigation renders the sidebar open and the theme light for a
 * frame before correcting itself.
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

  const jar = await cookies();

  return (
    <AdminShell
      // Open unless explicitly collapsed: a first-time visitor should see the
      // labels rather than a column of unexplained icons.
      defaultOpen={jar.get("fls_admin_sidebar")?.value !== "closed"}
      defaultDark={jar.get("fls_admin_theme")?.value === "dark"}
      userLabel={profile.full_name ?? profile.email ?? "Signed in"}
      role={profile.role}
      signOut={signOut}
    >
      {children}
    </AdminShell>
  );
}
