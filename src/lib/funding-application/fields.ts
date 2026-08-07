/**
 * The funding application form, described as data.
 *
 * This is the single source of truth for what Robert's funding application
 * (Funding_Application_Fillable.docx) requires, where each value comes from,
 * and who is allowed to supply it.
 *
 * Everything downstream reads this one list:
 *   • the completeness check that tells Robert whether a file is ready
 *   • the merge payload sent to the e-signature template
 *   • the audit of which fields never touch our database
 *
 * When the form changes, this file changes, and the rest follows.
 */

export type FieldSource =
  /** A column on applications, businesses, or application_owners. */
  | "column"
  /** An answer stored against a question key. */
  | "answer"
  /** Rows from existing_debts. */
  | "collection"
  /**
   * Filled by the signer on the executed document. NEVER stored by us.
   * BUSINESS_CONTEXT §14.1b — full SSN and Tax ID live on the signed PDF only.
   */
  | "signer";

export interface FundingApplicationField {
  /** Merge-field name on the e-signature template. */
  key: string;
  /** The label as printed on the paper form, so the mapping stays checkable. */
  formLabel: string;
  section: FundingApplicationSection;
  source: FieldSource;
  /** Where to read it. Dotted path for columns, question key for answers. */
  path?: string;
  /**
   * Required by the lender. A file missing any of these is not ready to send —
   * this is what drives the completeness check, not the form's own asterisks.
   */
  required: boolean;
  /** Regulated personal information. Drives redaction in logs and analytics. */
  pii?: boolean;
  /** Only required when this predicate holds. */
  requiredWhen?: (context: CompletenessContext) => boolean;
  notes?: string;
}

export type FundingApplicationSection =
  | "business"
  | "premises"
  | "financials"
  | "obligations"
  | "primary_owner"
  | "secondary_owner"
  | "request"
  | "signature";

export const SECTION_LABELS: Record<FundingApplicationSection, string> = {
  business: "Business details",
  premises: "Premises",
  financials: "Financial snapshot",
  obligations: "Existing obligations",
  primary_owner: "Primary owner",
  secondary_owner: "Secondary owner",
  request: "Financing request",
  signature: "Signature",
};

/** The data the checker reasons over. */
export interface CompletenessContext {
  application: Record<string, unknown> | null;
  business: Record<string, unknown> | null;
  owners: Record<string, unknown>[];
  answers: Record<string, unknown>;
  debtCount: number;
}

