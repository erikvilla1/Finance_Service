/**
 * Additional owners — the lines that make ownership add up to 100%.
 *
 * The owner section is built from `application_questions`, one row per input,
 * and that model has one owner in it: the primary, whose answers land on the
 * `is_primary` row of `application_owners`. A business with two partners had
 * nowhere to put the second one, and a 60% in "Percentage of ownership" went to
 * a funding source with the other 40% unexplained.
 *
 * Client review (Notion 09.27): "If someone puts something other than 100%,
 * auto input other lines for another owner to input. Make sure all adds up to
 * 100%." So: when the primary owner's percentage is under 100, the section
 * grows a block of additional-owner lines, one more appearing whenever what is
 * listed still falls short, and the section is not complete until the total is
 * 100. The lines are stored as the non-primary rows of the same table, which
 * is where the lender form and the package already look for a second owner.
 *
 * Shared by the loader, the save path and the form so the three agree on what
 * a line is, what it is called in a POST, and when the total is right.
 */

export interface CoOwner {
  /** Row id when it came from the database; null for a line not yet saved. */
  id: string | null;
  firstName: string;
  lastName: string;
  title: string;
  ownershipPct: number | null;
  email: string;
  mobilePhone: string;
}

/** Enough for any real cap table on a small-business application. */
export const MAX_CO_OWNERS = 10;

export const CO_OWNER_FIELDS = [
  "first_name",
  "last_name",
  "title",
  "ownership_pct",
  "email",
  "mobile_phone",
] as const;

export type CoOwnerField = (typeof CO_OWNER_FIELDS)[number];

/** The input name for one field of one line: `co_owner_first_name.0`. */
export function coOwnerFieldName(field: CoOwnerField, index: number): string {
  return `co_owner_${field}.${index}`;
}

/** A percentage as typed or as stored, or null when it is not a number. */
export function toPercent(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/[%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

/** The additional-owner lines apply: a primary share that is under 100%. */
export function needsCoOwners(primaryPct: number | null): boolean {
  return primaryPct !== null && primaryPct < 100;
}

/** Everything listed, primary included. */
export function ownershipAssigned(
  primaryPct: number | null,
  coOwners: { ownershipPct: number | null }[],
): number {
  return (
    (primaryPct ?? 0) +
    coOwners.reduce((sum, owner) => sum + (owner.ownershipPct ?? 0), 0)
  );
}

/**
 * Adds up: 100% listed, every line named with an email and a mobile number
 * (the client wants both for every owner), and at least one line. Within a
 * hundredth, because 33.33 + 33.33 + 33.34 is a real answer.
 */
export function ownershipComplete(
  primaryPct: number | null,
  coOwners: CoOwner[],
): boolean {
  if (!needsCoOwners(primaryPct)) return true;
  if (coOwners.length === 0) return false;
  const named = coOwners.every(
    (owner) =>
      owner.firstName.trim().length > 0 &&
      owner.lastName.trim().length > 0 &&
      owner.ownershipPct !== null &&
      owner.email.trim().length > 0 &&
      owner.mobilePhone.trim().length > 0,
  );
  return named && Math.abs(ownershipAssigned(primaryPct, coOwners) - 100) < 0.01;
}
