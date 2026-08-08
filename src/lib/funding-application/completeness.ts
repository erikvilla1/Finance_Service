import {
  FUNDING_APPLICATION_FIELDS,
  SECTION_LABELS,
  type CompletenessContext,
  type FundingApplicationField,
  type FundingApplicationSection,
} from "./fields";

/**
 * Is this file ready to send to a lender?
 *
 * This is the check that makes Robert's review step fast. Today he reads a
 * form and notices what's blank; BUSINESS_CONTEXT §3 identifies exactly that
 * kind of manual assembly as the throughput ceiling.
 *
 * Deliberately conservative in one direction: it reports what is *missing*, and
 * never claims a file is approvable. A complete file is a file that can be
 * submitted, not one that will be funded.
 */

export interface MissingField {
  key: string;
  formLabel: string;
  section: FundingApplicationSection;
  sectionLabel: string;
  /** True when it's missing only because a conditional answer triggered it. */
  conditional: boolean;
}

export interface CompletenessReport {
  /** 0–100, counting only fields we are responsible for prefilling. */
  percentComplete: number;
  requiredTotal: number;
  requiredPresent: number;
  missing: MissingField[];
  missingBySection: { section: FundingApplicationSection; label: string; fields: MissingField[] }[];
  /** Every prefillable required field is present. */
  readyToSend: boolean;
  /**
   * Fields the applicant fills at signing. Listed so Robert can see they are
   * accounted for rather than forgotten — they are never "missing" from our
   * side because we never hold them.
   */
  collectedAtSigning: { key: string; formLabel: string }[];
}

function readPath(path: string, context: CompletenessContext): unknown {
  const [root, ...rest] = path.split(".");

  if (root === "application") return context.application?.[rest[0]] ?? null;
  if (root === "business") return context.business?.[rest[0]] ?? null;

  if (root === "owner") {
    const index = Number(rest[0]);
    const owner = context.owners[index];
    return owner ? (owner[rest[1]] ?? null) : null;
  }

  if (root === "answer") return context.answers[rest[0]] ?? null;

  return null;
}

function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  // false is a legitimate answer to "any bankruptcies?" — only null means unasked.
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  return true;
}

function isRequired(
  field: FundingApplicationField,
  context: CompletenessContext,
): boolean {
  if (field.required) return true;
  if (field.requiredWhen) {
    try {
      return field.requiredWhen(context);
    } catch {
      return false;
    }
  }
  return false;
}

export function assessCompleteness(
  context: CompletenessContext,
): CompletenessReport {
  const missing: MissingField[] = [];
  let requiredTotal = 0;
  let requiredPresent = 0;

  for (const field of FUNDING_APPLICATION_FIELDS) {
    // Signer fields are never our responsibility — counting them would make a
    // finished file look permanently incomplete.
    if (field.source === "signer") continue;

    if (!isRequired(field, context)) continue;
    requiredTotal++;

    const present =
      field.source === "collection"
        ? context.debtCount > 0
        : isPresent(field.path ? readPath(field.path, context) : null);

    if (present) {
      requiredPresent++;
    } else {
      missing.push({
        key: field.key,
        formLabel: field.formLabel,
        section: field.section,
        sectionLabel: SECTION_LABELS[field.section],
        conditional: !field.required,
      });
    }
  }

  const bySection = new Map<FundingApplicationSection, MissingField[]>();
  for (const item of missing) {
    const list = bySection.get(item.section) ?? [];
    list.push(item);
    bySection.set(item.section, list);
  }

  const collectedAtSigning = FUNDING_APPLICATION_FIELDS.filter(
    (f) => f.source === "signer" && isRequired(f, context),
  ).map((f) => ({ key: f.key, formLabel: f.formLabel }));

  return {
    percentComplete:
      requiredTotal === 0
        ? 0
        : Math.round((requiredPresent / requiredTotal) * 100),
    requiredTotal,
    requiredPresent,
    missing,
    missingBySection: [...bySection.entries()].map(([section, fields]) => ({
      section,
      label: SECTION_LABELS[section],
      fields,
    })),
    readyToSend: missing.length === 0,
    collectedAtSigning,
  };
}

/**
 * Builds the merge payload for the e-signature template.
 *
 * Only ever includes prefillable fields. Signer fields are excluded by
 * construction, so a future change to this function cannot accidentally start
 * sending an SSN we do not have and should not hold.
 */
export function buildMergePayload(
  context: CompletenessContext,
): Record<string, string> {
  const payload: Record<string, string> = {};

  for (const field of FUNDING_APPLICATION_FIELDS) {
    if (field.source === "signer" || field.source === "collection") continue;
    if (!field.path) continue;

    const value = readPath(field.path, context);
    if (!isPresent(value)) continue;

    payload[field.key] =
      typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  }

  return payload;
}
