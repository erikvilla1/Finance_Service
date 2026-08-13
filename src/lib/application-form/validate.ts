import type { Question } from "@/lib/questions";

/**
 * Server-side validation, and the normalising that goes with it.
 *
 * THE BROWSER'S CHECKS ARE A COURTESY. `pattern`, `maxlength` and `type="tel"`
 * exist so someone finds out about a typo while they are looking at the field.
 * None of them survive a POST made with devtools open, and none of them run at
 * all if a value arrives from anywhere other than this form. So every rule the
 * database describes is applied again here, where it counts.
 *
 * NORMALISING MATTERS AS MUCH AS REJECTING. Three people type (310) 555-1234,
 * 310.555.1234 and 3105551234 and mean the same phone number. Storing all three
 * as typed means the value on a funding application depends on the habits of
 * whoever filled it in, and comparing two records for the same business becomes
 * guesswork. They are all stored the same way.
 */

export interface ValidationResult {
  value: unknown;
  error?: string;
}

export function normalizeAndValidate(
  question: Question,
  value: unknown,
): ValidationResult {
  // Blank is always allowed. Sections save partially by design — required
  // fields drive the progress bar and the specialist's completeness check, they
  // do not gate the write.
  if (value === null || value === undefined || value === "") {
    return { value: null };
  }

  switch (question.type) {
    case "phone":
      return validatePhone(value);

    case "select":
      return validateSelect(question, value);

    case "percent":
      return validateNumber(question, value, 0, 100);

    case "currency":
    case "number":
      return validateNumber(question, value);

    case "email":
      return validateEmail(value);

    case "date":
      return validateDate(value);

    default:
      return validateText(question, value);
  }
}

/**
 * US numbers, stored one way.
 *
 * A leading 1 is dropped rather than rejected — people write their own number
 * with a country code often enough that treating it as an error would be
 * pedantic, and it carries no information for a domestic broker.
 *
 * Kept as formatted text rather than bare digits because that is what the
 * funding application prints. A lender reading 3105551234 off a document is a
 * lender squinting.
 */
function validatePhone(value: unknown): ValidationResult {
  const digits = String(value).replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits;

  if (national.length !== 10) {
    return {
      value: null,
      error:
        national.length < 10
          ? "That number is too short — we need all 10 digits, including the area code."
          : "That number has too many digits. A US phone number is 10.",
    };
  }

  return {
    value: `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`,
  };
}

/**
 * A select's value must be one of its own options.
 *
 * Three of these write to Postgres enum columns, where an unexpected value is a
 * database error the applicant would see as "we couldn't save that just then".
 * Checking here turns that into a sentence that explains itself. The rest write
 * to text columns, where an unchecked value would simply be wrong and silent.
 */
function validateSelect(question: Question, value: unknown): ValidationResult {
  const text = String(value);

  if (question.options.length === 0) return { value: text };

  const match = question.options.find((option) => option.value === text);

  return match
    ? { value: match.value }
    : { value: null, error: "Choose one of the options listed." };
}

function validateNumber(
  question: Question,
  value: unknown,
  floor?: number,
  ceiling?: number,
): ValidationResult {
  const cleaned = String(value).replace(/[$,\s%]/g, "");
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) {
    return { value: null, error: "Enter a number." };
  }

  const min = question.validation.min ?? floor;
  const max = question.validation.max ?? ceiling;

  if (min !== undefined && parsed < min) {
    return { value: null, error: `That can't be less than ${min}.` };
  }

  if (max !== undefined && parsed > max) {
    return { value: null, error: `That can't be more than ${max}.` };
  }

  return { value: parsed };
}

function validateEmail(value: unknown): ValidationResult {
  const text = String(value).trim().toLowerCase();

  // Deliberately loose. The only address that is definitely deliverable is one
  // that has been delivered to, and every stricter regex on the internet
  // rejects somebody's real address.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
    return { value: null, error: "That doesn't look like an email address." };
  }

  return { value: text };
}

function validateDate(value: unknown): ValidationResult {
  const text = String(value).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return { value: null, error: "Enter a date." };
  }

  const parsed = new Date(`${text}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return { value: null, error: "That date doesn't exist." };
  }

  // A business that starts next year and an owner born next year are both
  // typos, and both would otherwise reach a lender unquestioned.
  if (parsed.getTime() > Date.now()) {
    return { value: null, error: "That date is in the future." };
  }

  return { value: text };
}

function validateText(question: Question, value: unknown): ValidationResult {
  const text = String(value).trim();
  const max = question.validation.max;

  if (max !== undefined && text.length > max) {
    return { value: null, error: `Keep this to ${max} characters or fewer.` };
  }

  if (question.validation.pattern) {
    // Anchored explicitly. An HTML `pattern` attribute is implicitly anchored
    // at both ends; a JavaScript RegExp is not, so the same expression that
    // means "exactly five digits" in the browser would mean "contains five
    // digits somewhere" here.
    const anchored = new RegExp(`^(?:${question.validation.pattern})$`);

    if (!anchored.test(text)) {
      return { value: null, error: patternMessage(question) };
    }
  }

  return { value: text };
}

/**
 * A regular expression is not an error message.
 *
 * Telling someone their ZIP code failed ^\d{5}(-\d{4})?$ tells them nothing.
 * These are the few patterns actually in use; anything new falls back to
 * something vague but honest rather than to the expression itself.
 */
function patternMessage(question: Question): string {
  if (question.key.endsWith("postal_code")) {
    return "Enter a 5-digit ZIP code, or ZIP+4.";
  }

  if (question.key.endsWith("ssn_last4")) {
    return "Just the last four digits.";
  }

  return "That isn't in the format we need.";
}
