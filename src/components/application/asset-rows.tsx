"use client";

import { Plus, X } from "lucide-react";
import { Field, Input, Select } from "@/components/ui";
import type { Question } from "@/lib/questions";

export interface AssetRow {
  type: string;
  value: string;
  debt: string;
}

export const EMPTY_ASSET: AssetRow = { type: "", value: "", debt: "" };

/**
 * The option value meaning "nothing to pledge".
 *
 * A real answer, and distinct from an unanswered question — the engine needs to
 * know real property was NOT offered in order to close commercial real estate,
 * and a blank cannot tell it that. Choosing it collapses the row to a single
 * control: an estimated value for the asset you just said you do not have is a
 * question that cannot be answered.
 */
const NONE = "none";

/**
 * Repeatable asset rows: type, estimated value, debt owed.
 *
 * WHY EVERY ROW SHARES A FIELD NAME. All three controls post under the same
 * name in every row — `prequal_asset_type`, `prequal_asset_value`,
 * `prequal_asset_debt`. FormData preserves duplicates in document order, so the
 * server reads them with getAll() and zips the three lists back into rows by
 * index. No indexed names to keep in sync, nothing to renumber when a row in
 * the middle is removed, and a single-asset submission posts exactly what it
 * always did.
 *
 * WHY THIS IS NOT DRIVEN BY THE QUESTION LOADER. Every other question in the
 * flow renders straight from its database row. This one cannot: it is three
 * questions that repeat as a unit, and the loader has no concept of a repeating
 * group. The asset type's OPTIONS still come from the database, so the list of
 * asset kinds stays editable without a deploy — only the arrangement is fixed
 * here.
 */
export function AssetRows({
  question,
  rows,
  onChange,
}: {
  /** The prequal_asset_type question. Supplies the label and the options. */
  question: Question;
  rows: AssetRow[];
  onChange: (rows: AssetRow[]) => void;
}) {
  const update = (index: number, patch: Partial<AssetRow>) => {
    const next = rows.map((row, i) => {
      if (i !== index) return row;
      const merged = { ...row, ...patch };
      // Switching to "none" clears figures that no longer describe anything.
      if (merged.type === NONE) return { ...merged, value: "", debt: "" };
      return merged;
    });

    /*
      THE FIRST ROW GOVERNS THE REST.

      `canAdd` already stops you adding a second asset before the first has a
      type — but nothing stopped you clearing the first one AFTERWARDS, and the
      rows below simply stayed. That left the question reading "Select an
      option" with a fully filled-in Asset 2 sitting under it: a form saying
      both "I haven't told you whether I have assets" and "here is one of my
      assets" at the same time.

      Setting the first row to "no assets to offer" had the same hole, and that
      version is worse — an explicit denial with an asset still listed beneath
      it, which is a contradiction the engine would then have to arbitrate.

      Clearing or declining the first row therefore drops the others. The extra
      rows only ever existed as continuations of an answer that no longer
      exists, and leaving them would post asset values for an unanswered
      question: every row shares a field name, so row two would arrive at the
      server as though it were row one.
    */
    if (index === 0 && (next[0].type === "" || next[0].type === NONE)) {
      onChange([next[0]]);
      return;
    }

    onChange(next);
  };

  const first = rows[0] ?? EMPTY_ASSET;
  const declinedAssets = first.type === NONE;
  const canAdd = !declinedAssets && first.type !== "";

  return (
    <div className="space-y-4">
      {rows.map((row, index) => {
        const id = `asset-type-${index}`;
        const showFigures = row.type !== "" && row.type !== NONE;

        return (
          <div
            key={index}
            className={
              index === 0
                ? undefined
                : "rounded-lg border border-ink-200 bg-ink-50/50 p-4"
            }
          >
            {index > 0 && (
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-ink-700">
                  Asset {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(rows.filter((_, i) => i !== index))}
                  className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-danger-700"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            )}

            <Field
              label={index === 0 ? question.label : "Asset type"}
              htmlFor={id}
              hint={index === 0 ? (question.helpText ?? undefined) : undefined}
              required={index === 0 && question.isRequired}
            >
              <Select
                id={id}
                name="prequal_asset_type"
                value={row.type}
                onChange={(e) => update(index, { type: e.target.value })}
              >
                <option value="">Select an option</option>
                {question.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            {showFigures && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Estimated value" htmlFor={`asset-value-${index}`}>
                  <MoneyInput
                    id={`asset-value-${index}`}
                    name="prequal_asset_value"
                    value={row.value}
                    onChange={(v) => update(index, { value: v })}
                  />
                </Field>
                <Field label="Debt owed on it" htmlFor={`asset-debt-${index}`}>
                  <MoneyInput
                    id={`asset-debt-${index}`}
                    name="prequal_asset_debt"
                    value={row.debt}
                    onChange={(v) => update(index, { debt: v })}
                  />
                </Field>
              </div>
            )}
          </div>
        );
      })}

      {canAdd && (
        <button
          type="button"
          onClick={() => onChange([...rows, { ...EMPTY_ASSET }])}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-ink-300 px-4 py-3 text-sm font-medium text-ink-600 transition-colors hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-700"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add another asset
        </button>
      )}
    </div>
  );
}

/**
 * Money field with a leading currency mark.
 *
 * Controlled, unlike AmountInput, because the row it belongs to is controlled —
 * removing a row in the middle would otherwise leave the uncontrolled inputs
 * below it holding the previous row's figures.
 *
 * Kept as text with inputMode="numeric" for the same reason AmountInput is: a
 * number input rejects the grouping characters people type into money fields.
 * parseAmount() on the server strips everything outside [0-9.] regardless.
 */
function MoneyInput({
  id,
  name,
  value,
  onChange,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-500"
      >
        $
      </span>
      <Input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        className="pl-7"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
