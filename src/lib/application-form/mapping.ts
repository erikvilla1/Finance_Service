import type { Question } from "@/lib/questions";

/**
 * Where each answer actually gets stored.
 *
 * THE PROBLEM THIS SOLVES. The question engine and the funding application were
 * built against different stores and never introduced. `application_questions`
 * describes what to ask; `FUNDING_APPLICATION_FIELDS` describes what Robert's
 * paper form needs, and it reads `business.legal_name`, `owner.ssn_last4` —
 * typed columns on real tables. A form that wrote every answer to
 * `application_answers` would have been a complete, working, resumable form that
 * left the printed application exactly as blank as it is today.
 *
 * So answers are routed. A question that corresponds to a column writes the
 * column; anything else falls through to `application_answers`, which keeps
 * spec §9 intact — Robert can still add a question without a deploy, it just
 * lands in the generic store until someone gives it a home.
 *
 * WHY THIS IS WRITTEN OUT RATHER THAN DERIVED. The keys follow a convention
 * (`business_legal_name` → `businesses.legal_name`) and stripping the prefix
 * would produce this table in eight lines. It is written out anyway, because
 * the failure mode of the clever version is silent: rename a column, or add a
 * question whose key nearly matches, and the answer quietly diverts to
 * `application_answers` where nothing reads it. The form still works. The
 * lender package is still blank. That is the exact bug this file exists to fix,
 * and deriving the map would reintroduce it.
 *
 * PII stays where it was put deliberately. Owner date of birth and SSN last
 * four go to `application_owners` — the segregated table migration 0003 created
 * for them — not into a shared jsonb column alongside the business website.
 */

export type FormTarget =
  /** A column on the applicant's `businesses` row. */
  | { table: "business"; column: string }
  /** A column on the `applications` row itself. */
  | { table: "application"; column: string }
  /** A column on the primary `application_owners` row. */
  | { table: "owner"; column: string }
  /** No column exists — store as an answer. */
  | { table: "answer" };

const ANSWER: FormTarget = { table: "answer" };

export const QUESTION_TARGETS: Record<string, FormTarget> = {
  // ------------------------------------------------------------- core_business
  business_legal_name: { table: "business", column: "legal_name" },
  business_dba: { table: "business", column: "dba" },
  business_entity_type: { table: "business", column: "entity_type" },
  business_state_of_incorporation: { table: "business", column: "state_of_incorporation" },
  business_start_date: { table: "business", column: "business_start_date" },
  business_industry: { table: "business", column: "industry" },
  business_address_line1: { table: "business", column: "address_line1" },
  business_city: { table: "business", column: "city" },
  business_state: { table: "business", column: "state" },
  business_postal_code: { table: "business", column: "postal_code" },
  business_phone: { table: "business", column: "phone" },
  business_preferred_contact_phone: { table: "business", column: "preferred_contact_phone" },
  business_email: { table: "business", column: "email" },
  business_website: { table: "business", column: "website" },
  business_premises_status: { table: "business", column: "premises_status" },
  business_premises_payment: { table: "business", column: "premises_monthly_payment" },
  business_landlord_name: { table: "business", column: "landlord_name" },
  business_landlord_phone: { table: "business", column: "landlord_phone" },

  // -------------------------------------------------------- financial_snapshot
  fin_gross_annual_sales: { table: "application", column: "gross_annual_sales" },
  fin_avg_monthly_card_volume: { table: "application", column: "avg_monthly_card_volume" },
  fin_credit_card_processor: { table: "application", column: "credit_card_processor" },
  fin_use_of_funds: { table: "application", column: "use_of_funds" },
  fin_has_existing_mca: { table: "application", column: "has_existing_mca" },
  fin_existing_debt_balance: { table: "application", column: "existing_debt_balance" },
  fin_open_judgments_liens: { table: "application", column: "has_open_judgments_or_liens" },
  fin_judgment_lien_balance: { table: "application", column: "judgment_lien_balance" },
  fin_has_bankruptcy: { table: "application", column: "has_bankruptcy" },
  fin_bankruptcy_year: { table: "application", column: "bankruptcy_year" },
  fin_bankruptcy_discharged: { table: "application", column: "bankruptcy_discharged" },

  // -------------------------------------------------------------------- owner
  owner_first_name: { table: "owner", column: "first_name" },
  owner_last_name: { table: "owner", column: "last_name" },
  owner_title: { table: "owner", column: "title" },
  owner_ownership_pct: { table: "owner", column: "ownership_pct" },
  owner_date_of_birth: { table: "owner", column: "date_of_birth" },
  // owner_ssn_last4 deliberately absent — migration 0032 deactivated the
  // question and cleared the column. We do not store Social Security numbers in
  // any form; the full number is typed by the signer on the executed document
  // and never persisted. Leaving a route to that column would make it one
  // reactivated question away from being collected again by accident.
  owner_home_address_line1: { table: "owner", column: "home_address_line1" },
  owner_home_city: { table: "owner", column: "home_city" },
  owner_home_state: { table: "owner", column: "home_state" },
  owner_home_postal_code: { table: "owner", column: "home_postal_code" },
  owner_mobile_phone: { table: "owner", column: "mobile_phone" },
  owner_email: { table: "owner", column: "email" },
  owner_credit_band: { table: "owner", column: "credit_band" },
};

export function targetFor(questionKey: string): FormTarget {
  return QUESTION_TARGETS[questionKey] ?? ANSWER;
}

/**
 * The sections this form covers, in the order they are asked.
 *
 * The prequal module is absent because it is asked before the account exists
 * and is owned by the other side of the build. The track modules (equipment,
 * ar, cre, sba) are absent because they are not built yet — when they are, they
 * are added here and to MODULE_ORDER in @/lib/questions, and nothing else has
 * to change.
 */
export const FORM_MODULES = [
  "core_business",
  "financial_snapshot",
  "owner",
] as const;

export type FormModule = (typeof FORM_MODULES)[number];

export function isFormModule(value: string): value is FormModule {
  return (FORM_MODULES as readonly string[]).includes(value);
}

// -----------------------------------------------------------------------------
// VALUE COERCION
// -----------------------------------------------------------------------------

/**
 * Turn one submitted string into the value its column expects.
 *
 * Everything arrives from FormData as a string, including the empty one. The
 * distinction that matters here is empty-means-null: writing "" into a numeric
 * column errors, and writing it into a text column produces a field that looks
 * answered on the completeness check and is blank on the printed form.
 */
export function coerceValue(
  question: Question,
  raw: FormDataEntryValue | null,
): unknown {
  const text = typeof raw === "string" ? raw.trim() : "";

  if (text === "") return null;

  switch (question.type) {
    case "number":
    case "currency":
    case "percent": {
      // Tolerate what people actually type into a money field.
      const cleaned = text.replace(/[$,\s%]/g, "");
      const value = Number(cleaned);
      return Number.isFinite(value) ? value : null;
    }

    case "boolean":
      return text === "true" || text === "yes" || text === "on";

    default:
      return text;
  }
}

/**
 * Whether an answer counts as given.
 *
 * `false` is an answer. Someone reporting no bankruptcy has answered the
 * bankruptcy question, and a truthiness check here would leave them staring at a
 * section that says one item is outstanding with every field visibly filled in.
 */
export function isAnswered(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}
