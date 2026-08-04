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

export type ApplicationRow = {
  id: string;
  reference_code: string;
  profile_id: string | null;
  business_id: string | null;
  category_id: string | null;
  product_id: string | null;
  track: ProductTrack | null;
  financing_goal: string | null;
  requested_amount: number | null;
  use_of_funds: string | null;
  revenue_band: RevenueBand | null;
  credit_band: CreditBand | null;
  time_in_business: TimeInBusinessBand | null;
  urgency: UrgencyBand | null;
  industry: string | null;
  gross_annual_sales: number | null;
  avg_monthly_card_volume: number | null;
  has_existing_mca: boolean | null;
  existing_debt_balance: number | null;
  has_open_judgments_or_liens: boolean | null;
  has_bankruptcy: boolean | null;
  bankruptcy_discharged: boolean | null;
  status: ApplicationStatus;
  assigned_to: string | null;
  source: string | null;
  channel: string | null;
  utm: Json;
  submitted_at: string | null;
  first_contact_at: string | null;
  decision_at: string | null;
  funded_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
      qualification_results: Table<QualificationResultRow>;
      qualification_rulesets: Table<QualificationRulesetRow>;
      document_type_definitions: Table<DocumentTypeDefinitionRow>;
    };
    Views: EmptyMap;
    Functions: EmptyMap;
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
    };
    CompositeTypes: EmptyMap;
  };
}
