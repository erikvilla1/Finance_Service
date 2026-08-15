import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  FUNDING_APPLICATION_FIELDS,
  SECTION_LABELS,
  type CompletenessContext,
  type FundingApplicationSection,
} from "./fields";
import { buildMergePayload } from "./completeness";
import type { ConsentTextVersion } from "./consent-text";

/**
 * The funding application, as a PDF a lender can open.
 *
 * There is a printable HTML page already, and it is the wrong artefact for this
 * job: a lender receives a folder of files, not a URL, and "print this page to
 * PDF yourself" is the manual step the platform exists to remove.
 *
 * DRAWN, NOT RENDERED FROM HTML. Turning the existing page into a PDF would mean
 * running a headless browser on the server — a Chromium binary, in the deploy
 * image, to typeset a form whose every field is already described as data in
 * fields.ts. pdf-lib draws it directly from that same list, so the document and
 * the completeness check can never disagree about what the form contains.
 *
 * WHAT IS DELIBERATELY NOT HERE. Full SSN and Tax ID are typed by the signer at
 * signing, drawn into this document, and never written to a column — that is
 * what `source: "signer"` in fields.ts has always meant. They arrive as
 * arguments and leave inside the bytes.
 */

const PAGE_WIDTH = 612; // US Letter, points
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const LINE = 14;

export interface SignatureDetails {
  /** PNG data URL from the signature pad. */
  signatureDataUrl: string;
  /** Typed exactly as the signer entered it, printed beneath the mark. */
  signerName: string;
  signerTitle: string | null;
  /** Signer-supplied and never stored. Rendered here and then forgotten. */
  ssn: string | null;
  taxId: string | null;
  signedAt: Date;
  consents: ConsentTextVersion[];
  /** For the audit block at the foot of the signature page. */
  ipAddress: string | null;
  userAgent: string | null;
  referenceCode: string;
}

export async function buildFundingApplicationPdf(
  context: CompletenessContext,
  signature: SignatureDetails,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const payload = buildMergePayload(context);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const newPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  const space = (needed: number) => {
    if (y - needed < MARGIN) newPage();
  };

  const write = (
    text: string,
    options: { font?: PDFFont; size?: number; indent?: number; color?: [number, number, number] } = {},
  ) => {
    const size = options.size ?? 10;
    space(size + 4);
    page.drawText(text, {
      x: MARGIN + (options.indent ?? 0),
      y,
      size,
      font: options.font ?? font,
      color: options.color ? rgb(...options.color) : rgb(0.1, 0.1, 0.1),
    });
    y -= size + 4;
  };

  // ------------------------------------------------------------------ heading
  write("FUNDING APPLICATION", { font: bold, size: 16 });
  write("Financial Lending Specialists, Inc.", { size: 10, color: [0.4, 0.4, 0.4] });
  y -= 6;
  write(`Reference ${signature.referenceCode}`, { size: 9, color: [0.4, 0.4, 0.4] });
  y -= 10;

  // ------------------------------------------------------------------ sections
  // Walked in the order fields.ts declares, so the printed document matches the
  // form it was transcribed from rather than the shape of our database.
  const sections = [
    ...new Set(FUNDING_APPLICATION_FIELDS.map((field) => field.section)),
  ] as FundingApplicationSection[];

  for (const section of sections) {
    const fields = FUNDING_APPLICATION_FIELDS.filter(
      (field) => field.section === section && field.source !== "signer",
    );

    if (fields.length === 0) continue;

    space(LINE * 3);
    y -= 6;
    write(SECTION_LABELS[section].toUpperCase(), { font: bold, size: 11 });
    page.drawLine({
      start: { x: MARGIN, y: y + 6 },
      end: { x: PAGE_WIDTH - MARGIN, y: y + 6 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 4;

    for (const field of fields) {
      const value = payload[field.key];
      const shown =
        value === null || value === undefined || value === "" ? "—" : String(value);

      // Long values wrap rather than running off the page — a truncated
      // business address on a lender package is a returned application.
      for (const line of wrap(`${field.formLabel}: ${shown}`, font, 10, PAGE_WIDTH - MARGIN * 2)) {
        write(line, { size: 10, indent: 6 });
      }
    }
  }

  // ---------------------------------------------------------- existing debts
  if (context.debtCount > 0) {
    space(LINE * 3);
    y -= 6;
    write("EXISTING OBLIGATIONS", { font: bold, size: 11 });
    y -= 4;
    write(
      `${context.debtCount} obligation${context.debtCount === 1 ? "" : "s"} disclosed; schedule enclosed with this package.`,
      { size: 10, indent: 6 },
    );
  }

  // ------------------------------------------------------------- authorisation
  newPage();
  write("AUTHORIZATION AND SIGNATURE", { font: bold, size: 13 });
  y -= 8;

  for (const consent of signature.consents) {
    write(consent.version, { size: 8, color: [0.45, 0.45, 0.45] });
    for (const line of wrap(consent.body, font, 8.5, PAGE_WIDTH - MARGIN * 2)) {
      write(line, { size: 8.5 });
    }
    y -= 8;
  }

  // -------------------------------------------------- signer-supplied, unstored
  space(LINE * 6);
  y -= 6;
  if (signature.taxId) write(`Tax ID Number: ${signature.taxId}`, { size: 10 });
  if (signature.ssn) write(`SS#: ${signature.ssn}`, { size: 10 });

  // ------------------------------------------------------------------ the mark
  space(120);
  y -= 20;

  const png = await pdf.embedPng(dataUrlToBytes(signature.signatureDataUrl));
  const drawn = png.scaleToFit(220, 70);

  page.drawImage(png, {
    x: MARGIN,
    y: y - drawn.height + 10,
    width: drawn.width,
    height: drawn.height,
  });

  y -= drawn.height + 6;

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + 260, y },
    thickness: 0.75,
    color: rgb(0.3, 0.3, 0.3),
  });

  y -= 14;
  write(signature.signerName, { font: bold, size: 10 });
  if (signature.signerTitle) write(signature.signerTitle, { size: 9, color: [0.4, 0.4, 0.4] });
  write(signature.signedAt.toISOString().slice(0, 10), { size: 9, color: [0.4, 0.4, 0.4] });

  // ------------------------------------------------------------- audit footing
  //
  // The part that makes this hold up. An electronic signature is worth what its
  // evidence is worth, and the evidence is: who, when, from where, having been
  // shown exactly which words. Printed on the document itself so it travels with
  // it — a lender or a court reads the page, not our database.
  y -= 12;
  write("SIGNATURE AUDIT", { font: bold, size: 8.5, color: [0.45, 0.45, 0.45] });
  write(`Signed electronically ${signature.signedAt.toISOString()}`, {
    size: 8,
    color: [0.45, 0.45, 0.45],
  });
  if (signature.ipAddress) {
    write(`IP address ${signature.ipAddress}`, { size: 8, color: [0.45, 0.45, 0.45] });
  }
  if (signature.userAgent) {
    for (const line of wrap(`Device ${signature.userAgent}`, font, 8, PAGE_WIDTH - MARGIN * 2)) {
      write(line, { size: 8, color: [0.45, 0.45, 0.45] });
    }
  }
  for (const consent of signature.consents) {
    write(`Accepted ${consent.consentType} version ${consent.version}`, {
      size: 8,
      color: [0.45, 0.45, 0.45],
    });
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

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const base64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

/** Guards against a caller handing us something other than a PNG data URL. */
export function isPngDataUrl(value: string): boolean {
  return /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value.replace(/\s/g, ""));
}
