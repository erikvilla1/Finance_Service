import type { Metadata } from "next";
import {
  Card,
  Container,
  IndicativeDisclosure,
  ProgressBar,
  SelectableCard,
} from "@/components/ui";
import { FINANCING_GOALS, findGoal } from "@/lib/products/goals";

export const metadata: Metadata = {
  title: "Start Your Application",
  robots: { index: false, follow: false },
};

/**
 * Application entry point — STEP 1 of the flow in platform spec §8.
 *
 * SCAFFOLD. The goal step is real; steps 2 onward are not built yet. They are
 * blocked on the question configuration, which in turn depends on the Phase-0
 * session (BUSINESS_CONTEXT §13.1) and on the two-tier prequal decision still
 * open between spec §8 and BUSINESS_CONTEXT §4.
 *
 * The design intent, per spec §8: never one giant form. Each step asks only
 * what the previous answers make relevant.
 */
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ goal?: string; product?: string }>;
}) {
  const params = await searchParams;
  const selectedGoal = findGoal(params.goal);

  return (
    <Container>
      <div className="mx-auto max-w-3xl">
        <ProgressBar
          value={selectedGoal ? 1 : 0}
          max={6}
          label="Your application"
        />

        <div className="mt-8">
          {!selectedGoal ? (
            <>
              <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
                What are you looking to accomplish?
              </h1>
              <p className="mt-4 leading-relaxed text-ink-600">
                Pick whichever is closest. You can change it later, and you
                don&apos;t need to know the name of the loan product.
              </p>

              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {FINANCING_GOALS.map((goal) => (
                  <li key={goal.slug} className="h-full">
                    <SelectableCard
                      href={`/start?goal=${goal.slug}`}
                      title={goal.label}
                      description={goal.description}
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
                {selectedGoal.label}
              </h1>
              <p className="mt-4 leading-relaxed text-ink-600">
                {selectedGoal.description}
              </p>

              <Card className="mt-8">
                <h2 className="text-base font-semibold text-ink-900">
                  Next: a few questions about your situation
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  This is where the adaptive questionnaire continues — amount,
                  time in business, revenue range, and credit range, followed by
                  questions specific to your goal.
                </p>

                <div className="mt-5 rounded-lg bg-warning-50 p-4">
                  <p className="text-sm font-semibold text-warning-700">
                    Not built yet
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
                    The question set is configuration-driven and lives in the
                    database. It is waiting on confirmed qualification thresholds
                    before it can produce an honest result.
                  </p>
                </div>
              </Card>

              <div className="mt-6">
                <IndicativeDisclosure />
              </div>

              <p className="mt-6 text-sm text-ink-500">
                Selected track:{" "}
                <span className="font-medium text-ink-700">
                  {selectedGoal.likelyTrack ?? "to be determined"}
                </span>
              </p>
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
