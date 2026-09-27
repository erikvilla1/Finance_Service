import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GrainGradient, LIGHT_GRADIENT } from "@/components/marketing/grain-gradient";
import { PortalShell } from "@/components/portal/portal-shell";

/**
 * Customer portal chrome: the sidebar shell (PortalShell) on the flow's cream
 * background, so signing up doesn't feel like landing in a different product.
 *
 * Distinct from the admin layout on purpose — nothing here hints that an
 * internal view exists. No pipeline links, no staff vocabulary.
 *
 * Reads only. The sidebar needs the applicant's most recent application (for
 * its Application / Documents / Sign links), filtered to their own profile
 * for the same reason the overview is: RLS answers "may see", not "is theirs".
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

  const [{ data: profile }, { data: latest }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).single(),
    supabase
      .from("applications")
      .select("id, signature_requested_at")
      .eq("profile_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // A document the specialist sent back ("Send another copy") puts a dot on
  // Documents, the way a signature request puts one on Sign.
  const { count: returnedDocuments } = latest
    ? await supabase
        .from("document_requests")
        .select("id", { count: "exact", head: true })
        .eq("application_id", latest.id)
        .eq("status", "rejected")
    : { count: 0 };

  return (
    <div className="relative min-h-dvh bg-ink-50">
      <GrainGradient className="fixed inset-0" {...LIGHT_GRADIENT} />
      <div className="relative">
        <PortalShell
          user={{
            id: user.id,
            name: profile?.full_name ?? null,
            email: profile?.email ?? user.email ?? null,
          }}
          applicationId={latest?.id ?? null}
          signatureRequested={Boolean(latest?.signature_requested_at)}
          documentsAttention={(returnedDocuments ?? 0) > 0}
        >
          <main id="main" className="min-h-dvh px-4 pb-10 pt-8 sm:px-8 lg:px-12 lg:pt-12">
            {/* No "not a commitment to lend" line here. Nothing in the
                dashboard is an offer or a match; the notice lives on the
                results page, where matches are shown, and in Terms §3 and
                the Disclosures page. */}
            {children}
          </main>
        </PortalShell>
      </div>
    </div>
  );
}
