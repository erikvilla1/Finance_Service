-- =============================================================================
-- 0006 — SEED: CATEGORIES, PRODUCTS, DOCUMENT TYPES, PLACEHOLDER RULESETS
--
-- ⚠️  EVERY PROGRAM FIGURE BELOW IS UNVERIFIED.
--
-- Sourced from docs/BUSINESS_CONTEXT.md §5.1, which was transcribed from
-- Robert's marketing brochures. Those brochures contain overlapping and
-- contradictory numbers. Nothing here is a customer-facing claim.
--
-- Every row is seeded terms_verified = false and is_published = false. The
-- published_products_must_be_verified CHECK constraint makes it impossible to
-- publish a product until someone explicitly marks the terms confirmed.
--
-- To verify a product after the Phase-0 session with Robert:
--   update public.financing_products
--      set terms_verified = true, verified_at = now(), verified_by = 'Robert Saucedo',
--          is_published = true
--    where slug = '...';
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CATEGORIES — goal-based navigation (platform spec §6)
--
-- NOTE: "Startup & Growth Capital" is a PROPOSED fifth category, not in the
-- platform spec. The spec's four categories have no home for the unsecured
-- term-loan, credit-line, and startup programs, which have three brochures and
-- a live application between them. Flagged for review — see BUSINESS_CONTEXT
-- §14.2.
-- -----------------------------------------------------------------------------
insert into public.product_categories (slug, name, headline, description, sort_order) values
  ('equipment-asset-financing', 'Equipment & Asset Financing',
   'Finance the equipment your business needs to move forward',
   'Financing and leasing for construction equipment, specialty vehicles, and business assets.', 1),

  ('business-cash-flow', 'Business Cash Flow',
   'Access capital for day-to-day operations and growth',
   'Working capital, receivables financing, and revenue-based options for businesses that need cash flow.', 2),

  ('real-estate', 'Real Estate',
   'Commercial real estate financing built around your transaction',
   'Purchase, refinance, cash-out, bridge, and investment property financing.', 3),

  ('startup-growth-capital', 'Startup & Growth Capital',
   'Capital for newer businesses and growing operations',
   'Unsecured term loans, credit lines, and programs designed for businesses without a long operating history.', 4),

  ('specialized-financing', 'Specialized Financing',
   'Financing for situations that do not fit standard programs',
   'SBA, healthcare, acquisition, and other specialized financing programs.', 5);

-- -----------------------------------------------------------------------------
-- PRODUCTS
--
-- category = how a customer finds it. track = how it is underwritten.
-- The two deliberately cross: equipment-equity sits under Business Cash Flow
-- for navigation but underwrites on the equipment track.
-- -----------------------------------------------------------------------------
insert into public.financing_products
  (slug, name, category_id, track, headline, summary,
   amount_min, amount_max, min_fico, rate_note, term_note, program_notes,
   has_live_application, source_note, sort_order)
select v.slug, v.name, c.id, v.track::public.product_track, v.headline, v.summary,
       v.amount_min, v.amount_max, v.min_fico, v.rate_note, v.term_note, v.program_notes,
       v.has_live_app, v.source_note, v.sort_order
