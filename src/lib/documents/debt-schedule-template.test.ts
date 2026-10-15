import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import {
  DEBT_SCHEDULE_ROWS,
  buildDebtScheduleTemplate,
  debtScheduleFilename,
  money,
} from "./debt-schedule-template";

const fieldText = async (bytes: Uint8Array, name: string) => {
  const pdf = await PDFDocument.load(bytes);
  return pdf.getForm().getTextField(name).getText() ?? "";
};

test("debt schedule: one landscape page with a fillable cell in every column of every row", async () => {
  const bytes = await buildDebtScheduleTemplate({ businessName: null, debts: [] });
  const pdf = await PDFDocument.load(bytes);

  assert.equal(pdf.getPageCount(), 1);
  const { width, height } = pdf.getPage(0).getSize();
  assert.ok(width > height, "landscape");

  const names = new Set(pdf.getForm().getFields().map((field) => field.getName()));
  for (const column of ["creditor", "type", "original", "opened", "balance", "rate", "payment", "maturity", "collateral", "status"]) {
    for (let row = 1; row <= DEBT_SCHEDULE_ROWS; row += 1) {
      assert.ok(names.has(`${column}_${row}`), `${column}_${row} exists`);
    }
  }
  for (const name of ["business_name", "prepared_by", "date_prepared", "total_balance", "total_payment"]) {
    assert.ok(names.has(name), `${name} exists`);
  }
});

test("debt schedule: what the applicant already entered is written into the first rows, nothing else", async () => {
  const bytes = await buildDebtScheduleTemplate({
    businessName: "Acme Grading LLC",
    debts: [
      { lender_name: "Wells Fargo", debt_type: "Term loan", original_amount: "150000.00", balance: 125000, monthly_payment: 2450.5 },
      { lender_name: "CAT Financial", debt_type: null, original_amount: null, balance: null, monthly_payment: null },
    ],
  });

  assert.equal(await fieldText(bytes, "business_name"), "Acme Grading LLC");
  assert.equal(await fieldText(bytes, "creditor_1"), "Wells Fargo");
  assert.equal(await fieldText(bytes, "type_1"), "Term loan");
  assert.equal(await fieldText(bytes, "original_1"), "$150,000");
  assert.equal(await fieldText(bytes, "balance_1"), "$125,000");
  assert.equal(await fieldText(bytes, "payment_1"), "$2,450.50");
  // Columns the application never asks for stay blank — never estimated.
  assert.equal(await fieldText(bytes, "opened_1"), "");
  assert.equal(await fieldText(bytes, "rate_1"), "");
  assert.equal(await fieldText(bytes, "creditor_2"), "CAT Financial");
  assert.equal(await fieldText(bytes, "balance_2"), "");
  assert.equal(await fieldText(bytes, "creditor_3"), "");
  // Totals are the applicant's to add up once the schedule is complete.
  assert.equal(await fieldText(bytes, "total_balance"), "");
});

test("debt schedule: more obligations than lines does not overflow the page", async () => {
  const debts = Array.from({ length: DEBT_SCHEDULE_ROWS + 5 }, (_, i) => ({
    lender_name: `Lender ${i + 1}`,
    debt_type: null,
    original_amount: null,
    balance: 1000 * (i + 1),
    monthly_payment: null,
  }));
  const bytes = await buildDebtScheduleTemplate({ businessName: "Many Debts Inc", debts });
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  assert.equal(await fieldText(bytes, `creditor_${DEBT_SCHEDULE_ROWS}`), `Lender ${DEBT_SCHEDULE_ROWS}`);
  assert.throws(() => pdf.getForm().getTextField(`creditor_${DEBT_SCHEDULE_ROWS + 1}`));
});

test("debt schedule: money reads as dollars, and a non-number is a blank cell", () => {
  assert.equal(money(125000), "$125,000");
  assert.equal(money("2450.50"), "$2,450.50");
  assert.equal(money(0), "$0");
  assert.equal(money(null), "");
  assert.equal(money(""), "");
  assert.equal(money("n/a"), "");
});

test("debt schedule: the filename carries the business and nothing the browser would choke on", () => {
  assert.equal(debtScheduleFilename("O'Brien & Sons, LLC"), "Business Debt Schedule - OBrien & Sons, LLC.pdf");
  assert.equal(debtScheduleFilename('Acme "Grading" / Paving'), "Business Debt Schedule - Acme Grading Paving.pdf");
  assert.equal(debtScheduleFilename(null), "Business Debt Schedule.pdf");
  assert.equal(debtScheduleFilename("   "), "Business Debt Schedule.pdf");
});
