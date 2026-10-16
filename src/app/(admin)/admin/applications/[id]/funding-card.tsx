import { Button, Card, Input, Select, Textarea } from "@/components/ui";
import { formatCurrency } from "@/lib/crm";
import type { ApplicationFundingRow, ApplicationStatus } from "@/types/database";
import { recordFunding } from "./actions";

/**
 * The funding record on the file.
 *
 * Marking a file funded used to stamp a time and stop. The four facts that
 * make a funded deal a deal — how much, through whom, when, and what FLS
 * earned — had nowhere to go, and the pipeline's "amount funded" was summing
 * lender offers as a stand-in. This is where they go.
 *
 * SHOWN ONLY WHEN IT APPLIES: on a file that is approved, funded or closed,
 * or that already has a record. On every other file it is clutter.
 *
 * THE FORM IS KEYED ON updated_at. React resets a form after its action, and
 * an uncontrolled input resets to the value it mounted with — so without the
 * key, saving would show the old figures under a "saved" record. A new key
 * remounts the form with what was just written.
 */

const money = (value: number | null) =>
  value == null ? "" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(value));

/**
 * A calendar date, not an instant. funded_on is a Postgres `date`
 * ("2026-10-14"); handed to formatDate it becomes midnight UTC and, shown in
 * Hawaii time, reads as the 13th. Formatting in UTC keeps the day it says.
 */
const day = (value: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );

const LABEL = "block text-xs font-medium text-ink-600 dark:text-ink-300";

export function FundingCard({
  applicationId,
  status,
  funding,
  lenders,
}: {
  applicationId: string;
  status: ApplicationStatus;
  funding: ApplicationFundingRow | null;
  /** Live lenders, plus the recorded one if it has since been removed. */
  lenders: { id: string; name: string; deleted_at: string | null }[];
}) {
  const recorded =
    funding != null &&
    (funding.funded_amount != null || funding.lender_id != null || funding.commission_amount != null);
  const lenderName = funding?.lender_id ? lenders.find((l) => l.id === funding.lender_id)?.name : null;

  const summary = recorded
    ? [
        funding?.funded_amount != null ? `${formatCurrency(funding.funded_amount)} funded` : null,
        lenderName ? `through ${lenderName}` : null,
        funding?.funded_on ? `on ${day(funding.funded_on)}` : null,
        funding?.commission_amount != null ? `· ${formatCurrency(funding.commission_amount)} commission` : null,
      ]
        .filter(Boolean)
        .join(" ")
    : status === "funded"
      ? "Marked funded. Record what happened: it's what the pipeline numbers run on."
      : "What happened when it funded. Fill in once the money has moved.";

  return (
    <Card>
      <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">Funding</h2>
      <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{summary}</p>

      <form
        key={funding?.updated_at ?? "new"}
        action={recordFunding}
        className="mt-4 grid gap-3 sm:grid-cols-2"
      >
        <input type="hidden" name="applicationId" value={applicationId} />
        <label className={LABEL}>
          Amount funded
          <Input
            name="fundedAmount"
            inputMode="decimal"
            placeholder="$0"
            defaultValue={money(funding?.funded_amount ?? null)}
            className="mt-1"
          />
        </label>
        <label className={LABEL}>
          Funded on
          <Input name="fundedOn" type="date" defaultValue={funding?.funded_on ?? ""} className="mt-1" />
        </label>
        <label className={LABEL}>
          Lender
          <Select name="lenderId" defaultValue={funding?.lender_id ?? ""} className="mt-1">
            <option value="">Not recorded</option>
            {lenders.map((lender) => (
              <option key={lender.id} value={lender.id}>
                {lender.name}
                {lender.deleted_at ? " (removed)" : ""}
              </option>
            ))}
          </Select>
        </label>
        <label className={LABEL}>
          FLS commission
          <Input
            name="commissionAmount"
            inputMode="decimal"
            placeholder="$0"
            defaultValue={money(funding?.commission_amount ?? null)}
            className="mt-1"
          />
        </label>
        <label className={`${LABEL} sm:col-span-2`}>
          Notes
          <Textarea
            name="notes"
            rows={2}
            defaultValue={funding?.notes ?? ""}
            placeholder="Terms, any split before it reached FLS, anything the next file should know."
            className="mt-1"
          />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" size="sm">
            {recorded ? "Update funding record" : "Save funding record"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