from (values
  -- ---- Equipment & Asset Financing -----------------------------------------
  ('construction-equipment-financing', 'Construction Equipment Financing',
   'equipment-asset-financing', 'equipment',
   'Finance the Equipment Your Business Needs to Move Forward',
   'Construction equipment and specialty vehicle financing for businesses of all sizes, including startups and borrowers who may not fit traditional bank lending requirements.',
   10000::numeric, 500000::numeric, null::integer,
   'Tiered by credit grade', 'Terms vary by program',
   'Application-only programs may be available at lower transaction sizes. Larger transactions handled case by case.',
   true, 'Equipment Finance Pricing brochure; General Services brochure. Figures conflict across sheets.', 1),

  ('equipment-leasing', 'Equipment Leasing',
   'equipment-asset-financing', 'equipment',
   'Acquire the Equipment You Need Without Tying Up All Your Cash',
   'Leasing programs including application-only, middle market, and large-ticket structures, with options for startups and municipal entities.',
   10000::numeric, 2000000::numeric, null::integer,
   'Varies by credit grade and program', 'Terms up to 84 months per source material',
   'Application-only, middle market, and large ticket tiers. Startup and B/C/D credit programs referenced in source material.',
   true, 'Equipment Finance Pricing brochure. Verify tier thresholds.', 2),

  ('sale-leaseback', 'Sale & Leaseback',
   'equipment-asset-financing', 'equipment',
   'Convert Owned Equipment Into Working Capital',
   'Structures that may allow a business to sell owned equipment and lease it back, freeing capital while retaining use of the asset.',
   null::numeric, null::numeric, null::integer,
   null, null,
   'Referenced in source material without complete terms. Awaiting verified program details.',
   false, 'Equipment leasing brochure — mentioned, terms not specified.', 3),

  -- ---- Business Cash Flow ---------------------------------------------------
  ('working-capital-equipment-equity', 'Working Capital / Equipment Equity',
   'business-cash-flow', 'equipment',
   'Turn Equipment Equity Into Business Capital',
   'Programs that may be based on the value and equity of owned equipment rather than company profitability.',
   null::numeric, null::numeric, null::integer,
   null, null,
   'May consider challenged personal credit. Underwrites on the equipment track despite sitting under cash flow for navigation.',
   true, 'General Services brochure.', 1),

  ('working-capital-loans', 'Working Capital Loans',
   'business-cash-flow', 'working_capital',
   'Capital for the Work in Front of You',
   'Working capital financing to cover operations, payroll, inventory, and growth.',
   null::numeric, null::numeric, null::integer,
   null, null, null,
   true, 'Working Capital application on file.', 2),

  ('revenue-based-financing', 'Revenue-Based Financing / Cash Advance',
   'business-cash-flow', 'working_capital',
   'Funding Based on What Your Business Actually Brings In',
   'Advance structures sized against average monthly card or sales volume, repaid as a percentage of revenue.',
   null::numeric, 250000::numeric, null::integer,
   'Factor-based, not expressed as APR', 'Up to roughly 2-year repayment per source material',
   'Source sheets disagree on the maximum ($250K vs $500K). Typically sized at 80–120% of average monthly volume. Six months of statements; no tax returns or financial statements per source material.',
   true, 'MCA brochure. Maximum conflicts across sheets — verify.', 3),

  ('accounts-receivable-financing', 'Accounts Receivable Financing',
   'business-cash-flow', 'ar_factoring',
   'Get Access to Cash While You Wait to Get Paid',
   'Funds advanced against eligible receivables and settled when your customers pay, subject to program terms.',
   null::numeric, null::numeric, null::integer,
   'Interest charged on the advance', 'Setup in roughly 7–10 business days per source material',
   'Advance rates referenced up to 80% of eligible receivables, with the balance released on customer payment less interest. Largely credit-agnostic — underwrites the receivable, not the borrower.',
   true, 'Accounts Receivable brochure.', 4),

  -- ---- Real Estate ----------------------------------------------------------
  ('commercial-real-estate-financing', 'Commercial Real Estate Financing',
   'real-estate', 'cre',
   'Commercial Real Estate Financing Built Around Your Transaction',
   'Purchase, refinance, and cash-out financing for most commercial property types, for both investors and owner-occupants.',
   250000::numeric, 10000000::numeric, null::integer,
   'Source material quotes a range; requires verification', 'Up to 20-year payout per source material',
   'Source material references low down payment options and fast approvals. All terms require verification before publication.',
   true, 'Real Estate brochure; CRE Loan Matrix. Verify LTV and rate claims.', 1),

  ('fix-and-flip', 'Fix & Flip Financing',
   'real-estate', 'cre',
   'Fund Your Next Real Estate Investment',
   'Short-term financing for non-owner-occupied residential investment property acquisition and rehabilitation.',
   75000::numeric, 2000000::numeric, 650,
   'Hard-money pricing', '12-month term per source material',
   'Source material references financing a share of purchase price plus rehab costs, capped against after-repair value. Non-owner-occupied 1–4 family, condo, townhome. Minimum property value referenced at $100K ARV.',
   true, 'Fix and Flip brochure; CRE Loan Matrix.', 2),

  ('long-term-rental', 'Long-Term Rental (Fix & Hold)',
   'real-estate', 'cre',
   'Financing for Property You Intend to Keep',
   'Longer-term financing for stabilized single-property rental investments.',
   75000::numeric, 1500000::numeric, 680,
   null, '30-year term per source material',
   'Purchase, refinance, and cash-out structures referenced with differing advance rates. Prepayment options referenced from 0 to 5 years. Minimum property value referenced at $115K.',
   true, 'CRE Loan Matrix.', 3),

  ('short-term-multifamily', 'Short-Term Multifamily Bridge (5+ Units)',
   'real-estate', 'cre',
   'Bridge Financing for Multifamily Assets',
   'Short-term bridge financing for stabilized multifamily properties of five or more units.',
   250000::numeric, 2000000::numeric, 650,
   'Bridge pricing', '12-month term per source material',
   'Purchase, refinance, and cash-out advance rates differ by structure. Minimum property value referenced at $375K.',
   true, 'CRE Loan Matrix.', 4),

  ('long-term-multifamily', 'Long-Term Multifamily (5–9 Units)',
   'real-estate', 'cre',
   'Long-Term Financing for Small Multifamily',
   'Thirty-year financing for small multifamily properties.',
   150000::numeric, 1500000::numeric, 700,
   null, '30-year term per source material',
   'Per-unit minimum value referenced at $100K. Prepayment options referenced at 0 and 5 years.',
   true, 'CRE Loan Matrix.', 5),

  ('commercial-bridge-loans', 'Commercial Bridge Loans',
   'real-estate', 'cre',
   'When Timing Matters, Bridge the Gap',
   'Short-term financing for borrowers who need capital before longer-term financing closes.',
   75000::numeric, 2000000::numeric, 650,
   'Hard-money pricing; higher rates and fees may apply given the short term', '12-month term per source material',
   'Source material references terms from six months to three years and fast closings on some transactions. Verify before publication.',
   true, 'Bridge Loan brochure; CRE Loan Matrix. Term length conflicts across sheets.', 6),

  ('ground-up-construction', 'Ground-Up Construction',
   'real-estate', 'cre',
   'Financing for Projects Starting From the Ground',
   'Construction financing for new-build residential and commercial projects.',
   null::numeric, null::numeric, null::integer,
   null, null,
   'Referenced in the platform specification without complete terms. Awaiting verified program details.',
   false, 'Platform spec §6 — no brochure terms located.', 7),

  -- ---- Startup & Growth Capital --------------------------------------------
  ('unsecured-term-loans', 'Unsecured Term Loans',
   'startup-growth-capital', 'unsecured',
   'Fixed-Term Capital Without Collateral',
   'Unsecured term financing for borrowers with established personal credit profiles.',
   25000::numeric, 350000::numeric, 680,
   'Source material quotes a starting rate and an average range; requires verification',
   '3, 5, 7, and 10-year terms referenced',
   'Source material references credit profile requirements including a minimum number of tradelines, utilization limits, and debt-to-income thresholds.',
   true, 'Start up-Unsecured-Term-Loans-Program brochure.', 1),

  ('unsecured-credit-lines', 'Unsecured Credit Lines',
   'startup-growth-capital', 'unsecured',
   'Revolving Capital You Draw On As Needed',
   'Unsecured revolving credit lines for qualified guarantors.',
   25000::numeric, 200000::numeric, 680,
   'Introductory promotional pricing referenced in source material',
   'Funding referenced at roughly 10 business days',
   'Amount referenced per guarantor. Source material references recent-derogatory and existing-credit-line requirements. A separate sheet quotes a different maximum — verify.',
   true, 'Start up-Unsecured-Credit-Lines-Program brochure. Maximum conflicts with General Services sheet.', 2),

  ('startup-funding', 'Start-Up Funding',
   'startup-growth-capital', 'unsecured',
   'Capital for Businesses Without a Long Track Record',
   'Programs designed for newer businesses with little or no operating history, underwritten primarily on the guarantor.',
   null::numeric, 500000::numeric, 680,
   'Differs between term and card structures', null,
   'Source material references little or no time-in-business requirement, supported by personal tax returns demonstrating income. Card programs reference a higher credit threshold than term programs.',
   false, 'Start up Funding brochure.', 3),

  ('unsecured-business-loc', 'Unsecured Business Line of Credit',
   'startup-growth-capital', 'unsecured',
   'A Business Credit Line Built On Your Business Profile',
   'Business credit lines supported by establishing and building a business credit profile.',
   null::numeric, 150000::numeric, null::integer,
   'Lender-dependent', null,
   'Source material references corporate setup and business credit profile development as part of the program.',
   true, 'General Services brochure.', 4),

  -- ---- Specialized Financing ------------------------------------------------
  ('sba-loan-program', 'SBA Loan Program',
   'specialized-financing', 'sba',
   'Government-Backed Financing With Long Repayment Terms',
   'SBA financing for acquisition, real estate, equipment, working capital, and debt refinance.',
   150000::numeric, 12000000::numeric, null::integer,
   'Source material references competitive pricing with no balloon', 'Up to 25-year payout per source material',
   'Source material describes a preferred-partner designation and a target processing timeline, plus a size standard for certain retail and service businesses. Verify all claims before publication.',
   true, 'SBA brochure; SBA one sheet.', 1),

  ('medical-working-capital', 'Medical Working Capital',
   'specialized-financing', 'healthcare',
   'Flexible Working Capital for Medical Professionals',
   'Working capital programs for licensed medical professionals, including options for those with challenged credit.',
   25000::numeric, 500000::numeric, null::integer,
   'Source material references competitive rates', null,
   'Source material references approval and funding timelines and eligibility for professionals with damaged credit. Do not publish an exhaustive list of eligible professions until verified.',
   false, 'Health care flyer.', 2),

  ('healthcare-lending', 'Healthcare Lending',
   'specialized-financing', 'healthcare',
   'Specialized Financing for Healthcare Operators',
   'Lines of credit, factoring, and term financing for healthcare businesses including home health, senior care, and specialty pharmacy.',
   5000::numeric, 30000000::numeric, null::integer,
   'Source material references index-linked pricing and factor rates', null,
   'Wide amount range reflects distinct line-of-credit, factoring, and term products under one vertical. Split into separate products once terms are verified.',
   false, 'Healthcare vertical material.', 3),

  ('securities-based-lending', 'Securities-Based Lending',
   'specialized-financing', 'securities',
   'Borrow Against Your Portfolio Without Selling It',
   'Lines of credit secured by an investment portfolio, without transfer of title.',
   null::numeric, null::numeric, null::integer,
   null, null,
   'Source material describes a non-transfer-of-title structure with advance rates against portfolio value. Marketing claim about market uniqueness must be verified before publication.',
   false, 'General Services brochure.', 4),

  ('church-financing', 'Church Financing',
   'specialized-financing', 'specialty',
   'Financing for Places of Worship',
   'Equipment and facility financing for churches and religious organizations.',
   null::numeric, null::numeric, null::integer,
   null, 'Source material references terms up to 60 months',
   'Awaiting complete verified program details.',
   false, 'Church-Equipment-Financing-Flyer.', 5),

  ('business-acquisition-financing', 'Business Acquisition Financing',
   'specialized-financing', 'specialty',
   'Financing to Buy a Business',
   'Financing for business acquisitions and partner buyouts.',
   null::numeric, null::numeric, null::integer,
   null, null,
   'Referenced in the platform specification. Often structured through the SBA track. Awaiting verified terms.',
   false, 'Platform spec §6.', 6),

  ('debt-restructuring', 'Debt Restructuring',
   'specialized-financing', 'specialty',
   'Restructure Existing Business Debt',
   'Programs intended to reorganize existing business obligations into a more manageable structure.',
   null::numeric, null::numeric, null::integer,
   null, null,
   'Source material references a payment reduction figure. That claim must be verified and appropriately qualified before publication.',
   false, 'General Services brochure. Payment-reduction claim requires verification.', 7)
) as v(slug, name, category_slug, track, headline, summary,
       amount_min, amount_max, min_fico, rate_note, term_note, program_notes,
       has_live_app, source_note, sort_order)
