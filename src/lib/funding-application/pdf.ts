import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { CompletenessContext } from "./fields";
import type { ConsentTextVersion } from "./consent-text";

/**
 * The funding application, as a PDF a lender can open.
 *
 * DRAWN, NOT RENDERED FROM HTML. Turning the portal's page into a PDF would
 * mean running a headless browser on the server — a Chromium binary, in the
 * deploy image, to typeset a form we can describe in a few hundred lines.
 * pdf-lib draws it directly, so there is no vendor and no binary.
 *
 * SAME FORM, SAME SHAPE. This renders the layout of Robert's paper funding
 * application — the one the print page shows and the applicant reviews before
 * signing: sections ruled off, labelled cells with the value written on the
 * line. A lender receiving this document sees the form they already know, not
 * a transcript of it. The cell layout below (FORM_LAYOUT) is the same row
 * arrangement as FundingApplicationSheet; when the form changes, change both.
 *
 * WHAT IS DELIBERATELY NOT STORED. Full SSN and Tax ID are typed by the signer
 * at signing, drawn into their cells on this document, and never written to a
 * column — that is what `source: "signer"` in fields.ts has always meant. They
 * arrive as arguments and leave inside the bytes.
 */

const PAGE_WIDTH = 612; // US Letter, points
const PAGE_HEIGHT = 792;
const MARGIN = 46;
const CONTENT = PAGE_WIDTH - MARGIN * 2;
const CELL_GAP = 12;

const INK = rgb(0.09, 0.09, 0.11);
const LABEL = rgb(0.45, 0.45, 0.5);
const FAINT = rgb(0.55, 0.55, 0.6);
const RULE = rgb(0.78, 0.78, 0.8);
const RULE_DARK = rgb(0.09, 0.09, 0.11);

export interface SignatureDetails {
  /** PNG data URL from the signature pad. */
  signatureDataUrl: string;
  /** Typed exactly as the signer entered it, printed beneath the mark. */
  signerName: string;
  signerTitle: string | null;
  /** Signer-supplied and never stored. Rendered into its cell and forgotten. */
  ssn: string | null;
  taxId: string | null;
  signedAt: Date;
  consents: ConsentTextVersion[];
  /** For the audit block at the foot of the signature page. */
  ipAddress: string | null;
  userAgent: string | null;
  referenceCode: string;
}

/** The one shape of a debt row this document needs. */
export interface DebtLine {
  lender_name: string | null;
  balance: number | string | null;
  monthly_payment: number | string | null;
}

/** One labelled cell on the form. `flex` matches the sheet's 1 / 2 widths. */
interface Cell {
  label: string;
  value: string;
  flex?: number;
  /** A signer field left blank — drawn as a dashed line, like the paper form. */
  blank?: boolean;
}

