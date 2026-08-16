import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Container } from "@/components/ui";
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
    .select("id, profile_id")
    .eq("public_token", token)
    .maybeSingle();

  if (!application) redirect("/start");

  // Already owned. Signing in is the only sensible path, and it's better to send
  // them there than to let them fill in a form that will be refused.
  if (application.profile_id) redirect("/sign-in?next=/dashboard");

  return (
    <Container>
      <div className="mx-auto max-w-lg">
        {/*
          NO PROGRESS BAR. This page is no longer step four of the prequal —
          that bar now completes on the results page, where the financing
          options it promised are actually delivered (see PREQUAL_FLOW_STEPS).

          Which means this screen has to earn the account on its own terms
          rather than by showing someone an unfinished bar. The heading and the
          line under it are doing that job: somewhere to upload documents and
          track the file. If this page's conversion drops, putting the bar back
          is the first experiment to run.
        */}
        {/*
          THE SAME STAGGERED ENTRANCE AS EVERY OTHER STEP — see /start,
          /start/prequal and the results page. This screen was the last one in
          the flow still arriving fully formed, which made it read as a
          different site rather than the next beat of the same one.

          Delays step in reading order: heading, the line under it, the form,
          then the note. The form is deliberately last of the three visible
          blocks, so the eye lands on what the page is asking for after it has
          been told why.

          CSS only. It costs nothing, runs on the compositor, works without
          hydration, and the blanket prefers-reduced-motion rule in globals.css
          already collapses it to an instant appearance.
        */}
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Create your account to continue
          </h1>
          <p className="animate-fade-in-up mt-4 leading-relaxed text-ink-600 [animation-delay:90ms]">
            This is where you&apos;ll upload documents, track where your
            application stands, and pick up where you left off.
          </p>
          {/*
            NO REFERENCE CODE, for the same reason it left the results page: it
            is a case number, and there is still no case. Nothing on this site
            accepts one, so it was a string the reader could not use, on the
            screen where the only thing that matters is finishing the form.

            It also leaks volume — the codes are sequential, so printing one
            tells any visitor how many applications there have been this year.
          */}
        </div>

        <Card className="animate-fade-in-up mt-8 [animation-delay:180ms]">
          <CreateAccountForm applicationToken={token} />
        </Card>

        <p className="animate-fade-in-up mt-6 text-sm leading-relaxed text-ink-500 [animation-delay:260ms]">
          Creating an account doesn&apos;t submit your application and is not an
          application for credit. Nothing here affects your credit score.
        </p>
      </div>
    </Container>
  );
}
