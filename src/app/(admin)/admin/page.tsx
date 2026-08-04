import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Container, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * Internal dashboard.
 *
 * SCAFFOLD. Deliberately minimal: the CRM decision is deferred
 * (BUSINESS_CONTEXT §14.1), so this shows pipeline counts without committing to
 * a CRM shape. Building a full pipeline UI now would prejudge that decision.
 *
 * Access is gated three ways: middleware redirect, the check below, and RLS.
 * Only the third one actually matters.
 */
export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "customer") redirect("/dashboard");

  const { data: applications } = await supabase
    .from("applications")
    .select("id, status")
    .is("deleted_at", null);

  const counts = new Map<string, number>();
  for (const application of applications ?? []) {
    counts.set(application.status, (counts.get(application.status) ?? 0) + 1);
  }

  return (
    <main id="main" className="min-h-dvh bg-ink-50 py-12">
      <Container>
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">
          Pipeline
        </h1>
        <p className="mt-2 text-ink-600">
          Signed in as {profile.full_name ?? user.email} ({profile.role})
        </p>

        <div className="mt-8">
          {(applications?.length ?? 0) === 0 ? (
            <EmptyState
              title="No applications yet"
              description="Submitted applications will appear here for review and assignment."
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...counts.entries()].map(([status, count]) => (
                <Card as="li" key={status}>
                  <p className="text-sm capitalize text-ink-600">
                    {status.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-ink-900">
                    {count}
                  </p>
                </Card>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </main>
  );
}
