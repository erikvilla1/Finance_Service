"use client";

import { useSyncExternalStore } from "react";

/**
 * "Good evening, Kai", with today's date above it.
 *
 * IN THE BROWSER, NOT ON THE SERVER. The server's clock is UTC, so a greeting
 * worked out there says "Good morning" to someone in California at 10pm. The
 * server renders the line invisible (same height, so nothing jumps) and the
 * browser fills it in with its own time and fades it up.
 */

const noSubscription = () => () => {};

function partOfDay(hour: number) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

export function TimeGreeting({ firstName }: { firstName: string | null }) {
  // A string, so repeated reads within the hour compare equal.
  const now = useSyncExternalStore(
    noSubscription,
    () => {
      const date = new Date();
      const day = date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
      return `${partOfDay(date.getHours())}|${day}`;
    },
    () => null,
  );
  const [greeting, day] = now ? now.split("|") : ["Welcome back", " "];

  return (
    <div className={now ? "animate-fade" : "invisible"}>
      <p className="text-xs font-semibold uppercase tracking-wider text-accent-800">{day}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
        {firstName ? `${greeting}, ${firstName}` : greeting}
      </h1>
    </div>
  );
}
