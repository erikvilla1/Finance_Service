import {
  PDFDocument,
  StandardFonts,
  TextAlignment,
  rgb,
  type PDFFont,
  type RGB,
} from "pdf-lib";

/**
 * The Business Debt Schedule template.
 *
 * The checklist asks every applicant for "a completed schedule of existing
 * business obligations" and, until this, gave them nothing to complete. A
 * credit report comes from a bureau and bank statements come from the bank;
 * a debt schedule comes from nowhere unless someone hands over a form. This
 * is that form: a fillable one-page PDF in the shape funders already know —
 * one line per obligation, creditor through to current-or-past-due.
 *
 * FILLABLE, NOT JUST PRINTABLE. Every cell is a real PDF form field, so the
 * schedule can be typed into Preview, Acrobat, Chrome or Edge and saved, then
 * uploaded on the same page it was downloaded from. Printing and writing by
 * hand still works; the fields draw as empty cells on paper.
 *
 * PREFILLED FROM WHAT THEY ALREADY SAID. The application's own obligations
 * section (existing_debts) collects creditor, type, balance and payment.
 * Anything there is written into the first rows so nobody types the same
 * figures twice; the columns that section does not ask for stay blank. A
 * blank row is a blank row — nothing is ever estimated.
 *
 * DRAWN WITH pdf-lib, like the funding application (funding-application/pdf.ts),
 * and for the same reason: no browser, no vendor, no binary in the deploy.
 */

export interface DebtScheduleLine {
  lender_name: string | null;
  debt_type: string | null;
  original_amount: number | string | null;
  balance: number | string | null;
  monthly_payment: number | string | null;
}

export interface DebtScheduleSeed {
  businessName: string | null;
  debts: DebtScheduleLine[];
}

/** Lines on the form. Fourteen fills US Letter landscape without crowding. */
export const DEBT_SCHEDULE_ROWS = 14;

export const DEBT_SCHEDULE_FILENAME = "Business Debt Schedule.pdf";

// US Letter, landscape, points.
const PAGE_WIDTH = 792;
const PAGE_HEIGHT = 612;
const MARGIN = 36;
const CONTENT = PAGE_WIDTH - MARGIN * 2;

const INK = rgb(0.09, 0.09, 0.11);
const LABEL = rgb(0.45, 0.45, 0.5);
const RULE = rgb(0.78, 0.78, 0.8);
const RULE_DARK = rgb(0.09, 0.09, 0.11);
const HEADER_FILL = rgb(0.955, 0.955, 0.965);

const HEADER_ROW = 28;
const ROW = 22;
const FIELD_INSET = 2;
const FIELD_SIZE = 8.5;

type Align = "left" | "right";

interface Column {
  key: string;
  /** Header text; a newline splits it over two lines. */
  label: string;
  width: number;
  align?: Align;
  /** Which seeded value fills this column, if any. */
  seed?: keyof DebtScheduleLine;
  money?: boolean;
}

/** Widths sum to CONTENT (720). Change one, change another. */
const COLUMNS: Column[] = [
  { key: "creditor", label: "Creditor / lender", width: 122, seed: "lender_name" },
  { key: "type", label: "Type of debt", width: 82, seed: "debt_type" },
  { key: "original", label: "Original\namount", width: 68, align: "right", seed: "original_amount", money: true },
  { key: "opened", label: "Date\nopened", width: 60 },
  { key: "balance", label: "Current\nbalance", width: 72, align: "right", seed: "balance", money: true },
  { key: "rate", label: "Rate", width: 46 },
  { key: "payment", label: "Monthly\npayment", width: 72, align: "right", seed: "monthly_payment", money: true },
  { key: "maturity", label: "Maturity\ndate", width: 60 },
  { key: "collateral", label: "Collateral / security", width: 92 },
  { key: "status", label: "Current /\npast due", width: 46 },
];

const INSTRUCTIONS =
  "List every loan, line of credit, equipment lease, merchant cash advance, and business credit card " +
  "the business currently owes on, one line each. If you don't know a figure, leave it blank rather than " +
  "guessing; your specialist can help fill the gaps. Recent statements or payoff letters are welcome alongside it.";

