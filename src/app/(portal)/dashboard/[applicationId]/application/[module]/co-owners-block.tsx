"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field, Input } from "@/components/ui";
import { secondaryButton } from "@/components/portal/ui";
import {
  CO_OWNER_FIELDS,
  MAX_CO_OWNERS,
  coOwnerFieldName,
  needsCoOwners,
  ownershipAssigned,
  type CoOwner,
} from "@/lib/application-form/co-owners";

/**
 * The additional-owner lines under the owner section.
 *
 * Appears the moment the primary owner's percentage is under 100, with one
 * line ready. Another line is added when a percentage field is LEFT with
 * every line filled and the total still short — on leaving, not on typing,
 * because "66" passes through "6" on the way and a line added at "6" was
 * still there at "66" (client review). The moment the total reaches 100 any
 * empty line is removed and "Add another owner" goes away: a complete cap
 * table has no spare line. The running total sits above the lines and says
 * what is still to assign, and the section's green check (load.ts) waits for
 * it to reach 100.
 *
 * Inside the section's own <form>, so autosave and the button carry the lines
 * with everything else; the inputs are named `co_owner_<field>.<n>` and the
 * save path reads them back (save.ts, syncCoOwners). Lines are keyed by a
 * local id rather than by index, for the reason the debt schedule gives:
 * removing the second of three must not render the third one's values into
 * the second one's inputs.
 *
 * Controlled, like the rest of the form — React resets a form once its action
 * completes, and an uncontrolled version would empty every line on a rejected
 * save.
 */

interface Line extends CoOwner {
  key: string;
}

let nextKey = 0;
const newLine = (): Line => ({
  key: `co-owner-${nextKey++}`,
  id: null,
  firstName: "",
  lastName: "",
  title: "",
  ownershipPct: null,
  email: "",
  mobilePhone: "",
});

/** What is typed, kept as text so "33." survives a render. */
type Draft = Record<string, Record<string, string>>;

const seed = (initial: CoOwner[]): Line[] =>
  initial.map((owner) => ({ ...owner, key: `co-owner-${nextKey++}` }));