join public.product_categories c on c.slug = v.category_slug;

-- -----------------------------------------------------------------------------
-- DOCUMENT TYPES (BUSINESS_CONTEXT §5.2)
--
-- Robert's universal set, in his own words: everything on the application, plus
-- an Experian report, six months of bank statements, and a business debt
-- schedule. Track-specific types layer on top.
-- -----------------------------------------------------------------------------
insert into public.document_type_definitions
  (key, label, description, is_universal, track, is_pii, sort_order) values
  ('signed_application', 'Signed Application',
   'The completed and signed credit application.', true, null, true, 1),
  ('credit_report', 'Credit Report / Score',
   'A copy of the borrower''s credit report and score.', true, null, true, 2),
  ('bank_statements_6mo', 'Bank Statements (6 Months)',
   'The most recent six months of business bank statements.', true, null, true, 3),
  ('business_debt_schedule', 'Business Debt Schedule',
   'A completed schedule of existing business obligations.', true, null, true, 4),

  ('equipment_invoice', 'Equipment Invoice or Quote',
   'Invoice or quote from the dealer or seller.', false, 'equipment', false, 10),

  ('rent_roll', 'Rent Roll',
   'Current rent roll for the subject property.', false, 'cre', true, 20),
  ('operating_statements', 'Operating Statements',
   'Historical operating statements for the property.', false, 'cre', true, 21),
  ('purchase_contract', 'Purchase Contract',
   'Executed purchase and sale agreement.', false, 'cre', true, 22),

  ('ar_aging', 'Accounts Receivable Aging',
   'Current A/R aging report.', false, 'ar_factoring', true, 30),
  ('ap_aging', 'Accounts Payable Aging',
   'Current A/P aging report.', false, 'ar_factoring', true, 31),
  ('top_debtor_list', 'Top Debtor List',
   'List of largest customers by outstanding balance.', false, 'ar_factoring', true, 32),
  ('sample_invoices', 'Sample Invoices',
   'Representative invoices showing terms of sale.', false, 'ar_factoring', true, 33),

  ('business_tax_returns', 'Business Tax Returns',
   'Business tax returns for the periods requested.', false, 'sba', true, 40),
  ('personal_tax_returns', 'Personal Tax Returns',
   'Personal tax returns for each owner as requested.', false, 'sba', true, 41),
  ('ownership_affiliate_detail', 'Ownership & Affiliate Detail',
   'Detail of all owners and affiliated entities.', false, 'sba', true, 42),
  ('collateral_schedule', 'Collateral Schedule',
   'Schedule of collateral offered.', false, 'sba', true, 43);

