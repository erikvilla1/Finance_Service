"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { removeLender } from "./actions";

/**
 * "Remove", then "Remove <name>? … Yes, remove / Keep", in place.
 *
 * TWO CLICKS, AND NO BROWSER confirm(). The second step says what removing
 * does — past submissions keep their record, the name can be added again —
 * where the first button was, so the decision is made with the facts in
 * view and nothing jumps. A removed lender is a soft delete, so a mistake is
 * cheap; but the card disappears, and a card that disappears on one click
 * with no warning reads as a bug, not a feature.
 */
export function RemoveLenderButton({ lenderId, name }: { lenderId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setConfirming(true)}>
        Remove
      </Button>
    );
  }

  const confirm = () =>
    startTransition(async () => {
      setError(null);
      const result = await removeLender(lenderId);
      if (!result.ok) setError(result.error);
      // On success the page revalidates and this card is gone with it.
    });

  return (
    <div
      role="group"
      aria-label={`Remove ${name}`}
      className="flex max-w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-600 dark:bg-white/[0.04] dark:text-ink-300"
    >
      <span className="min-w-0">
        Remove <span className="font-semibold text-ink-900 dark:text-ink-100">{name}</span>? Past
        submissions keep their record, and the name can be added again.
      </span>
      <span className="flex items-center gap-1.5">
        <Button type="button" variant="primary" size="sm" disabled={pending} onClick={confirm}>
          {pending ? "Removing…" : "Yes, remove"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Keep
        </Button>
      </span>
      {error && (
        <span role="alert" className="basis-full text-warning-700">
          {error}
        </span>
      )}
    </div>
  );
}
