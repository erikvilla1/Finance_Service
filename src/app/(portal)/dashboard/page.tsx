import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Badge,
  ButtonLink,
  Card,
  Container,
  EmptyState,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your Dashboard",
  robots: { index: false, follow: false },
};

/**
 * Customer portal home.
 *
 * SCAFFOLD, but the data path is real: this queries applications through RLS,
 * so a signed-in customer sees only their own rows. The document checklist and
 * status tracker (BUSINESS_CONTEXT §8) are Phase 2.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?next=/dashboard");

  const { data: applications } = await supabase
    .from("applications")
    .select("id, reference_code, status, financing_goal, requested_amount, created_at")
    .order("created_at", { ascending: false });

  return (
    <main id="main" className="min-h-dvh bg-ink-50 py-12">
      <Container>
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">
          Your applications
        </h1>

        <div className="mt-8">
          {(applications?.length ?? 0) === 0 ? (
            <EmptyState
              title="No applications yet"
              description="When you start an application, it will appear here along with anything we need from you."
              action={<ButtonLink href="/start">See My Financing Options</ButtonLink>}
            />
          ) : (
            <ul className="space-y-4">
              {(applications ?? []).map((application) => (
                <Card as="li" key={application.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-sm text-ink-500">
                        {application.reference_code}
                      </p>
                      <h2 className="mt-1 text-base font-semibold text-ink-900">
                        {application.financing_goal ?? "Financing application"}
                      </h2>
                    </div>
                    <Badge tone="brand">
                      {application.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                </Card>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </main>
  );
}