-- -----------------------------------------------------------------------------
-- PLACEHOLDER QUALIFICATION RULESETS
--
-- ⚠️  INACTIVE AND INTENTIONALLY INCOMPLETE.
--
-- These exist so the engine has a shape to evaluate and so the wiring can be
-- tested end to end. The thresholds are NOT real. They come out of Robert's
-- head in the Phase-0 session (BUSINESS_CONTEXT §13.1).
--
-- Every ruleset is is_active = false. The engine treats a track with no active
-- ruleset as 'requires_review' — which is the correct, honest default: a human
-- looks at it.
-- -----------------------------------------------------------------------------
insert into public.qualification_rulesets (track, version, is_active, notes, ruleset) values
  ('equipment', 1, false,
   'PLACEHOLDER — thresholds pending Robert. Do not activate.',
   '{"placeholder": true, "rules": [
      {"id": "equipment_amount_band", "description": "Requested amount within program range",
       "when": {"all": [{"field": "requested_amount", "op": "lte", "value": null}]},
       "then": {"signal": "amount_in_range"}}
    ], "notes": "Real thresholds required before activation."}'::jsonb),

  ('working_capital', 1, false,
   'PLACEHOLDER — thresholds pending Robert. Do not activate.',
   '{"placeholder": true, "rules": [], "notes": "Revenue-based sizing rule pending."}'::jsonb),

  ('unsecured', 1, false,
   'PLACEHOLDER — thresholds pending Robert. Do not activate.',
   '{"placeholder": true, "rules": [], "notes": "Credit band, tradeline, and DTI rules pending."}'::jsonb),

  ('ar_factoring', 1, false,
   'PLACEHOLDER — thresholds pending Robert. Do not activate.',
   '{"placeholder": true, "rules": [], "notes": "Receivables quality and concentration rules pending."}'::jsonb),

  ('sba', 1, false,
   'PLACEHOLDER — thresholds pending Robert. Do not activate.',
   '{"placeholder": true, "rules": [], "notes": "Size standard and credit rules pending."}'::jsonb),

  ('cre', 1, false,
   'PLACEHOLDER — thresholds pending Robert. Do not activate.',
   '{"placeholder": true, "rules": [], "notes": "LTV, ARV, and FICO rules pending per CRE matrix."}'::jsonb),

  ('securities', 1, false,
   'PLACEHOLDER — thresholds pending Robert. Do not activate.',
   '{"placeholder": true, "rules": [], "notes": "Portfolio advance rules pending."}'::jsonb),

  ('healthcare', 1, false,
   'PLACEHOLDER — thresholds pending Robert. Do not activate.',
   '{"placeholder": true, "rules": [], "notes": "Vertical-specific rules pending."}'::jsonb),

  ('specialty', 1, false,
   'PLACEHOLDER — thresholds pending Robert. Do not activate.',
   '{"placeholder": true, "rules": [], "notes": "Case-by-case; may remain manual review."}'::jsonb);
