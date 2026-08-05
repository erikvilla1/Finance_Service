import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Button,
  Container,
  EmptyState,
  ProgressBar,
} from "@/components/ui";
import { QuestionField } from "@/components/application/question-field";
import { loadQuestions } from "@/lib/questions";
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

  return (
    <Container>
      <div className="mx-auto max-w-2xl">
        <ProgressBar value={2} max={6} label="Your application" />

        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            {goal.label}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Tell us about your situation
          </h1>
          <p className="mt-4 leading-relaxed text-ink-600">
            A few quick questions. No documents, and nothing here affects your
            credit.
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

            {questions.map((question) => (
              <QuestionField key={question.key} question={question} />
            ))}

            <div className="border-t border-ink-200 pt-6">
              <Button type="submit" size="lg" className="w-full sm:w-auto">
                See my financing options
              </Button>
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
