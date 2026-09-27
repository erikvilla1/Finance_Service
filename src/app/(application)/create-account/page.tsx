import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Container } from "@/components/ui";
import { TypeIn } from "@/components/ui/type-in";
import { VideoBackdrop } from "@/components/application/video-backdrop";
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
    <>
      {/* The results page's footage, easing lighter on arrival. */}
      <VideoBackdrop />
      {/*
        ONE SCREEN, CENTRED IN IT. The negative top margin cancels the
        layout's header and main top padding (mobile 80 + 40, sm 100 + 56;
        the same numbers the results page uses) and the negative bottom
        margin cancels main's bottom padding, so this box is exactly the
        window: it starts at the top, min-h-dvh makes it the window's height,
        justify-center does the rest, and with the footer hidden on this page
        (globals.css) nothing sits below it to scroll to. A window too short
        for the form still grows and scrolls rather than cutting it off.
        Below lg the column is wide enough to run under the logo, so the top
        padding clears the header there.
      */}
      <Container className="relative z-10 -mb-8 -mt-[120px] flex min-h-dvh flex-col justify-center pb-8 pt-24 sm:-mb-10 sm:-mt-[156px] sm:pt-28 lg:pt-8 [@media(max-height:960px)]:pb-5 [@media(max-height:960px)]:lg:pt-5">
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
          {/* Centred, and the heading types itself in (TypeIn, about a
              second). The line under it, the form and the note follow just
              behind, so the form is there before the heading has quite
              finished rather than waiting on an animation. */}
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white [text-shadow:0_1px_16px_rgb(0_0_0/0.35)] sm:text-4xl">
              <TypeIn text="Create your account to continue" delayMs={150} />
            </h1>
            <p className="animate-rise mx-auto mt-4 max-w-md leading-relaxed text-white/85 [animation-delay:550ms] [text-shadow:0_1px_12px_rgb(0_0_0/0.35)]">
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

          <Card className="animate-rise mt-8 [animation-delay:700ms] [@media(max-height:960px)]:mt-6">
            <CreateAccountForm applicationToken={token} />
          </Card>

          {/*
            NO SMALL PRINT UNDER THE FORM. There were two lines here: that
            creating an account isn't an application for credit, and the
            flow footer's "nothing on this site is a commitment to lend".
            The first is already said beside the button that led here; the
            second is Terms of Use §3 ("Nothing here is an offer of credit"),
            which this form's own checkbox has the applicant agree to. The
            flow footer stays hidden on this page (data-dark-bg).
          */}
        </div>
      </Container>
    </>
  );
}
