"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Field, Input } from "@/components/ui";
import { primaryButton } from "@/components/portal/ui";
import type { ExistingDebtRow } from "@/types/database";
import { saveObligationsAction, type ObligationsState } from "./actions";

/**
 * The business debt schedule — one row per existing obligation.
 *
 * Rows are keyed by a stable local id rather than by array index. Keying by
 * index means deleting the second of three rows renders the third one's values
 * into the second one's inputs, which on a form about money is a very bad way
 * to find out about a React reconciliation rule.
 *
 * Controlled, like the rest of the form, and for the same reason: React resets
 * a form once its action completes, and an uncontrolled version would empty the
 * whole schedule on a rejected save.
 */

interface Row {
  id: string;
  lenderName: string;
  balance: string;
  monthlyPayment: string;
  debtType: string;
}

let nextId = 0;
const newRow = (): Row => ({
  id: `row-${nextId++}`,
  lenderName: "",
  balance: "",
  monthlyPayment: "",
  debtType: "",
});

export function ObligationsForm({
  applicationId,
  existing,
  readOnly,
}: {
  applicationId: string;
  existing: ExistingDebtRow[];
  readOnly: boolean;
}) {
  const router = useRouter();

  // Like the sections: a successful save moves on, here back to the
  // application overview (this is the last part of it).
  const [state, formAction, pending] = useActionState<ObligationsState, FormData>(
    async (previous, formData) => {
      const result = await saveObligationsAction(previous, formData);
      if (result.saved && !result.error) router.push(`/dashboard/${applicationId}/application`);
      return result;
    },
    {},
  );

  const [rows, setRows] = useState<Row[]>(() =>
    existing.length > 0
      ? existing.map((debt) => ({
          id: debt.id,
          lenderName: debt.lender_name ?? "",
          balance: debt.balance == null ? "" : String(debt.balance),
          monthlyPayment:
            debt.monthly_payment == null ? "" : String(debt.monthly_payment),
          debtType: debt.debt_type ?? "",
        }))
      : [newRow()],
  );

  function update(id: string, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="application_id" value={applicationId} />

      {rows.map((row, index) => (
        <div
          key={row.id}
          className="rounded-lg p-4 ring-1 ring-inset ring-ink-200"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink-800">
              Obligation {index + 1}
            </p>
            {!readOnly && rows.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setRows((current) => current.filter((r) => r.id !== row.id))
                }
                className="inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-danger-700"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Lender or funder" htmlFor={`lender-${row.id}`} required>
              <Input
                id={`lender-${row.id}`}
                name={`lender_name.${index}`}
                value={row.lenderName}
                disabled={readOnly}
                placeholder="Who the money is owed to"
                onChange={(e) => update(row.id, { lenderName: e.target.value })}
              />
            </Field>

            <Field label="Type" htmlFor={`type-${row.id}`}>
              <Input
                id={`type-${row.id}`}
                name={`debt_type.${index}`}
                value={row.debtType}
                disabled={readOnly}
                placeholder="Advance, term loan, line of credit…"
                onChange={(e) => update(row.id, { debtType: e.target.value })}
              />
            </Field>

            <Field label="Current balance" htmlFor={`balance-${row.id}`}>
              <Input
                id={`balance-${row.id}`}
                name={`balance.${index}`}
                value={row.balance}
                disabled={readOnly}
                inputMode="decimal"
                placeholder="$0"
                onChange={(e) => update(row.id, { balance: e.target.value })}
              />
            </Field>

            <Field label="Monthly payment" htmlFor={`payment-${row.id}`}>
              <Input
                id={`payment-${row.id}`}
                name={`monthly_payment.${index}`}
                value={row.monthlyPayment}
                disabled={readOnly}
                inputMode="decimal"
                placeholder="$0"
                onChange={(e) =>
                  update(row.id, { monthlyPayment: e.target.value })
                }
              />
            </Field>
          </div>
        </div>
      ))}

      {!readOnly && (
        <button
          type="button"
          onClick={() => setRows((current) => [...current, newRow()])}
          className="text-sm font-semibold text-brand-900 underline-offset-4 hover:underline"
        >
          + Add another obligation
        </button>
      )}

      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-danger-50 p-4 text-sm font-medium text-danger-700"
        >
          {state.error}
        </p>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-ink-100 pt-6">
          <button type="submit" disabled={pending} className={primaryButton}>
            {pending ? "Saving…" : "Save and finish"}
          </button>
          <p className="text-sm text-ink-500">
            Leave a row blank if you have nothing to add.
          </p>
        </div>
      )}
    </form>
  );
}
