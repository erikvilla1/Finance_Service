import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container, EmptyState, ProgressBar } from "@/components/ui";
import { PrequalWizard } from "@/components/application/prequal-wizard";
import { TimezoneField } from "@/components/application/timezone-field";
import { loadQuestions } from "@/lib/questions";
import { splitPrequal } from "@/lib/questions/prequal-layout";
import { findGoal } from "@/lib/products/goals";
import { submitPrequal } from "./actions";

/**
 * The wizard's fallback, expressed as CSS rather than as a second render.
 *
 * PrequalWizard hides inactive steps with a class and never unmounts them, so
 * without JavaScript the whole form is already in the document — it is just
 * display:none with a Next button that does nothing. Revealing every step and
 * dropping the wizard chrome turns it back into the plain stacked form this
 * page used to be, which submits natively.
 *
 * A <noscript> block is used rather than a second copy of the fields because
 * duplicate controls would post duplicate values, and because the browser
 * parses noscript children as text when scripting is on — a real form in here
 * would be a hydration mismatch waiting to happen. A stylesheet is inert either
 * way.
 */
const NO_JS_STYLES = `<style>
  [data-prequal-step]{display:block!important;opacity:1!important}
  [data-prequal-step]+[data-prequal-step]{margin-top:1.5rem}
  [data-prequal-nav]{display:none!important}
  [data-prequal-submit]{display:block!important;margin-top:2rem;border-top:1px solid var(--color-ink-200);padding-top:1.5rem}
</style>`;

export const metadata: Metadata = {
  title: "See your financing options",
  robots: { index: false, follow: false },
};

/**
 * Tier one of the two-tier prequalification.
 *
 * No PII, no documents. This is the lead-capture surface, so every extra field
 * costs conversion — the full application (tier two) is where detail belongs.
 *
 * Asked one question at a time (see PrequalWizard). The question count is the
 * same as it was stacked; what changes is that the applicant is never looking
 * at more than one of them, which is the difference between a form and a
 * conversation.
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
  //
  // ONLY THE ESSENTIAL HALF IS ASKED. `details` is deliberately discarded: tier
  // one has no optional questions any more. The seven it contains — legal
  // business name, industry, urgency, existing balance, monthly debt payments,
  // asset value, asset debt — are read by no rule in any ruleset, so dropping
  // them changes no result the engine produces.
  //
  // WHAT IT DOES COST. Nothing else asks for them. The full application loads
  // core_business, financial_snapshot, the track modules and owner — not
  // prequal — so these seven are now collected by a specialist on the phone or
  // not at all. That is a deliberate trade of specialist convenience for a
  // shorter form, not an oversight. If any of them are worth keeping, the fix
  // is to move them into a tier-two module rather than to reopen this section.
  const { essential } = splitPrequal(questions);

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
          <form action={submitPrequal} className="mt-8">
            <noscript dangerouslySetInnerHTML={{ __html: NO_JS_STYLES }} />
            <input type="hidden" name="goal" value={goal.slug} />
            <input
              type="hidden"
              name="submission_token"
              value={submissionToken}
            />
            <TimezoneField />

            <PrequalWizard essential={essential} />
          </form>
        )}
      </div>
    </Container>
  );
}
