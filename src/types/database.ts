/**
 * Database types.
 *
 * Hand-maintained for the tables the app currently reads. To regenerate the
 * complete set from the live schema instead:
 *
 *   npx supabase gen types typescript --project-id crgvrzcifidcpfhazhxu > src/types/database.ts
 *
 * Keep this in sync with supabase/migrations/.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// -----------------------------------------------------------------------------
// ENUMS — mirror migration 0001
// -----------------------------------------------------------------------------

export type ProductTrack =
  | "equipment"
  | "working_capital"
  | "unsecured"
  | "ar_factoring"
  | "sba"
  | "cre"
  | "securities"
  | "healthcare"
  | "specialty";

/** Migration 0027. */
export type ContactStatus = "new" | "in_progress" | "closed";

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "initial_review"
  | "contact_attempted"
  | "contacted"
  | "information_requested"
  | "documents_requested"
  | "documents_received"
  | "under_review"
  | "potential_match"
  | "submitted_to_funder"
  | "approved"
  | "declined"
  | "withdrawn"
  | "funded"
  | "closed";

export type UserRole = "customer" | "specialist" | "manager" | "admin";

/** Deliberately excludes "approved" — the platform does not decide credit. */
export type QualificationOutcome =
  | "potential_match"
  | "requires_review"
  | "insufficient_information"
  | "no_match_identified";

export type DocumentStatus =
  | "requested"
  | "uploaded"
  | "under_review"
  | "accepted"
  | "rejected"
  | "waived";

export type CreditBand =
  | "below_600"
  | "600_649"
  | "650_679"
  | "680_719"
  | "720_759"
  | "760_plus"
  | "unknown";

export type RevenueBand =
  | "under_100k"
  | "100k_250k"
  | "250k_500k"
  | "500k_1m"
  | "1m_5m"
  | "5m_plus"
  | "unknown";

export type TimeInBusinessBand =
  | "startup_under_1y"
  | "1_2y"
  | "2_5y"
  | "5_10y"
  | "10y_plus";

export type UrgencyBand =
  | "immediately"
  | "within_30_days"
  | "within_90_days"
  | "just_exploring";

/** Direction of deposits over the trailing three months (migration 0016). */
export type DepositTrend =
  | "consistent_growing"
  | "declining"
  | "seasonal_irregular";

/** Prior credit events, as asked on the funding application (migration 0016). */
export type PriorDefaultStatus =
  | "none"
  | "discharged_resolved"
  | "active_recent";

/** Collateral classes relevant to secured-product eligibility (migration 0016). */
export type BusinessAssetType =
  | "none"
  | "real_estate"
  | "equipment"
  | "vehicles"
  | "inventory"
  | "receivables"
  | "other";

export type ConsentType =
  | "fcra_authorization"
  | "tcpa_sms"
  | "e_sign"
  | "privacy_policy"
  | "terms_of_use"
  | "credit_pull";

// -----------------------------------------------------------------------------
// ROWS
// -----------------------------------------------------------------------------

