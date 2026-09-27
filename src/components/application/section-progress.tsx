"use client";

import { Check, ChevronRight } from "lucide-react";

/**
 * Where the applicant is in the questionnaire, as one line of text:
 * "✓ Your business  ›  The acquisition · 2 of 10".
 *
 * WHY NOT CIRCLES OR BARS. One numbered circle per question suited a fixed
 * eight-question form; at fourteen-plus it wrapped onto two lines, and the
 * count moves as follow-up questions appear. Section bars fixed that but
 * stacked two more bars under the page's own. The page's bar now carries the
 * visual progress (see PrequalFlowProgress); this line says which part of the
 * form you're in and how far through it.
 *
 * Finished sections can be clicked to jump back to their first question.
 * Sections not yet reached can't be, for the same reason the old tracker
 * disabled future steps: skipping ahead would skip questions the result
 * depends on.
 */

export interface ProgressSection {
  title: string;
  /** Index of this section's first question in the visible step list. */
  start: number;
  /** How many of the visible steps belong to it. */
  count: number;
}

export function SectionProgress({
  sections,
  current,
  complete,
  onSelect,
}: {
  sections: ProgressSection[];
  /** Zero-based index of the question on screen. */
  current: number;
  /** Every required question answered on the last step. */
  complete: boolean;
  onSelect: (index: number) => void;
}) {
  const visible = sections.filter((section) => section.count > 0);

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" aria-label="Question progress">
      {visible.map((section, i) => {
        const end = section.start + section.count;
        const done = complete || current >= end;
        const active = !done && current >= section.start;
        const position = current - section.start + 1;

        return (
          <li key={section.title} className="flex items-center gap-2">
            {i > 0 && (
              <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-300" />
            )}
            {done ? (
              <button
                type="button"
                onClick={() => onSelect(section.start)}
                aria-label={`${section.title}: done. Go back to this section`}
                className="inline-flex items-center gap-1.5 font-medium text-brand-700 underline-offset-4 transition-colors hover:text-brand-900 hover:underline"
              >
                <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
                {section.title}
              </button>
            ) : (
              <span
                aria-current={active ? "step" : undefined}
                className={active ? "font-semibold text-ink-900" : "text-ink-400"}
              >
                {section.title}
                {active && (
                  <span className="font-normal tabular-nums text-ink-500">
                    {" · "}
                    {position} of {section.count}
                  </span>
                )}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
