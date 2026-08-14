import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container, ProgressBar, SelectableCard } from "@/components/ui";
import { FINANCING_GOALS, findGoal } from "@/lib/products/goals";

export const metadata: Metadata = {
  title: "Start your application",
  robots: { index: false, follow: false },
};

/**
 * Step one — the goal (platform spec §8 STEP 1).
 *
 * "The customer should not have to understand the financial industry before
 * asking for help" (spec §2), so the entry point is a plain-language goal, not
 * a product name.
 *
 * Arriving with ?goal= already set (from the homepage selector) skips straight
 * to the questions rather than asking the same thing twice.
 */
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ goal?: string }>;
}) {
  const params = await searchParams;
  const preselected = findGoal(params.goal);

  if (preselected) {
    redirect(`/start/prequal?goal=${preselected.slug}`);
  }

  return (
    <Container>
      <div className="mx-auto max-w-5xl">
        <ProgressBar value={1} max={4} label="Your application" />

        <div className="mt-10">
          <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
            What are you looking to accomplish?
          </h1>
          <p className="mt-4 max-w-xl leading-relaxed text-ink-600">
            Pick whichever is closest. You can change it later, and you
            don&apos;t need to know the name of the loan product.
          </p>

          {/*
            Compact tiles rather than the marketing card. Nine options at the
            roomy density pushed the last few below the fold, which reads as a
            longer form than it is — and the honest step count is the whole
            point of this screen.

            Three across because there are nine goals: it divides evenly and
            no option is left stranded alone on a final row, which reads as an
            afterthought rather than a choice. Adding a tenth goal breaks that
            — go to two columns, or add an eleventh and twelfth.
          */}
          {/* auto-rows-fr so every row is the height of the tallest tile in
              the grid rather than the tallest in its own row — "I'm Not Sure"
              wraps to two lines and would otherwise make its row taller than
              the two above it. */}
          <ul className="mt-8 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FINANCING_GOALS.map((goal) => (
              <li key={goal.slug} className="h-full">
                <SelectableCard
                  compact
                  href={`/start/prequal?goal=${goal.slug}`}
                  title={goal.label}
                  description={goal.description}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Container>
  );
}
