import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Container,
  EmptyState,
  ProgressBar,
} from "@/components/ui";
import { QuestionField } from "@/components/application/question-field";
import { SubmitButton } from "@/components/application/submit-button";
import { TimezoneField } from "@/components/application/timezone-field";
import { loadQuestions } from "@/lib/questions";
import { isNarrow, splitPrequal } from "@/lib/questions/prequal-layout";
import { findGoal } from "@/lib/products/goals";
import { submitPrequal } from "./actions";

export const metadata: Metadata = {
  title: "See your financing options",
  robots: { index: false, follow: false },
};

/**
 * Tier one of the two-tier prequalification.
 *
 * Six questions, no PII, no documents. This is the lead-capture surface, so
 * every extra field costs conversion — the full application (tier two) is where
 * detail belongs.
 *
 * Questions come from the database, not from this file (spec §9). Adding one is
 * an insert, not a deploy.
 */
export default async function PrequalPage({
  searchParams,
}: {
  searchParams: Promise<{ goal?: string }>;
}) {
  const params = await searchParams;
  const goal = findGoal(params.goal);

  // The goal lives only in the query string, so anything that drops it — a
  // failed submission reloading the page, a truncated shared link, a typo —
  // lands here. Send them back to pick a goal rather than showing a 404.
  // A dead end mid-application is a lost applicant.
  if (!goal) redirect("/start");

  const questions = await loadQuestions(["prequal"], goal.likelyTrack);

  // What the engine reads, and what merely helps. See prequal-layout.ts — the
  // split is derived from requiredness, so it follows the database rather than
  // needing to be maintained here.
  const { essential, details } = splitPrequal(questions);

  // Idempotency key for this form render (migration 0018). Minted here rather
  // than in the browser so it cannot be replayed or omitted by the client, and
  // per render rather than per session so a deliberate second application —
  // reloading the page and filling it in again — is still allowed through.
  const submissionToken = crypto.randomUUID();

  return (
    <Container>
      <div className="mx-auto max-w-2xl">
        <ProgressBar value={2} max={4} label="Your application" />

        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            {goal.label}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Tell us about your situation
          </h1>
          <p className="mt-4 leading-relaxed text-ink-600">
            {essential.length} quick questions. No documents, and nothing here
            affects your credit.
          </p>
        </div>

        {questions.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="This form isn't available right now"
              description="Please try again shortly, or speak with a financing specialist."
            />
          </div>
        ) : (
          <form action={submitPrequal} className="mt-8 space-y-6">
            <input type="hidden" name="goal" value={goal.slug} />
            <input
              type="hidden"
              name="submission_token"
              value={submissionToken}
            />
            <TimezoneField />

            {/* Short controls pair up; free text keeps the full width. Two
                columns is what takes fifteen stacked rows down to a form the
                applicant can see the end of. */}
            <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              {essential.map((question) => (
                <div
                  key={question.key}
                  className={isNarrow(question) ? undefined : "sm:col-span-2"}
                >
                  <QuestionField question={question} />
                </div>
              ))}
            </div>

            {details.length > 0 && (
              /* Collapsed, but still submitted — a closed <details> posts its
                 inputs like any other. Open by default would defeat the point;
                 removed entirely would cost Robert the fields that make a
                 match specific. */
              <details className="group rounded-lg border border-ink-200 bg-ink-50/60">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-sm font-medium text-ink-800 [&::-webkit-details-marker]:hidden">
                  <span>
                    Add more detail for a closer match
                    <span className="ml-2 font-normal text-ink-500">
                      optional
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-ink-400 transition-transform duration-200 group-open:rotate-180"
                  >
                    ▾
                  </span>
                </summary>

                <div className="border-t border-ink-200 px-4 py-5">
                  <p className="mb-5 text-sm leading-relaxed text-ink-500">
                    None of this is required, and leaving it blank won&apos;t
                    hold anything up. It helps a specialist narrow the options
                    before you speak.
                  </p>

                  <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
                    {details.map((question) => (
                      <div
                        key={question.key}
                        className={
                          isNarrow(question) ? undefined : "sm:col-span-2"
                        }
                      >
                        <QuestionField question={question} />
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            )}

            <div className="border-t border-ink-200 pt-6">
              <SubmitButton>See my financing options</SubmitButton>
              <p className="mt-4 text-sm leading-relaxed text-ink-500">
                Submitting this does not affect your credit and is not an
                application for credit. A financing specialist reviews every
                submission.
              </p>
            </div>
          </form>
        )}
      </div>
    </Container>
  );
}