export async function buildFundingApplicationPdf(
  data: { context: CompletenessContext; debts: DebtLine[] },
  signature: SignatureDetails,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const { context, debts } = data;
  const app = context.application ?? {};
  const biz = context.business ?? {};
  const owners = context.owners;

  // Formatting matches the portal's sheet, so screen and document agree.
  const v = (value: unknown): string => {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  const money = (value: unknown): string => {
    const n = Number(value);
    if (!Number.isFinite(n) || value === null || value === "") return "";
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", maximumFractionDigits: 0,
    }).format(n);
  };

  let page: PDFPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const newPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  const ensure = (needed: number) => {
    if (y - needed < MARGIN) newPage();
  };

  const text = (
    value: string,
    x: number,
    atY: number,
    options: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb> } = {},
  ) => {
    page.drawText(value, {
      x,
      y: atY,
      size: options.size ?? 9.5,
      font: options.font ?? font,
      color: options.color ?? INK,
    });
  };

  const line = (
    x1: number, y1: number, x2: number,
    options: { color?: ReturnType<typeof rgb>; thickness?: number; dashed?: boolean } = {},
  ) => {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y1 },
      thickness: options.thickness ?? 0.6,
      color: options.color ?? RULE,
      ...(options.dashed ? { dashArray: [2.5, 2.5] } : {}),
    });
  };

  // ------------------------------------------------------------------ header
  text("Funding Application", MARGIN, y - 16, { font: bold, size: 19 });
  const refWidth = font.widthOfTextAtSize(signature.referenceCode, 9);
  text(signature.referenceCode, PAGE_WIDTH - MARGIN - refWidth, y - 14, {
    size: 9, color: LABEL,
  });
  y -= 30;
  text(
    "Financial Lending Specialists, Inc. — please complete all applicable fields",
    MARGIN, y, { size: 9, color: LABEL },
  );
  y -= 10;
  line(MARGIN, y, PAGE_WIDTH - MARGIN, { color: RULE_DARK, thickness: 1.4 });
  y -= 6;

  // ----------------------------------------------------------- section title
  const section = (title: string) => {
    ensure(58); // never orphan a heading at the foot of a page
    y -= 14;
    text(title.toUpperCase(), MARGIN, y, { font: bold, size: 9.5 });
    y -= 5;
    line(MARGIN, y, PAGE_WIDTH - MARGIN, { color: RULE, thickness: 0.7 });
    y -= 4;
  };

  // ------------------------------------------------------------- cell drawing
  //
  // A row of cells the way the paper form has them: small grey label on top,
  // the value written on a ruled line beneath. Widths follow `flex`, the same
  // one-third / two-thirds rhythm as the portal sheet.
  const row = (cells: Cell[]) => {
    const totalFlex = cells.reduce((sum, cell) => sum + (cell.flex ?? 1), 0);
    const usable = CONTENT - CELL_GAP * (cells.length - 1);

    // Wrap labels and values first so the row's height is known before
    // drawing. Labels wrap too — "Open judgments or tax liens?" over a
    // fifth-width cell would otherwise run into its neighbour.
    const laidOut = cells.map((cell) => {
      const width = (usable * (cell.flex ?? 1)) / totalFlex;
      const labelLines = wrap(cell.label.toUpperCase(), font, 6.3, width - 2);
      const lines = cell.blank || !cell.value
        ? [""]
        : wrap(cell.value, font, 9.5, width - 2);
      return { ...cell, width, labelLines, lines };
    });

    const maxLabelLines = Math.max(...laidOut.map((cell) => cell.labelLines.length));
    const maxLines = Math.max(...laidOut.map((cell) => cell.lines.length));
    const labelBlock = maxLabelLines * 8;
    const height = labelBlock + 4 + maxLines * 12 + 4;
    ensure(height + 4);

    let x = MARGIN;
    for (const cell of laidOut) {
      // Labels sit on a shared baseline: single-line labels align with the
      // last line of a wrapped neighbour, and every value line starts level.
      let labelY = y - 7 - (maxLabelLines - cell.labelLines.length) * 8;
      for (const label of cell.labelLines) {
        text(label, x, labelY, { size: 6.3, color: LABEL });
        labelY -= 8;
      }

      let textY = y - labelBlock - 11;
      for (const value of cell.lines) {
        if (value) text(value, x + 1, textY, { size: 9.5 });
        textY -= 12;
      }

      // The written line. Dashed when the cell is the signer's to complete —
      // exactly how the paper form distinguishes them.
      line(x, y - height + 4, x + cell.width, {
        color: cell.blank ? rgb(0.6, 0.6, 0.65) : RULE,
        dashed: Boolean(cell.blank),
      });

      x += cell.width + CELL_GAP;
    }

    y -= height + 3;
  };

  // ---------------------------------------------------------------- BUSINESS
  section("Business");
  row([
    { label: "Business Legal Name", value: v(biz.legal_name), flex: 2 },
    { label: "Business DBA", value: v(biz.dba) },
  ]);
  row([
    { label: "State of Incorporation", value: v(biz.state_of_incorporation) },
    // Typed by the signer at signing; blank on the paper route.
    signature.taxId
      ? { label: "Tax ID Number", value: signature.taxId }
      : { label: "Tax ID Number", value: "", blank: true },
    { label: "Business Start Date", value: v(biz.business_start_date) },
    { label: "Industry Type", value: v(biz.industry) },
  ]);
  row([
    { label: "Business Entity Type", value: v(biz.entity_type).replaceAll("_", " "), flex: 2 },
    { label: "Web Address", value: v(biz.website) },
  ]);
  row([
    { label: "Location Phone", value: v(biz.phone) },
    { label: "Preferred Contact Phone", value: v(biz.preferred_contact_phone) },
    { label: "Business Email Address", value: v(biz.email), flex: 2 },
  ]);
  row([
    { label: "Physical Street Address", value: v(biz.address_line1), flex: 2 },
    { label: "City", value: v(biz.city) },
    { label: "State", value: v(biz.state) },
    { label: "Zip", value: v(biz.postal_code) },
  ]);
  row([
    { label: "Billing Address (if different)", value: v(biz.billing_address_line1), flex: 2 },
    { label: "City", value: v(biz.billing_city) },
    { label: "State", value: v(biz.billing_state) },
    { label: "Zip", value: v(biz.billing_postal_code) },
  ]);
  row([
    { label: "Premises", value: v(biz.premises_status) },
    { label: "Monthly Payment", value: money(biz.premises_monthly_payment) },
    { label: "Landlord Name", value: v(biz.landlord_name) },
    { label: "Landlord Phone", value: v(biz.landlord_phone) },
  ]);

  // -------------------------------------------------------------- FINANCIALS
  section("Financial Snapshot");
  row([
    { label: "Gross Annual Sales", value: money(app.gross_annual_sales) },
    { label: "Average Monthly Credit Card Volume", value: money(app.avg_monthly_card_volume), flex: 2 },
    { label: "Credit Card Processor", value: v(app.credit_card_processor) },
  ]);
  row([
    { label: "Open MCA or Loan Accounts?", value: v(app.has_existing_mca) },
    { label: "Open Judgments or Tax Liens?", value: v(app.has_open_judgments_or_liens) },
    { label: "Balance", value: money(app.judgment_lien_balance) },
    { label: "Bankruptcies?", value: v(app.has_bankruptcy) },
    { label: "Year", value: v(app.bankruptcy_year) },
  ]);

  // The obligations schedule, as a table. The paper form has two rows; we
  // render as many as were disclosed.
  if (debts.length > 0) {
    ensure(24 + debts.length * 16);
    y -= 10;
    const col = [MARGIN, MARGIN + CONTENT * 0.5, MARGIN + CONTENT * 0.78];
    text("LENDER", col[0], y, { font: bold, size: 7 });
    text("BALANCE", col[1], y, { font: bold, size: 7 });
    text("MONTHLY PAYMENT", col[2], y, { font: bold, size: 7 });
    y -= 4;
    line(MARGIN, y, PAGE_WIDTH - MARGIN, { color: RULE });
    for (const debt of debts) {
      ensure(18);
      y -= 13;
      text(v(debt.lender_name) || "—", col[0], y, { size: 9 });
      text(money(debt.balance) || "—", col[1], y, { size: 9 });
      text(money(debt.monthly_payment) || "—", col[2], y, { size: 9 });
      y -= 4;
      line(MARGIN, y, PAGE_WIDTH - MARGIN, { color: rgb(0.9, 0.9, 0.91) });
    }
    y -= 2;
  }

  // ------------------------------------------------------------------ OWNERS
  for (const index of [0, 1]) {
    const owner = owners[index];
    if (index === 1 && !owner) continue;

    section(index === 0 ? "Primary Owner / Officer" : "Secondary Owner / Officer");
    row([
      { label: "First Name", value: v(owner?.first_name) },
      { label: "Last Name", value: v(owner?.last_name) },
      { label: "Title", value: v(owner?.title) },
      { label: "% of Ownership", value: owner?.ownership_pct ? `${owner.ownership_pct}%` : "" },
    ]);
    row([
      // The primary signer's SSN goes in its cell; a second owner completes
      // theirs on a counter-signed copy, so it stays a dashed blank.
      index === 0 && signature.ssn
        ? { label: "SS#", value: signature.ssn }
        : { label: "SS#", value: "", blank: true },
      { label: "Date of Birth", value: v(owner?.date_of_birth) },
      { label: "Home Phone", value: v(owner?.home_phone) },
      { label: "Mobile Phone", value: v(owner?.mobile_phone) },
    ]);
    row([
      { label: "Email Address", value: v(owner?.email), flex: 2 },
      { label: "Home Address", value: v(owner?.home_address_line1), flex: 2 },
    ]);
    row([
      { label: "City", value: v(owner?.home_city) },
      { label: "State", value: v(owner?.home_state) },
      { label: "Zip", value: v(owner?.home_postal_code) },
    ]);
  }

  // ------------------------------------------------------------- THE REQUEST
  section("The Request");
  row([
    { label: "Use of Funds", value: v(app.use_of_funds), flex: 2 },
    { label: "Desired Loan Amount", value: money(app.requested_amount) },
  ]);

  // ------------------------------------------------------------ authorisation
  //
  // Kept with the signature on its own page: the consents and the mark they
  // authorise should be read together, not split by a page break.
  newPage();
  text("AUTHORIZATION AND SIGNATURE", MARGIN, y - 12, { font: bold, size: 12 });
  y -= 18;
  line(MARGIN, y, PAGE_WIDTH - MARGIN, { color: RULE_DARK, thickness: 1 });
  y -= 8;

  for (const consent of signature.consents) {
    ensure(40);
    y -= 10;
    text(consent.version, MARGIN, y, { size: 7, color: FAINT });
    y -= 11;
    for (const wrapped of wrap(consent.body, font, 8.5, CONTENT)) {
      ensure(12);
      text(wrapped, MARGIN, y, { size: 8.5, color: rgb(0.2, 0.2, 0.22) });
      y -= 10.5;
    }
  }

  // ------------------------------------------------------------------ the mark
  //
  // Laid out like the foot of the paper form: printed name, the signature
  // itself, and the date, each on its own ruled line.
  ensure(150);
  y -= 26;

  const png = await pdf.embedPng(dataUrlToBytes(signature.signatureDataUrl));
  const drawn = png.scaleToFit(190, 58);

  const colWidth = (CONTENT - CELL_GAP * 2) / 3;
  const cols = [MARGIN, MARGIN + colWidth + CELL_GAP, MARGIN + (colWidth + CELL_GAP) * 2];
  const ruleY = y - 64;

  // Printed name (and title, under the line with the label).
  text(signature.signerName, cols[0], ruleY + 5, { font: bold, size: 10 });

  // The signature image sits on its line.
  page.drawImage(png, {
    x: cols[1],
    y: ruleY + 3,
    width: drawn.width > colWidth ? colWidth : drawn.width,
    height: drawn.height,
  });

  // The date.
  text(signature.signedAt.toISOString().slice(0, 10), cols[2], ruleY + 5, { size: 10 });

  const signatureLabels = [
    "Primary Owner/Officer Print",
    "Primary Owner/Officer Signature",
    "Date",
  ];
  signatureLabels.forEach((label, index) => {
    line(cols[index], ruleY, cols[index] + colWidth, { color: RULE_DARK, thickness: 0.8 });
    text(label.toUpperCase(), cols[index], ruleY - 9, { size: 6.3, color: LABEL });
  });
  if (signature.signerTitle) {
    text(signature.signerTitle, cols[0], ruleY - 20, { size: 8.5, color: LABEL });
  }

  y = ruleY - 34;

  // ------------------------------------------------------------- audit footing
  //
  // The part that makes this hold up. An electronic signature is worth what its
  // evidence is worth, and the evidence is: who, when, from where, having been
  // shown exactly which words. Printed on the document itself so it travels with
  // it — a lender or a court reads the page, not our database.
  ensure(90);
  line(MARGIN, y, PAGE_WIDTH - MARGIN, { color: RULE });
  y -= 12;
  text("SIGNATURE AUDIT", MARGIN, y, { font: bold, size: 7.5, color: FAINT });
  y -= 11;

  const audit = (value: string) => {
    for (const wrapped of wrap(value, font, 8, CONTENT)) {
      ensure(11);
      text(wrapped, MARGIN, y, { size: 8, color: FAINT });
      y -= 10;
    }
  };

  audit(`Signed electronically ${signature.signedAt.toISOString()}`);
  if (signature.ipAddress) audit(`IP address ${signature.ipAddress}`);
  if (signature.userAgent) audit(`Device ${signature.userAgent}`);
  for (const consent of signature.consents) {
    // Named in words rather than by enum value. This block is read by a lender
    // or, at worst, by a lawyer — "fcra_authorization" is a column value, not a
    // description of what someone agreed to.
    audit(`Accepted: ${consentDescription(consent)} (${consent.version})`);
  }

  return pdf.save();
}

