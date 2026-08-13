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
      <div className="mx-auto max-w-3xl">
        <ProgressBar value={1} max={4} label="Your application" />

        <div className="mt-8">
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