export const FUNDING_APPLICATION_FIELDS: FundingApplicationField[] = [
  // ---------------------------------------------------------------- BUSINESS
  { key: "business_legal_name", formLabel: "Business Legal Name", section: "business",
    source: "column", path: "business.legal_name", required: true },
  { key: "business_dba", formLabel: "Business DBA", section: "business",
    source: "column", path: "business.dba", required: false },
  { key: "state_of_incorporation", formLabel: "State of Incorporation", section: "business",
    source: "column", path: "business.state_of_incorporation", required: true },
  { key: "business_start_date", formLabel: "Business Start Date", section: "business",
    source: "column", path: "business.business_start_date", required: true },
  { key: "industry_type", formLabel: "Industry Type", section: "business",
    source: "column", path: "business.industry", required: true },
  { key: "entity_type", formLabel: "Business Entity Type", section: "business",
    source: "column", path: "business.entity_type", required: true },
  { key: "location_phone", formLabel: "Location Phone", section: "business",
    source: "column", path: "business.phone", required: true },
  { key: "preferred_contact_phone", formLabel: "Preferred Contact Phone", section: "business",
    source: "column", path: "business.preferred_contact_phone", required: false },
  { key: "web_address", formLabel: "Web Address", section: "business",
    source: "column", path: "business.website", required: false },
  { key: "business_email", formLabel: "Business Email Address", section: "business",
    source: "column", path: "business.email", required: true },
  { key: "physical_street_address", formLabel: "Physical Street Address", section: "business",
    source: "column", path: "business.address_line1", required: true },
  { key: "physical_city", formLabel: "City", section: "business",
    source: "column", path: "business.city", required: true },
  { key: "physical_state", formLabel: "State", section: "business",
    source: "column", path: "business.state", required: true },
  { key: "physical_zip", formLabel: "Zip", section: "business",
    source: "column", path: "business.postal_code", required: true },
  { key: "billing_street_address", formLabel: "Billing Address (if different)", section: "business",
    source: "column", path: "business.billing_address_line1", required: false },

  // Tax ID is on the form but never in our database.
  { key: "tax_id_number", formLabel: "Tax ID Number", section: "business",
    source: "signer", required: true, pii: true,
    notes: "Signer-input field. Collected on the executed document; we store ein_last4 only." },

  // ---------------------------------------------------------------- PREMISES
  { key: "premises_status", formLabel: "Rented / Mortgaged", section: "premises",
    source: "column", path: "business.premises_status", required: true },
  { key: "premises_monthly_payment", formLabel: "Monthly Payment", section: "premises",
    source: "column", path: "business.premises_monthly_payment", required: false,
    requiredWhen: (c) => {
      const s = c.business?.premises_status;
      return s === "rent" || s === "mortgage";
    } },
  { key: "landlord_name", formLabel: "Landlord Name", section: "premises",
    source: "column", path: "business.landlord_name", required: false,
    requiredWhen: (c) => c.business?.premises_status === "rent" },
  { key: "landlord_phone", formLabel: "Landlord Phone", section: "premises",
    source: "column", path: "business.landlord_phone", required: false,
    requiredWhen: (c) => c.business?.premises_status === "rent" },

  // -------------------------------------------------------------- FINANCIALS
  { key: "gross_annual_sales", formLabel: "Gross Annual Sales", section: "financials",
    source: "column", path: "application.gross_annual_sales", required: true },
  { key: "avg_monthly_card_volume", formLabel: "Average Monthly Credit Card Volume",
    section: "financials", source: "column",
    path: "application.avg_monthly_card_volume", required: false },
  { key: "credit_card_processor", formLabel: "Credit Card Processor", section: "financials",
    source: "column", path: "application.credit_card_processor", required: false,
    requiredWhen: (c) => Number(c.application?.avg_monthly_card_volume ?? 0) > 0 },
  { key: "has_open_mca_or_loans", formLabel: "Open MCA or Loan Accounts?",
    section: "financials", source: "column", path: "application.has_existing_mca", required: true },
  { key: "has_judgments_or_liens", formLabel: "Open judgments or tax liens?",
    section: "financials", source: "column",
    path: "application.has_open_judgments_or_liens", required: true },
  { key: "judgment_lien_balance", formLabel: "Judgment / lien balance", section: "financials",
    source: "column", path: "application.judgment_lien_balance", required: false,
    requiredWhen: (c) => c.application?.has_open_judgments_or_liens === true },
  { key: "has_bankruptcy", formLabel: "Open/discharged bankruptcies?", section: "financials",
    source: "column", path: "application.has_bankruptcy", required: true },
  { key: "bankruptcy_year", formLabel: "Bankruptcy year", section: "financials",
    source: "column", path: "application.bankruptcy_year", required: false,
    requiredWhen: (c) => c.application?.has_bankruptcy === true },

  // ------------------------------------------------------------- OBLIGATIONS
  { key: "existing_debts", formLabel: "Lender 1 / 2 and balances", section: "obligations",
    source: "collection", required: false,
    requiredWhen: (c) => c.application?.has_existing_mca === true,
    notes: "The form has two rows; we store the full schedule and render as many as fit." },

  // ----------------------------------------------------------- PRIMARY OWNER
  { key: "primary_owner_first_name", formLabel: "First Name", section: "primary_owner",
    source: "column", path: "owner.0.first_name", required: true, pii: true },
  { key: "primary_owner_last_name", formLabel: "Last Name", section: "primary_owner",
    source: "column", path: "owner.0.last_name", required: true, pii: true },
  { key: "primary_owner_title", formLabel: "Title", section: "primary_owner",
    source: "column", path: "owner.0.title", required: true },
  { key: "primary_owner_ownership_pct", formLabel: "% of Ownership", section: "primary_owner",
    source: "column", path: "owner.0.ownership_pct", required: true },
  { key: "primary_owner_dob", formLabel: "Date of Birth", section: "primary_owner",
    source: "column", path: "owner.0.date_of_birth", required: true, pii: true },
  { key: "primary_owner_home_phone", formLabel: "Home Phone", section: "primary_owner",
    source: "column", path: "owner.0.home_phone", required: false, pii: true },
  { key: "primary_owner_mobile_phone", formLabel: "Mobile Phone", section: "primary_owner",
    source: "column", path: "owner.0.mobile_phone", required: true, pii: true },
  { key: "primary_owner_email", formLabel: "Email Address", section: "primary_owner",
    source: "column", path: "owner.0.email", required: true, pii: true },
  { key: "primary_owner_home_address", formLabel: "Home Address", section: "primary_owner",
    source: "column", path: "owner.0.home_address_line1", required: true, pii: true },
  { key: "primary_owner_home_city", formLabel: "City", section: "primary_owner",
    source: "column", path: "owner.0.home_city", required: true, pii: true },
  { key: "primary_owner_home_state", formLabel: "State", section: "primary_owner",
    source: "column", path: "owner.0.home_state", required: true, pii: true },
  { key: "primary_owner_home_zip", formLabel: "Zip", section: "primary_owner",
    source: "column", path: "owner.0.home_postal_code", required: true, pii: true },
  { key: "primary_owner_ssn", formLabel: "SS#", section: "primary_owner",
    source: "signer", required: true, pii: true,
    notes: "Signer-input field. Never stored — we hold ssn_last4 only (BUSINESS_CONTEXT §14.1b)." },

  // --------------------------------------------------------- SECONDARY OWNER
  // Optional throughout: many applicants are sole owners. Required only once a
  // second owner exists, because a partially filled second owner block is worse
  // than none at all.
  { key: "secondary_owner_first_name", formLabel: "First Name", section: "secondary_owner",
    source: "column", path: "owner.1.first_name", required: false, pii: true,
    requiredWhen: (c) => c.owners.length > 1 },
  { key: "secondary_owner_last_name", formLabel: "Last Name", section: "secondary_owner",
    source: "column", path: "owner.1.last_name", required: false, pii: true,
    requiredWhen: (c) => c.owners.length > 1 },
  { key: "secondary_owner_ownership_pct", formLabel: "% of Ownership",
    section: "secondary_owner", source: "column", path: "owner.1.ownership_pct",
    required: false, requiredWhen: (c) => c.owners.length > 1 },
  { key: "secondary_owner_email", formLabel: "Email Address", section: "secondary_owner",
    source: "column", path: "owner.1.email", required: false, pii: true,
    requiredWhen: (c) => c.owners.length > 1 },
  { key: "secondary_owner_ssn", formLabel: "SS#", section: "secondary_owner",
    source: "signer", required: false, pii: true,
    requiredWhen: (c) => c.owners.length > 1,
    notes: "Signer-input field. Never stored." },

  // -------------------------------------------------------------- THE REQUEST
  { key: "use_of_funds", formLabel: "Use of funds", section: "request",
    source: "column", path: "application.use_of_funds", required: true },
  { key: "desired_loan_amount", formLabel: "Desired Loan Amount", section: "request",
    source: "column", path: "application.requested_amount", required: true },

  // --------------------------------------------------------------- SIGNATURE
  { key: "primary_owner_signature", formLabel: "Primary Owner/Officer Signature",
    section: "signature", source: "signer", required: true },
  { key: "primary_owner_signature_date", formLabel: "Date", section: "signature",
    source: "signer", required: true },
  { key: "secondary_owner_signature", formLabel: "Secondary Owner/Officer Signature",
    section: "signature", source: "signer", required: false,
    requiredWhen: (c) => c.owners.length > 1 },
];

/** Fields we deliberately never store. Useful as an audit, not just a filter. */
export const SIGNER_ONLY_FIELDS = FUNDING_APPLICATION_FIELDS.filter(
  (f) => f.source === "signer",
);

/** Everything we are expected to prefill from our own data. */
export const PREFILLABLE_FIELDS = FUNDING_APPLICATION_FIELDS.filter(
  (f) => f.source !== "signer",
);
