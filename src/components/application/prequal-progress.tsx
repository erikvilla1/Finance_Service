"use client";

import { useSyncExternalStore } from "react";
import { ProgressBar } from "@/components/ui";
import {
  PREQUAL_FLOW_LABEL,
  PREQUAL_FLOW_STEPS,
} from "@/lib/applications/flow";

/**
 * The flow bar at the top of step 2, advancing as questions are answered and
 * completing on submit.
 *
 * ONE BAR, NOT THREE. The questionnaire had its own progress bars under the
 * page's "2 of 3" bar, which stacked three bars and a "Question 3 of 15" line
 * over one question. Now the page's bar does the job: "2 of 3" while
 * answering, its fill moving from where step 1 left it to nearly the end, and
 * on submit it completes to "3 of 3" with its check before the loading state
 * (PrequalStage) hands over to the results page, which has no bar at all.
 *
 * The bar sits above the heading and the wizard sits inside the form, so the
 * wizard and the submit report through this small module-level store rather
 * than the page being restructured into one component. It resets when the
 * wizard unmounts, so a second visit starts from the beginning.
 */

/** Where the bar sits with every question answered, before submit: nearly there. */
const ANSWERED_FILL = 0.95;

interface ProgressState {
  /** 0 on the first question, 1 when everything's answered. */
  fraction: number;
  /** "See my financing options" pressed. */
  submitted: boolean;
}

let state: ProgressState = { fraction: 0, submitted: false };
const listeners = new Set<() => void>();
const SERVER_STATE: ProgressState = { fraction: 0, submitted: false };

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function set(next: Partial<ProgressState>) {
  const merged = { ...state, ...next };
  if (merged.fraction === state.fraction && merged.submitted === state.submitted) return;
  state = merged;
  for (const listener of listeners) listener();
}

/** Called by the wizard as questions are answered. */
export function reportQuestionProgress(next: number) {
  set({ fraction: Math.min(1, Math.max(0, next)) });
}

/** Called by the submit: completes the bar to "3 of 3", or undoes it on failure. */
export function reportSubmitted(submitted: boolean) {
  set({ submitted });
}

export function PrequalFlowProgress() {
  // Server and first paint: the start of step 2, which is exactly where the
  // step 1 bar ended, so nothing jumps before hydration.
  const current = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
  const start = 1 / PREQUAL_FLOW_STEPS;
  const fill = current.submitted
    ? 1
    : start + current.fraction * (ANSWERED_FILL - start);

  return (
    <ProgressBar
      value={current.submitted ? PREQUAL_FLOW_STEPS : 2}
      max={PREQUAL_FLOW_STEPS}
      label={PREQUAL_FLOW_LABEL}
      fill={fill}
      showCheck
    />
  );
}
