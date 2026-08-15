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
        {/*
          Staggered entrance, the same one the marketing hero uses, so arriving
          here after clicking through from the home page feels like a
          continuation rather than a page swap.

          CSS animation rather than anything JavaScript: it costs nothing, runs
          on the compositor, works without hydration, and the blanket
          prefers-reduced-motion rule in globals.css already collapses it to an
          instant appearance. The delays step in reading order — progress, then
          question, then the note under it, then the options.
        */}
        <div className="animate-fade-in-up">
          <ProgressBar value={1} max={4} label="Your application" />
        </div>

        <div className="mt-10">
          <h1 className="animate-fade-in-up text-4xl font-bold tracking-tight text-ink-900 [animation-delay:90ms] sm:text-5xl">
            What are you looking to accomplish?
          </h1>
          <p className="animate-fade-in-up mt-4 max-w-xl leading-relaxed text-ink-600 [animation-delay:170ms]">
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
            {FINANCING_GOALS.map((goal, index) => (
              <li
                key={goal.slug}
                className="animate-fade-in-up h-full"
                // 40ms apart: nine tiles at the 90ms spacing used above would
                // still be arriving most of a second after the heading, which
                // reads as slow rather than considered.
                style={{ animationDelay: `${250 + index * 40}ms` }}
              >
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
