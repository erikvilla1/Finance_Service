"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { reportSubmitted } from "@/components/application/prequal-progress";
import { MessageLoading } from "@/components/ui/message-loading";

/**
 * The questionnaire's heading and form, and what happens between "See my
 * financing options" and the results page.
 *
 * THE SEQUENCE, ON PURPOSE:
 *   1. the page's bar completes to "3 of 3" and lands its check
 *   2. the heading and form fade out
 *   3. a loading state: "Finding your financing options", with what's being
 *      done underneath
 *   4. the results page
 *
 * The answers are saved and matched while this plays (submitForResult runs
 * from the first frame), and the page moves on only when both the server has
 * answered and MIN_MS has passed. The floor is deliberate: a result that
 * appears the instant the button is pressed reads as a canned page rather
 * than an evaluation of what was just entered, and the finished bar needs a
 * beat to register. The lines under the spinner describe what the server is
 * actually doing.
 *
 * NO JAVASCRIPT: onSubmit never runs, the form posts natively to its own
 * action (submitPrequal), and that redirects straight to the result.
 */

/** Bar fill (500ms) plus its check (800ms delay + 420ms), roughly. */
const FINISH_MS = 1100;
/** From the click to the results page, at the least. */
const MIN_MS = 5200;

/** One every STATUS_MS; the last holds until the results page arrives. */
const STATUS_LINES = [
  "Reviewing your answers",
  "Comparing financing programs",
  "Checking each program's guidelines",
  "Preparing your results",
];
const STATUS_MS = 1200;

type Phase = "form" | "finishing" | "generating";

export function PrequalStage({
  header,
  action,
  submitForResult,
  children,
}: {
  header: ReactNode;
  /** The native form action, for the no-JavaScript path. */
  action: (formData: FormData) => Promise<void>;
  /** The same submission, returning the result token instead of redirecting. */
  submitForResult: (formData: FormData) => Promise<{ token: string }>;
  children: ReactNode;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Stops React running `action` too; the scripted path takes over.
    event.preventDefault();
    if (phase !== "form") return;

    const data = new FormData(event.currentTarget);
    setError(null);
    setPhase("finishing");
    reportSubmitted(true);

    const floor = new Promise((resolve) => window.setTimeout(resolve, MIN_MS));
    const toLoading = window.setTimeout(() => setPhase("generating"), FINISH_MS);

    try {
      const [{ token }] = await Promise.all([submitForResult(data), floor]);
      router.push(`/start/result/${token}`);
    } catch {
      window.clearTimeout(toLoading);
      reportSubmitted(false);
      setPhase("form");
      setError("Something went wrong submitting your answers. Please try again.");
    }
  }

  return (
    <div>
      <div
        className={
          phase === "generating"
            ? "hidden"
            : phase === "finishing"
              ? "opacity-0 transition-opacity delay-300 duration-500"
              : "transition-opacity duration-300"
        }
      >
        {header}
        <form action={action} onSubmit={handleSubmit} className="mt-8">
          {children}
        </form>
        {error && (
          <p role="alert" className="mt-4 text-sm font-medium text-danger-700">
            {error}
          </p>
        )}
      </div>

      {phase === "generating" && <Generating />}
    </div>
  );
}

function Generating() {
  const [line, setLine] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setLine((current) => Math.min(current + 1, STATUS_LINES.length - 1)),
      STATUS_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-fade-in-up flex flex-col items-center py-20 text-center sm:py-28"
    >
      {/* Three dots rising in turn. No logo: the header already carries it. */}
      <MessageLoading className="h-12 w-12 text-brand-900" />
      <p className="mt-5 text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">
        Finding your financing options
      </p>
      {/* Keyed so each line replays the entrance as it changes. */}
      <p key={line} className="animate-fade-in-up mt-2 text-sm text-ink-500">
        {STATUS_LINES[line]}…
      </p>
    </div>
  );
}