export function CoOwnersBlock({
  initial,
  primaryPct,
  readOnly,
  errors,
  onChange,
}: {
  initial: CoOwner[];
  /** The primary owner's share as currently typed, or null when blank. */
  primaryPct: number | null;
  readOnly: boolean;
  /** Field errors from the last save, keyed by input name. */
  errors: Record<string, string>;
  /** Something changed: schedule a save. */
  onChange: () => void;
}) {
  // One line is always ready, so the block never opens empty. Kept while the
  // block is hidden (a primary share of 100%) as well: it is not rendered, so
  // it is not posted, and it is there again if the share is revised.
  const [lines, setLines] = useState<Line[]>(() => {
    const seeded = seed(initial);
    if (seeded.length === 0) return [newLine()];
    // Saved lines that already fall short get their next line straight away.
    const short = 100 - ownershipAssigned(primaryPct, seeded) > 0.01;
    const everyLineHasShare = seeded.every((line) => line.ownershipPct !== null);
    return short && everyLineHasShare && seeded.length < MAX_CO_OWNERS
      ? [...seeded, newLine()]
      : seeded;
  });
  const [draft, setDraft] = useState<Draft>(() =>
    Object.fromEntries(lines.map((line) => [line.key, textOf(line)])),
  );

  const visible = needsCoOwners(primaryPct);

  const parsedFrom = (currentLines: Line[], currentDraft: Draft) =>
    currentLines.map((line) => ({
      ...line,
      ownershipPct: percentOf(currentDraft[line.key]?.ownership_pct),
    }));
  const parsed = parsedFrom(lines, draft);
  const assigned = ownershipAssigned(primaryPct, parsed);
  const remaining = Math.round((100 - assigned) * 100) / 100;
  const full = remaining <= 0.01;

  if (!visible) return null;

  const isBlank = (currentDraft: Draft, key: string) =>
    CO_OWNER_FIELDS.every((field) => !(currentDraft[key]?.[field] ?? "").trim());

  const update = (key: string, field: string, value: string) => {
    const nextDraft: Draft = { ...draft, [key]: { ...draft[key], [field]: value } };
    let nextLines = lines;
    // The total just reached 100: a spare, untouched line has no job.
    if (field === "ownership_pct") {
      const reached = 100 - ownershipAssigned(primaryPct, parsedFrom(lines, nextDraft)) <= 0.01;
      if (reached) {
        nextLines = lines.filter((line) => line.key === key || !isBlank(nextDraft, line.key));
        for (const line of lines) if (!nextLines.includes(line)) delete nextDraft[line.key];
      }
    }
    setLines(nextLines);
    setDraft(nextDraft);
    onChange();
  };


  const remove = (key: string) => {
    const rest = lines.filter((line) => line.key !== key);
    const nextDraft = { ...draft };
    delete nextDraft[key];
    if (rest.length === 0) {
      const line = newLine();
      rest.push(line);
      nextDraft[line.key] = textOf(line);
    }
    setLines(rest);
    setDraft(nextDraft);
    onChange();
  };

  const add = () => {
    if (lines.length >= MAX_CO_OWNERS) return;
    const line = newLine();
    setLines([...lines, line]);
    setDraft({ ...draft, [line.key]: textOf(line) });
  };

  // Leaving a percentage field: another line if every line has a share and
  // the total is still short — the "auto input other lines" of the review.
  const settle = () => {
    if (lines.length >= MAX_CO_OWNERS) return;
    const current = parsedFrom(lines, draft);
    const short = 100 - ownershipAssigned(primaryPct, current) > 0.01;
    if (short && current.every((line) => line.ownershipPct !== null)) add();
  };

  const total = (
    <p
      role="status"
      className={`text-sm leading-relaxed ${
        Math.abs(remaining) < 0.01
          ? "text-success-700"
          : remaining < 0
            ? "text-danger-700"
            : "text-ink-600"
      }`}
    >
      {Math.abs(remaining) < 0.01
        ? "Ownership adds up to 100%."
        : remaining < 0
          ? `That adds up to ${fmt(assigned)}%, which is more than 100%.`
          : `${fmt(assigned)}% listed so far — ${fmt(remaining)}% still to assign.`}
    </p>
  );

  return (
    <fieldset
      disabled={readOnly}
      className="rounded-2xl bg-ink-900/[0.025] p-4 ring-1 ring-inset ring-ink-200/70 sm:p-5"
    >
      <legend className="sr-only">Other owners</legend>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
        <div>
          <p className="text-sm font-semibold text-ink-900">Other owners</p>
          <p className="mt-0.5 text-sm text-ink-600">
            You listed {fmt(primaryPct ?? 0)}% above, so the rest of the business belongs to
            someone else. List each other owner so the total comes to 100%.
          </p>
        </div>
      </div>
      <div className="mt-3">{total}</div>

      <ol className="mt-4 space-y-4">
        {lines.map((line, index) => {
          const values = draft[line.key] ?? textOf(line);
          const name = (field: Parameters<typeof coOwnerFieldName>[0]) =>
            coOwnerFieldName(field, index);
          const id = (field: string) => `co-owner-${line.key}-${field}`;
          return (
            <li key={line.key} className="rounded-xl bg-white p-4 ring-1 ring-inset ring-ink-200/80">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">
                  Owner {index + 2}
                </p>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => remove(line.key)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field
                  label="First name"
                  htmlFor={id("first_name")}
                  required
                  error={errors[name("first_name")]}
                >
                  <Input
                    id={id("first_name")}
                    name={name("first_name")}
                    autoComplete="off"
                    value={values.first_name}
                    onChange={(event) => update(line.key, "first_name", event.currentTarget.value)}
                  />
                </Field>
                <Field label="Last name" htmlFor={id("last_name")} required>
                  <Input
                    id={id("last_name")}
                    name={name("last_name")}
                    autoComplete="off"
                    value={values.last_name}
                    onChange={(event) => update(line.key, "last_name", event.currentTarget.value)}
                  />
                </Field>
                <Field
                  label="Percentage of ownership"
                  htmlFor={id("ownership_pct")}
                  required
                  error={errors[name("ownership_pct")]}
                >
                  <div className="relative">
                    <Input
                      id={id("ownership_pct")}
                      name={name("ownership_pct")}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min={0}
                      max={100}
                      className="pr-9"
                      value={values.ownership_pct}
                      onChange={(event) => update(line.key, "ownership_pct", event.currentTarget.value)}
                      onBlur={settle}
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-ink-500"
                    >
                      %
                    </span>
                  </div>
                </Field>
                <Field label="Title" htmlFor={id("title")}>
                  <Input
                    id={id("title")}
                    name={name("title")}
                    value={values.title}
                    onChange={(event) => update(line.key, "title", event.currentTarget.value)}
                  />
                </Field>
                <Field
                  label="Email"
                  htmlFor={id("email")}
                  error={errors[name("email")]}
                >
                  <Input
                    id={id("email")}
                    name={name("email")}
                    type="email"
                    autoComplete="off"
                    value={values.email}
                    onChange={(event) => update(line.key, "email", event.currentTarget.value)}
                  />
                </Field>
                <Field
                  label="Mobile phone"
                  htmlFor={id("mobile_phone")}
                  error={errors[name("mobile_phone")]}
                >
                  <Input
                    id={id("mobile_phone")}
                    name={name("mobile_phone")}
                    type="tel"
                    autoComplete="off"
                    value={values.mobile_phone}
                    onChange={(event) => update(line.key, "mobile_phone", event.currentTarget.value)}
                  />
                </Field>
              </div>
            </li>
          );
        })}
      </ol>

      {!readOnly && !full && lines.length < MAX_CO_OWNERS && (
        <button type="button" onClick={add} className={`${secondaryButton} mt-4`}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add another owner
        </button>
      )}
    </fieldset>
  );
}

function textOf(line: CoOwner): Record<string, string> {
  return {
    first_name: line.firstName,
    last_name: line.lastName,
    title: line.title,
    ownership_pct: line.ownershipPct === null ? "" : String(line.ownershipPct),
    email: line.email,
    mobile_phone: line.mobilePhone,
  };
}

function percentOf(text: string | undefined): number | null {
  if (!text || !text.trim()) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

const fmt = (value: number) => String(Math.round(value * 100) / 100);