const FOOTNOTE =
  "Save the completed schedule and upload it on your Documents page. " +
  "If you have more obligations than lines, a second copy of this page is fine.";

export async function buildDebtScheduleTemplate(seed: DebtScheduleSeed): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Business Debt Schedule");
  pdf.setProducer("FLS Capital Advisors");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const form = pdf.getForm();

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const text = (
    value: string,
    x: number,
    y: number,
    options: { font?: PDFFont; size?: number; color?: RGB } = {},
  ) => {
    page.drawText(value, {
      x,
      y,
      font: options.font ?? font,
      size: options.size ?? 9,
      color: options.color ?? INK,
    });
  };

  const rule = (x1: number, y1: number, x2: number, y2: number, color = RULE, thickness = 0.6) => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, thickness });
  };

  /**
   * One fillable cell. No border and no fill of its own: the ruled table is
   * the border, and a viewer's own field highlight sits on top of it. The
   * font is passed so pdf-lib builds the appearance stream with Helvetica
   * rather than falling back to whatever the viewer picks.
   */
  const field = (
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    options: { value?: string; align?: Align; size?: number } = {},
  ) => {
    const textField = form.createTextField(name);
    // Placing it first: addToPage writes the default appearance (font and
    // colour) that setFontSize then edits. The other way round throws.
    textField.addToPage(page, {
      x: x + FIELD_INSET,
      y: y + FIELD_INSET,
      width: width - FIELD_INSET * 2,
      height: height - FIELD_INSET * 2,
      borderWidth: 0,
      borderColor: undefined,
      backgroundColor: undefined,
      textColor: INK,
      font,
    });
    // A seeded value that is wider than its cell shrinks until it fits, down
    // to a floor that still prints legibly; the cell is the cell. Typed
    // values are the viewer's problem, and every viewer scrolls them.
    let size = options.size ?? FIELD_SIZE;
    if (options.value) {
      const room = width - FIELD_INSET * 2 - 4;
      while (size > 6 && font.widthOfTextAtSize(options.value, size) > room) size -= 0.25;
    }
    textField.setFontSize(size);
    if (options.align === "right") textField.setAlignment(TextAlignment.Right);
    if (options.value) textField.setText(options.value);
  };

  let y = PAGE_HEIGHT - MARGIN;

  // ------------------------------------------------------------------ heading
  text("Business Debt Schedule", MARGIN, y - 14, { font: bold, size: 18 });
  const brand = "FLS Capital Advisors";
  text(brand, PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(brand, 9), y - 12, { size: 9, color: LABEL });
  y -= 30;
  text("Financial Lending Specialists, Inc.", MARGIN, y, { size: 9, color: LABEL });
  y -= 18;

  for (const line of wrap(INSTRUCTIONS, font, 9, CONTENT)) {
    text(line, MARGIN, y, { size: 9 });
    y -= 13;
  }
  y -= 8;

  // ------------------------------------------------------- who and when
  const header: Array<{ name: string; label: string; width: number; value?: string }> = [
    { name: "business_name", label: "Business name", width: 340, value: seed.businessName?.trim() || undefined },
    { name: "prepared_by", label: "Prepared by", width: 230 },
    { name: "date_prepared", label: "Date prepared", width: 120 },
  ];
  const headerGap = (CONTENT - header.reduce((sum, cell) => sum + cell.width, 0)) / (header.length - 1);
  const headerHeight = 20;
  let hx = MARGIN;
  for (const cell of header) {
    text(cell.label.toUpperCase(), hx, y, { size: 6.5, color: LABEL });
    const top = y - 4;
    field(cell.name, hx, top - headerHeight, cell.width, headerHeight, { value: cell.value, size: 10 });
    rule(hx, top - headerHeight, hx + cell.width, top - headerHeight, RULE_DARK, 0.8);
    hx += cell.width + headerGap;
  }
  y -= headerHeight + 24;

  // ---------------------------------------------------------------- table
  const tableTop = y;
  const tableHeight = HEADER_ROW + ROW * DEBT_SCHEDULE_ROWS + ROW; // + totals
  const tableBottom = tableTop - tableHeight;

  page.drawRectangle({
    x: MARGIN,
    y: tableTop - HEADER_ROW,
    width: CONTENT,
    height: HEADER_ROW,
    color: HEADER_FILL,
  });

  // Column headings, one or two lines, centred vertically in the header row.
  let cx = MARGIN;
  for (const column of COLUMNS) {
    const lines = column.label.split("\n");
    const lineHeight = 9;
    const blockHeight = lines.length * lineHeight;
    let ly = tableTop - (HEADER_ROW - blockHeight) / 2 - 7;
    for (const line of lines) {
      const width = bold.widthOfTextAtSize(line, 7);
      const lx = column.align === "right" ? cx + column.width - 4 - width : cx + 4;
      text(line, lx, ly, { font: bold, size: 7, color: LABEL });
      ly -= lineHeight;
    }
    cx += column.width;
  }

  // Rows: a ruled line each, and a field in every cell.
  for (let row = 0; row < DEBT_SCHEDULE_ROWS; row += 1) {
    const rowTop = tableTop - HEADER_ROW - ROW * row;
    const rowBottom = rowTop - ROW;
    rule(MARGIN, rowBottom, MARGIN + CONTENT, rowBottom);

    const line = seed.debts[row];
    let x = MARGIN;
    for (const column of COLUMNS) {
      const raw = line && column.seed ? line[column.seed] : null;
      const value = column.money ? money(raw) : typeof raw === "string" ? raw.trim() : "";
      field(`${column.key}_${row + 1}`, x, rowBottom, column.width, ROW, {
        value: value || undefined,
        align: column.align,
      });
      x += column.width;
    }
  }

  // Totals: the two columns a funder adds up. Left for the applicant; a
  // template that sums what it was seeded with would show a total for a
  // schedule that is not yet complete.
  const totalsTop = tableBottom + ROW;
  text("Totals", MARGIN + 4, totalsTop - 14, { font: bold, size: 8 });
  let tx = MARGIN;
  for (const column of COLUMNS) {
    if (column.key === "balance" || column.key === "payment") {
      field(`total_${column.key}`, tx, tableBottom, column.width, ROW, { align: "right" });
    }
    tx += column.width;
  }

  // Vertical rules, full height, then the frame.
  let vx = MARGIN;
  for (const column of COLUMNS) {
    rule(vx, tableTop, vx, tableBottom);
    vx += column.width;
  }
  rule(MARGIN, tableTop - HEADER_ROW, MARGIN + CONTENT, tableTop - HEADER_ROW, RULE_DARK, 0.8);
  rule(MARGIN, totalsTop, MARGIN + CONTENT, totalsTop, RULE_DARK, 0.8);
  page.drawRectangle({
    x: MARGIN,
    y: tableBottom,
    width: CONTENT,
    height: tableHeight,
    borderColor: RULE_DARK,
    borderWidth: 0.8,
  });

  // --------------------------------------------------------------- footer
  y = tableBottom - 18;
  for (const line of wrap(FOOTNOTE, font, 8, CONTENT)) {
    text(line, MARGIN, y, { size: 8, color: LABEL });
    y -= 11;
  }

  form.updateFieldAppearances(font);
  return pdf.save();
}

/**
 * Dollars for a seeded cell: whole dollars when the figure is whole, cents
 * when it isn't. Anything that is not a number is a blank cell, not "$NaN".
 */
export function money(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const whole = Number.isInteger(n);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(n);
}

function wrap(value: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * A filename the browser keeps as typed. Quotes and path characters are
 * stripped rather than escaped: a business called O'Brien & Sons gets
 * "Business Debt Schedule - OBrien & Sons.pdf", which is still theirs.
 */
export function debtScheduleFilename(businessName: string | null): string {
  const safe = (businessName ?? "")
    .replace(/[^A-Za-z0-9 .,&()-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return safe ? `Business Debt Schedule - ${safe}.pdf` : DEBT_SCHEDULE_FILENAME;
}
