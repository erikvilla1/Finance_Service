import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Container, ProgressBar } from "@/components/ui";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { CreateAccountForm } from "./create-account-form";

export const metadata: Metadata = {
  title: "Create your account",
  robots: { index: false, follow: false },
};

/**
 * The account wall.
 *
 * Placed AFTER the applicant has seen their indicative options, never before.
 * The estimate is what earns the account — asking someone to register before
 * they know whether it was worth their time is how a lead-capture form gets
 * abandoned (BUSINESS_CONTEXT §2).
 *
 * Lives in the (application) group so it keeps the stripped-down flow chrome.
 * This is step five of one continuous journey, not a detour into an auth area.
 *
 * Reads on the service role because the applicant is still anonymous here — the
 * account they are about to create is the whole point. Only the token-matched
 * row is fetched and nothing sensitive is rendered.
 */
export default async function CreateAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ application?: string }>;
}) {
  const params = await searchParams;
  const token = params.application?.trim() ?? "";

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // No usable token means we cannot tell which application to attach. Send them
  // back to the start rather than showing a form that is guaranteed to fail.
  if (!uuidPattern.test(token)) redirect("/start");

  const supabase = createServiceRoleClient();
  const { data: application } = await supabase
    .from("applications")
    .select("reference_code, financing_goal, profile_id")
    .eq("public_token", token)
    .maybeSingle();

  if (!application) redirect("/start");

  // Already owned. Signing in is the only sensible path, and it's better to send
  // them there than to let them fill in a form that will be refused.
  if (application.profile_id) redirect("/sign-in?next=/dashboard");

  return (
    <Container>
      <div className="mx-auto max-w-lg">
        <ProgressBar value={4} max={4} label="Your application" />

        <div className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Create your account to continue
          </h1>
          <p className="mt-4 leading-relaxed text-ink-600">
            This is where you&apos;ll upload documents, track where your
            application stands, and pick up where you left off.
          </p>
          <p className="mt-3 font-mono text-sm text-ink-500">
            Application {application.reference_code}
            {application.financing_goal ? ` · ${application.financing_goal}` : ""}
          </p>
        </div>

        <Card className="mt-8">
          <CreateAccountForm applicationToken={token} />
        </Card>

        <p className="mt-6 text-sm leading-relaxed text-ink-500">
          Creating an account doesn&apos;t submit your application and is not an
          application for credit. Nothing here affects your credit score.
        </p>
      </div>
    </Container>
  );
}