export type ProductCategoryRow = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type FinancingProductRow = {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  track: ProductTrack;
  headline: string | null;
  summary: string | null;
  who_its_for: string | null;
  amount_min: number | null;
  amount_max: number | null;
  min_fico: number | null;
  rate_note: string | null;
  term_note: string | null;
  program_notes: string | null;
  /** False until Robert confirms. Publication is blocked by a CHECK constraint. */
  terms_verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  source_note: string | null;
  is_published: boolean;
  has_live_application: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type ProfileRow = {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type EntityType =
  | "sole_proprietorship" | "partnership" | "llc" | "s_corp"
  | "c_corp" | "nonprofit" | "trust" | "other";

export type BusinessRow = {
  id: string;
  owner_profile_id: string | null;
  legal_name: string;
  dba: string | null;
  entity_type: EntityType | null;
  state_of_incorporation: string | null;
  /** Last four only. The full Tax ID is a signer field on the executed document. */
  ein_last4: string | null;
  business_start_date: string | null;
  industry: string | null;
  naics_code: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  billing_same_as_physical: boolean;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_postal_code: string | null;
  phone: string | null;
  preferred_contact_phone: string | null;
  email: string | null;
  website: string | null;
  premises_status: string | null;
  premises_monthly_payment: number | null;
  landlord_name: string | null;
  landlord_phone: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type ApplicationOwnerRow = {
  id: string;
  application_id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  ownership_pct: number | null;
  /** Last four only. The full SSN is a signer field on the executed document. */
  ssn_last4: string | null;
  date_of_birth: string | null;
  home_address_line1: string | null;
  home_address_line2: string | null;
  home_city: string | null;
  home_state: string | null;
  home_postal_code: string | null;
  home_phone: string | null;
  mobile_phone: string | null;
  email: string | null;
  credit_band: CreditBand | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export type ApplicationRow = {
  id: string;
  /** Sequential and human-readable. For staff use — never put this in a URL. */
  reference_code: string;
  /** Unguessable. This is what anonymous result links use. */
  public_token: string;
  /**
   * Idempotency key minted per prequal form render (migration 0018). Unique
   * where present, so resubmitting the same form resolves to the application
   * that already exists instead of creating a second one. Null for applications
   * not created through the public prequal form.
   */
  submission_token: string | null;
  profile_id: string | null;
  business_id: string | null;
  category_id: string | null;
  product_id: string | null;
  track: ProductTrack | null;
  financing_goal: string | null;
  requested_amount: number | null;
  use_of_funds: string | null;
  revenue_band: RevenueBand | null;
  /** Derived from owner_credit_score by trigger. Retained for existing readers. */
  credit_band: CreditBand | null;
  /** Exact self-reported score. Authoritative for qualification (migration 0016). */
  owner_credit_score: number | null;
  time_in_business: TimeInBusinessBand | null;
  urgency: UrgencyBand | null;
  industry: string | null;
  /** Sizes every estimated range the engine produces (migration 0016). */
  avg_monthly_revenue: number | null;
  deposit_trend: DepositTrend | null;
  total_monthly_debt_payments: number | null;
  prior_default_status: PriorDefaultStatus | null;
  /** IANA zone reported by the browser at submission. Timestamps stay UTC. */
  applicant_timezone: string | null;
  applicant_utc_offset_minutes: number | null;
  gross_annual_sales: number | null;
  avg_monthly_card_volume: number | null;
  has_existing_mca: boolean | null;
  existing_debt_balance: number | null;
  has_open_judgments_or_liens: boolean | null;
  has_bankruptcy: boolean | null;
  bankruptcy_discharged: boolean | null;
  // NOTE: owner_credit_score, avg_monthly_revenue, deposit_trend,
  // total_monthly_debt_payments, prior_default_status and submission_token were
  // declared a second time here by the merge — both branches added them. The
  // duplicates were removed rather than the originals above: deposit_trend and
  // prior_default_status are Postgres enums, and the second set typed them as
  // plain strings, which would have let any string past the compiler.
  credit_card_processor: string | null;
  judgment_lien_balance: number | null;
  bankruptcy_year: number | null;
  status: ApplicationStatus;
  assigned_to: string | null;
  source: string | null;
  channel: string | null;
  utm: Json;
  submitted_at: string | null;
  first_contact_at: string | null;
  decision_at: string | null;
  funded_at: string | null;
  /**
   * When a specialist released the funding application for signature (0030).
   *
   * Not a status: a file can be awaiting signature at several different stages,
   * and forcing that into application_status would make the two facts fight.
   */
  signature_requested_at: string | null;
  signature_requested_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** One asset offered as collateral. Repeatable per application (migration 0016). */
export type BusinessAssetRow = {
  id: string;
  application_id: string;
  asset_type: BusinessAssetType;
  description: string | null;
  estimated_value: number | null;
  debt_owed: number | null;
  position: number | null;
  created_at: string;
  updated_at: string;
}

export type QualificationResultRow = {
  id: string;
  application_id: string;
  outcome: QualificationOutcome;
  product_matches: Json;
  indicative_amount_min: number | null;
  indicative_amount_max: number | null;
  indicative_terms: Json;
  missing_information: Json;
  risk_flags: Json;
  review_required: boolean;
  ruleset_version: number | null;
  rules_evaluated: Json;
  engine_version: string | null;
  created_at: string;
}

export type QualificationRulesetRow = {
  id: string;
  track: ProductTrack;
  product_id: string | null;
  version: number;
  ruleset: Json;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type QuestionType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "percent"
  | "select"
  | "multiselect"
  | "boolean"
  | "date"
  | "email"
  | "phone"
  | "address";

export type ApplicationQuestionRow = {
  id: string;
  key: string;
  /** core_business | financial_snapshot | owner | equipment | ar | cre | sba | prequal */
  module: string;
  track: ProductTrack | null;
  product_id: string | null;
  label: string;
  help_text: string | null;
  placeholder: string | null;
  question_type: QuestionType;
  is_required: boolean;
  /** Drives redaction in logs and analytics. Spec §30. */
  is_pii: boolean;
  validation: Json;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type QuestionOptionRow = {
  id: string;
  question_id: string;
  value: string;
  label: string;
  sort_order: number;
  metadata: Json;
  created_at: string;
}

export type QuestionRuleRow = {
  id: string;
  name: string;
  description: string | null;
  track: ProductTrack | null;
  product_id: string | null;
  conditions: Json;
  effect: Json;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ApplicationAnswerRow = {
  id: string;
  application_id: string;
  question_key: string;
  question_id: string | null;
  value: Json;
  is_pii: boolean;
  created_at: string;
  updated_at: string;
}

export type ExistingDebtRow = {
  id: string;
  application_id: string;
  lender_name: string;
  balance: number | null;
  monthly_payment: number | null;
  original_amount: number | null;
  debt_type: string | null;
  position: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Website contact form messages. Migration 0027.
 *
 * Not an application: no track, no amount, no qualification result. Inserted by
 * a server action on the service role; there is no insert policy for anon.
 */
export type ContactSubmissionRow = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: ContactStatus;
  handled_by: string | null;
  handled_at: string | null;
  source: string;
  applicant_timezone: string | null;
  submission_token: string | null;
}

export type CrmNoteRow = {
  id: string;
  application_id: string;
  author_profile_id: string | null;
  body: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export type CrmTaskRow = {
  id: string;
  application_id: string;
  assigned_to: string | null;
  created_by: string | null;
  title: string;
  details: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ApplicationStatusHistoryRow = {
  id: string;
  application_id: string;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

/**
 * One document the applicant has been asked for.
 *
 * Seeded from document_type_definitions when an application is claimed, then
 * owned by staff — BUSINESS_CONTEXT §8 models the request/fulfil loop
 * explicitly because the checklist is where deals currently die.
 */
export type DocumentRequestRow = {
  id: string;
  application_id: string;
  document_type_key: string;
  is_required: boolean;
  status: DocumentStatus;
  instructions: string | null;
  requested_by: string | null;
  requested_at: string;
  due_date: string | null;
  reminder_count: number;
  last_reminder_at: string | null;
  satisfied_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * One file the applicant actually sent.
 *
 * storage_path is a path inside the private `application-documents` bucket, and
 * never a URL — spec §23 requires signed, time-limited access, so a URL held on
 * a row would either be permanently valid or already expired. The first path
 * segment is the application id, which is what the storage RLS policy in 0005
 * matches on.
 *
 * Several documents can hang off one request: a rejected first attempt, its
 * replacement, a specialist's own copy. The request's own status is derived from
 * them by the trigger in 0021 rather than set by whoever uploaded last.
 */
export type DocumentRow = {
  id: string;
  application_id: string;
  document_request_id: string | null;
  document_type_key: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  status: DocumentStatus;
  verification_note: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * A consent, as evidence rather than as a preference.
 *
 * `text_version` says which wording was shown and `text_hash` proves it — if the
 * constant behind a version were ever edited in place, existing records stop
 * matching and the discrepancy is visible rather than silent.
 *
 * No update or delete policy exists for this table by design (0005). A consent
 * record that can be edited is worthless as evidence.
 */
export type ConsentRow = {
  id: string;
  application_id: string | null;
  profile_id: string | null;
  consent_type: ConsentType;
  granted: boolean;
  text_version: string;
  text_hash: string | null;
  granted_at: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export type DocumentTypeDefinitionRow = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  is_universal: boolean;
  track: ProductTrack | null;
  is_pii: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// SUPABASE CLIENT SHAPE
// -----------------------------------------------------------------------------

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

/**
 * Empty-map type for the schema sections we don't use.
 *
 * This must be `{ [_ in never]: never }` and NOT `Record<string, never>`.
 * Record<string, never> claims *every* key exists with type never, so postgrest
 * finds each table name in Views as well as Tables and collapses the row type
 * to never. Matches what `supabase gen types` emits.
 */
type EmptyMap = { [_ in never]: never };

export type Database = {
  public: {
    Tables: {
      product_categories: Table<ProductCategoryRow>;
      financing_products: Table<FinancingProductRow>;
      profiles: Table<ProfileRow>;
      applications: Table<ApplicationRow>;
      businesses: Table<BusinessRow>;
      application_owners: Table<ApplicationOwnerRow>;
      qualification_results: Table<QualificationResultRow>;
      qualification_rulesets: Table<QualificationRulesetRow>;
      document_type_definitions: Table<DocumentTypeDefinitionRow>;
      document_requests: Table<DocumentRequestRow>;
      documents: Table<DocumentRow>;
      consents: Table<ConsentRow>;
      application_questions: Table<ApplicationQuestionRow>;
      question_options: Table<QuestionOptionRow>;
      question_rules: Table<QuestionRuleRow>;
      application_answers: Table<ApplicationAnswerRow>;
      business_assets: Table<BusinessAssetRow>;
      existing_debts: Table<ExistingDebtRow>;
      crm_notes: Table<CrmNoteRow>;
      crm_tasks: Table<CrmTaskRow>;
      application_status_history: Table<ApplicationStatusHistoryRow>;
      contact_submissions: Table<ContactSubmissionRow>;
    };
    Views: EmptyMap;
    Functions: {
      /**
       * Retract an upload that is still awaiting review. Defined in migration
       * 0021 and callable by design — it is the only write customers have on
       * public.documents beyond the initial insert, and it authorises itself
       * against auth.uid() rather than trusting the caller.
       */
      withdraw_document: {
        Args: { document_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      product_track: ProductTrack;
      application_status: ApplicationStatus;
      user_role: UserRole;
      qualification_outcome: QualificationOutcome;
      document_status: DocumentStatus;
      credit_band: CreditBand;
      revenue_band: RevenueBand;
      time_in_business_band: TimeInBusinessBand;
      urgency_band: UrgencyBand;
      consent_type: ConsentType;
      deposit_trend: DepositTrend;
      prior_default_status: PriorDefaultStatus;
      business_asset_type: BusinessAssetType;
      contact_status: ContactStatus;
    };
    CompositeTypes: EmptyMap;
  };
}
