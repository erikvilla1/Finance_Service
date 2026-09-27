import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container, EmptyState } from "@/components/ui";
import { ObjectiveWizard } from "@/components/application/objective-wizard";
import { PrequalFlowProgress } from "@/components/application/prequal-progress";
import { PrequalStage } from "@/components/application/prequal-stage";
import { TimezoneField } from "@/components/application/timezone-field";
import { resolveGoal } from "@/lib/matching/objectives";
import { questionsFor, sectionsFor } from "@/lib/matching/questions";
import { submitPrequal, submitPrequalForResult } from "./actions";

/**
 * The wizard's fallback, expressed as CSS rather than as a second render.
 *
 * ObjectiveWizard hides inactive steps with a class and never unmounts them, so
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
 * Tier one of the two-tier prequalification: the objective's questionnaire
 * (spec v1.1 §4-6).
 *
 * No PII, no documents. This is the lead-capture surface, so every extra field
 * costs conversion — the full application (tier two) is where detail belongs.
 *
 * The questions are configuration (src/lib/matching/questions.ts): the
 * universal profile, then the branch for the objective chosen on /start. The
 * branch is what makes each objective's form its own — equipment asks about
 * the equipment, real estate about the property, debt refinance about the
 * positions being replaced — and conditional questions appear only when an
 * earlier answer makes them relevant (see ObjectiveWizard).
 */
export default async function PrequalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const goalParam = typeof params.goal === "string" ? params.goal : null;
  const resolved = resolveGoal(goalParam);

  // The goal lives only in the query string, so anything that drops it — a
  // failed submission reloading the page, a truncated shared link, a typo —
  // lands here. Send them back to pick a goal rather than showing a 404.
  // A dead end mid-application is a lost applicant.
  if (!resolved) redirect("/start");

  const { objective } = resolved;
  const fields = questionsFor(objective.id);

  // Answers a link already knows (a guide that is specifically about fix &
  // flip). Accepted only for this objective's single-choice questions, and
  // only as one of that question's own options, so a hand-edited URL can
  // skip a question but never post a value the form couldn't have.
  const prefill: Record<string, string> = { ...resolved.prefill };
  for (const field of fields) {
    const value = params[field.id];
    if (
      field.type === "single_select" &&
      typeof value === "string" &&
      field.options?.some((option) => option.value === value)
    ) {
      prefill[field.id] = value;
    }
  }

  // Idempotency key for this form render (migration 0018). Minted here rather
  // than in the browser so it cannot be replayed or omitted by the client, and
  // per render rather than per session so a deliberate second application —
  // reloading the page and filling it in again — is still allowed through.
  const submissionToken = crypto.randomUUID();

  const header = (
    <div className="mt-8">
      <p className="animate-fade-in-up text-sm font-semibold uppercase tracking-wider text-brand-600 [animation-delay:90ms]">
        {objective.label}
      </p>
      <h1 className="animate-fade-in-up mt-2 text-3xl font-bold tracking-tight text-ink-900 [animation-delay:150ms] sm:text-4xl">
        Tell us about your situation
      </h1>
      <p className="animate-fade-in-up mt-4 leading-relaxed text-ink-600 [animation-delay:220ms]">
        A few quick questions about your business and what you need. No
        documents, and nothing here affects your credit.
      </p>
    </div>
  );

  return (
    <Container>
      <div className="mx-auto max-w-2xl">
        {/* Same staggered entrance as step 1, in the same reading order, so
            moving between the two steps feels like one flow rather than two
            pages. CSS only — see the note on /start. */}
        <div className="animate-fade-in-up">
          <PrequalFlowProgress />
        </div>

        {fields.length === 0 ? (
          <>
            {header}
            <div className="mt-8">
              <EmptyState
                title="This form isn't available right now"
                description="Please try again shortly, or speak with a financing specialist."
              />
            </div>
          </>
        ) : (
          // The heading and form fade out together on submit, into the
          // loading state that leads to the results page (PrequalStage).
          <PrequalStage
            header={header}
            action={submitPrequal}
            submitForResult={submitPrequalForResult}
          >
            <noscript dangerouslySetInnerHTML={{ __html: NO_JS_STYLES }} />
            <input type="hidden" name="objective" value={objective.id} />
            <input
              type="hidden"
              name="submission_token"
              value={submissionToken}
            />
            <TimezoneField />

            <ObjectiveWizard
              fields={fields}
              sections={sectionsFor(objective.id)}
              prefill={prefill}
            />
          </PrequalStage>
        )}
      </div>
    </Container>
  );
}