/**
 * Break a string to fit a width, measuring in the font it will be drawn in.
 *
 * pdf-lib has no text layout — it draws a string at a point and lets it run off
 * the page if it is too long. Measuring per word is the whole of the layout
 * engine this document needs.
 */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;

    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) lines.push(line);

    // A single word longer than the line — a URL, or a pasted account number.
    // Broken by character rather than allowed to overflow.
    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      let chunk = "";
      for (const character of word) {
        if (font.widthOfTextAtSize(chunk + character, size) > maxWidth) {
          lines.push(chunk);
          chunk = character;
        } else {
          chunk += character;
        }
      }
      line = chunk;
    } else {
      line = word;
    }
  }

  if (line) lines.push(line);
  return lines;
}

/** What each consent actually is, for the audit block on the signed document. */
function consentDescription(consent: ConsentTextVersion): string {
  switch (consent.consentType) {
    case "fcra_authorization":
      return "Credit and information authorization (FCRA)";
    case "e_sign":
      return "Consent to sign and receive documents electronically (ESIGN)";
    case "tcpa_sms":
      return "Consent to be contacted by text message";
    case "credit_pull":
      return "Consent to a credit inquiry";
    case "privacy_policy":
      return "Privacy policy";
    case "terms_of_use":
      return "Terms of use";
  }
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const base64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

/** Guards against a caller handing us something other than a PNG data URL. */
export function isPngDataUrl(value: string): boolean {
  return /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value.replace(/\s/g, ""));
}
