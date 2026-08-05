-- =============================================================================
-- 0008 — SEED: APPLICATION QUESTION CONFIGURATION
--
-- Seeded from the verified field map in docs/BUSINESS_CONTEXT.md §6, which was
-- extracted from Robert's actual application PDFs.
--
-- IMPORTANT: unlike migration 0006, nothing here needs verification. These are
-- field names and answer options, not program terms. No rates, no limits, no
-- eligibility thresholds.
--
-- Structure (BUSINESS_CONTEXT §6): one unified intake, shared core plus
-- product-specific modules. Six separate forms would make the prequalification
-- impossible to compute, because the engine reads the same core fields
-- regardless of product.
--
-- Modules:
--   prequal            tier 1, no PII, banded values only
--   core_business      asked on every product
--   financial_snapshot asked on every product
--   owner              regulated PII, collected late
--   equipment / ar / cre / sba   track-specific
-- =============================================================================

insert into public.application_questions
  (key, module, track, label, help_text, question_type, is_required, is_pii, sort_order, validation) values

-- ---------------------------------------------------------------------------
-- TIER 1 — front-door prequal.
-- No PII by design. This is the lead-capture surface, so every additional
-- field costs conversion. Banded values per platform spec §8 STEP 6.
-- ---------------------------------------------------------------------------
('prequal_requested_amount','prequal',null,'How much financing are you looking for?','A rough figure is fine.','currency',true,false,10,'{"min":1000}'),
('prequal_time_in_business','prequal',null,'How long has the business been operating?',null,'select',true,false,20,'{}'),
('prequal_revenue_band','prequal',null,'Roughly what are your annual sales?',null,'select',true,false,30,'{}'),
('prequal_credit_band','prequal',null,'Roughly where is your personal credit?','An estimate is fine. This does not affect your credit.','select',true,false,40,'{}'),
('prequal_industry','prequal',null,'What industry are you in?',null,'text',false,false,50,'{}'),
('prequal_urgency','prequal',null,'How soon do you need funding?',null,'select',false,false,60,'{}'),

-- ---------------------------------------------------------------------------
-- CORE BUSINESS — asked on every product
-- ---------------------------------------------------------------------------
('business_legal_name','core_business',null,'Legal business name',null,'text',true,false,100,'{}'),
('business_dba','core_business',null,'DBA or trade name',null,'text',false,false,110,'{}'),
('business_entity_type','core_business',null,'Entity type',null,'select',true,false,120,'{}'),
('business_state_of_incorporation','core_business',null,'State of incorporation',null,'text',false,false,130,'{}'),
('business_start_date','core_business',null,'Business start date',null,'date',false,false,140,'{}'),
('business_industry','core_business',null,'Industry',null,'text',false,false,150,'{}'),
('business_address_line1','core_business',null,'Business street address',null,'text',true,false,160,'{}'),
('business_city','core_business',null,'City',null,'text',true,false,170,'{}'),
('business_state','core_business',null,'State',null,'text',true,false,180,'{}'),
('business_postal_code','core_business',null,'ZIP code',null,'text',true,false,190,'{}'),
('business_phone','core_business',null,'Business phone',null,'phone',true,false,200,'{}'),
('business_email','core_business',null,'Business email',null,'email',true,false,210,'{}'),
('business_website','core_business',null,'Website',null,'text',false,false,220,'{}'),
('business_premises_status','core_business',null,'Do you rent or own your premises?',null,'select',false,false,230,'{}'),
('business_premises_payment','core_business',null,'Monthly rent or mortgage payment',null,'currency',false,false,240,'{}'),

-- ---------------------------------------------------------------------------
-- FINANCIAL SNAPSHOT — asked on every product
-- ---------------------------------------------------------------------------
('fin_gross_annual_sales','financial_snapshot',null,'Gross annual sales',null,'currency',true,false,300,'{"min":0}'),
('fin_avg_monthly_card_volume','financial_snapshot',null,'Average monthly credit card volume','Leave blank if you do not take card payments.','currency',false,false,310,'{"min":0}'),
('fin_use_of_funds','financial_snapshot',null,'What will the funds be used for?',null,'textarea',true,false,320,'{}'),
('fin_has_existing_mca','financial_snapshot',null,'Do you have any existing advances or business loans?',null,'boolean',true,false,330,'{}'),
('fin_existing_debt_balance','financial_snapshot',null,'Total balance of existing business debt',null,'currency',false,false,340,'{"min":0}'),
('fin_open_judgments_liens','financial_snapshot',null,'Any open judgments or tax liens?',null,'boolean',true,false,350,'{}'),
('fin_has_bankruptcy','financial_snapshot',null,'Any bankruptcy filings?',null,'boolean',true,false,360,'{}'),
('fin_bankruptcy_discharged','financial_snapshot',null,'Has the bankruptcy been discharged?',null,'boolean',false,false,370,'{}'),

-- ---------------------------------------------------------------------------
-- OWNER / GUARANTOR — regulated PII (is_pii = true drives redaction)
--
-- Collected for each owner holding 20% or more, and never at the prequal
-- stage. Only the last four SSN digits are asked; see migration 0003 for why
-- the full value is deliberately not stored.
-- ---------------------------------------------------------------------------
('owner_full_name','owner',null,'Owner full name',null,'text',true,true,400,'{}'),
('owner_title','owner',null,'Title',null,'text',false,true,410,'{}'),
('owner_ownership_pct','owner',null,'Percentage of ownership',null,'percent',true,true,420,'{"min":0,"max":100}'),
('owner_date_of_birth','owner',null,'Date of birth',null,'date',false,true,430,'{}'),
('owner_ssn_last4','owner',null,'Last four digits of SSN','We only collect the last four at this stage.','text',false,true,440,'{"pattern":"^[0-9]{4}$"}'),
('owner_home_address_line1','owner',null,'Home street address',null,'text',false,true,450,'{}'),
('owner_home_city','owner',null,'City',null,'text',false,true,460,'{}'),
('owner_home_state','owner',null,'State',null,'text',false,true,470,'{}'),
('owner_home_postal_code','owner',null,'ZIP code',null,'text',false,true,480,'{}'),
('owner_mobile_phone','owner',null,'Mobile phone',null,'phone',true,true,490,'{}'),
('owner_email','owner',null,'Email',null,'email',true,true,500,'{}'),
('owner_credit_band','owner',null,'Estimated credit range',null,'select',false,true,510,'{}'),

-- ---------------------------------------------------------------------------
-- EQUIPMENT TRACK
-- ---------------------------------------------------------------------------
('equip_type','equipment','equipment','What equipment are you financing?',null,'text',true,false,600,'{}'),
('equip_condition','equipment','equipment','New or used?',null,'select',true,false,610,'{}'),
('equip_year','equipment','equipment','Year',null,'number',false,false,620,'{}'),
('equip_make','equipment','equipment','Make',null,'text',false,false,630,'{}'),
('equip_model','equipment','equipment','Model',null,'text',false,false,640,'{}'),
('equip_sales_price','equipment','equipment','Equipment price',null,'currency',true,false,650,'{"min":0}'),
('equip_down_payment','equipment','equipment','Down payment available',null,'currency',false,false,660,'{"min":0}'),
('equip_trade_in','equipment','equipment','Trade-in value',null,'currency',false,false,670,'{"min":0}'),
('equip_seller_type','equipment','equipment','Buying from a dealer or a private party?',null,'select',false,false,680,'{}'),
('equip_dealer_name','equipment','equipment','Dealer or seller name',null,'text',false,false,690,'{}'),
('equip_location','equipment','equipment','Where will the equipment be located?',null,'text',false,false,700,'{}'),

-- ---------------------------------------------------------------------------
-- ACCOUNTS RECEIVABLE TRACK
-- ---------------------------------------------------------------------------
('ar_total_open','ar','ar_factoring','Total open accounts receivable',null,'currency',true,false,800,'{"min":0}'),
('ar_aging_0_30','ar','ar_factoring','Receivables aged 0-30 days',null,'currency',false,false,810,'{"min":0}'),
('ar_aging_31_60','ar','ar_factoring','Receivables aged 31-60 days',null,'currency',false,false,820,'{"min":0}'),
('ar_aging_61_90','ar','ar_factoring','Receivables aged 61-90 days',null,'currency',false,false,830,'{"min":0}'),
('ar_aging_90_plus','ar','ar_factoring','Receivables aged over 90 days',null,'currency',false,false,840,'{"min":0}'),
('ar_customer_type','ar','ar_factoring','Do you invoice businesses or consumers?',null,'select',true,false,850,'{}'),
('ar_customer_count','ar','ar_factoring','How many active customers?',null,'number',false,false,860,'{"min":0}'),
('ar_avg_invoice_value','ar','ar_factoring','Average invoice value',null,'currency',false,false,870,'{"min":0}'),
('ar_invoices_per_month','ar','ar_factoring','Invoices per month',null,'number',false,false,880,'{"min":0}'),
('ar_terms_of_sale','ar','ar_factoring','Typical payment terms',null,'text',false,false,890,'{}'),
('ar_days_to_collect','ar','ar_factoring','Average days to collect',null,'number',false,false,900,'{"min":0}'),
('ar_top_debtors','ar','ar_factoring','Your largest customers by balance',null,'textarea',false,false,910,'{}'),

-- ---------------------------------------------------------------------------
-- COMMERCIAL REAL ESTATE TRACK
-- ---------------------------------------------------------------------------
('cre_purpose','cre','cre','Purchase, refinance, or cash-out?',null,'select',true,false,1000,'{}'),
('cre_strategy','cre','cre','What is the strategy for this property?',null,'select',true,false,1010,'{}'),
('cre_property_address','cre','cre','Property address',null,'text',true,false,1020,'{}'),
('cre_property_type','cre','cre','Property type',null,'select',true,false,1030,'{}'),
('cre_units','cre','cre','Number of units',null,'number',false,false,1040,'{"min":0}'),
('cre_sq_ft','cre','cre','Square footage',null,'number',false,false,1050,'{"min":0}'),
('cre_pct_occupied','cre','cre','Percentage occupied',null,'percent',false,false,1060,'{"min":0,"max":100}'),
('cre_owner_occupied','cre','cre','Will you occupy the property?',null,'boolean',false,false,1070,'{}'),
('cre_purchase_price','cre','cre','Purchase price',null,'currency',false,false,1080,'{"min":0}'),
('cre_as_is_value','cre','cre','Current as-is value',null,'currency',false,false,1090,'{"min":0}'),
('cre_after_repair_value','cre','cre','After-repair value',null,'currency',false,false,1100,'{"min":0}'),
('cre_rehab_budget','cre','cre','Rehabilitation budget',null,'currency',false,false,1110,'{"min":0}'),
('cre_existing_liens','cre','cre','Existing debt on the property',null,'currency',false,false,1120,'{"min":0}'),
('cre_noi','cre','cre','Net operating income',null,'currency',false,false,1130,'{}'),
('cre_borrower_experience','cre','cre','How many similar projects have you completed?',null,'number',false,false,1140,'{"min":0}'),
('cre_exit_strategy','cre','cre','What is your exit strategy?',null,'textarea',false,false,1150,'{}'),
('cre_timeline','cre','cre','Expected timeline',null,'text',false,false,1160,'{}'),

-- ---------------------------------------------------------------------------
-- SBA TRACK
-- ---------------------------------------------------------------------------
('sba_use_of_proceeds','sba','sba','What will the proceeds be used for?',null,'select',true,false,1200,'{}'),
('sba_owners_affiliates','sba','sba','List all owners and affiliated entities',null,'textarea',false,true,1210,'{}'),
('sba_collateral_offered','sba','sba','What collateral can be offered?',null,'textarea',false,false,1220,'{}'),
('sba_lease_info','sba','sba','Lease details, if the property is leased',null,'textarea',false,false,1230,'{}');

-- ---------------------------------------------------------------------------
-- OPTIONS
--
-- Band values match the enums in migration 0001 so answers map straight onto
-- application columns without translation.
-- ---------------------------------------------------------------------------
insert into public.question_options (question_id, value, label, sort_order)
select q.id, v.value, v.label, v.sort_order
from (values
  ('prequal_time_in_business','startup_under_1y','Startup - less than 1 year',1),
  ('prequal_time_in_business','1_2y','1-2 years',2),
  ('prequal_time_in_business','2_5y','2-5 years',3),
  ('prequal_time_in_business','5_10y','5-10 years',4),
  ('prequal_time_in_business','10y_plus','10+ years',5),

  ('prequal_revenue_band','under_100k','Under $100,000',1),
  ('prequal_revenue_band','100k_250k','$100,000 - $250,000',2),
  ('prequal_revenue_band','250k_500k','$250,000 - $500,000',3),
  ('prequal_revenue_band','500k_1m','$500,000 - $1 million',4),
  ('prequal_revenue_band','1m_5m','$1 million - $5 million',5),
  ('prequal_revenue_band','5m_plus','Over $5 million',6),
  ('prequal_revenue_band','unknown','I am not sure',7),

  ('prequal_credit_band','760_plus','760 or above',1),
  ('prequal_credit_band','720_759','720-759',2),
  ('prequal_credit_band','680_719','680-719',3),
  ('prequal_credit_band','650_679','650-679',4),
  ('prequal_credit_band','600_649','600-649',5),
  ('prequal_credit_band','below_600','Below 600',6),
  ('prequal_credit_band','unknown','I am not sure',7),

  ('prequal_urgency','immediately','As soon as possible',1),
  ('prequal_urgency','within_30_days','Within 30 days',2),
  ('prequal_urgency','within_90_days','Within 90 days',3),
  ('prequal_urgency','just_exploring','Just exploring options',4),

  ('owner_credit_band','760_plus','760 or above',1),
  ('owner_credit_band','720_759','720-759',2),
  ('owner_credit_band','680_719','680-719',3),
  ('owner_credit_band','650_679','650-679',4),
  ('owner_credit_band','600_649','600-649',5),
  ('owner_credit_band','below_600','Below 600',6),
  ('owner_credit_band','unknown','I am not sure',7),

  ('business_entity_type','llc','LLC',1),
  ('business_entity_type','s_corp','S corporation',2),
  ('business_entity_type','c_corp','C corporation',3),
  ('business_entity_type','sole_proprietorship','Sole proprietorship',4),
  ('business_entity_type','partnership','Partnership',5),
  ('business_entity_type','nonprofit','Nonprofit',6),
  ('business_entity_type','trust','Trust',7),
  ('business_entity_type','other','Other',8),

  ('business_premises_status','rent','Rent',1),
  ('business_premises_status','mortgage','Own with a mortgage',2),
  ('business_premises_status','owned_free_clear','Own free and clear',3),

  ('equip_condition','new','New',1),
  ('equip_condition','used','Used',2),

  ('equip_seller_type','dealer','Dealer',1),
  ('equip_seller_type','private_party','Private party',2),
  ('equip_seller_type','not_sure','Not identified yet',3),

  ('ar_customer_type','b2b','Businesses (B2B)',1),
  ('ar_customer_type','b2c','Consumers (B2C)',2),
  ('ar_customer_type','both','Both',3),

  ('cre_purpose','purchase','Purchase',1),
  ('cre_purpose','refinance','Refinance',2),
  ('cre_purpose','cash_out','Cash-out refinance',3),

  ('cre_strategy','fix_and_flip','Fix and flip',1),
  ('cre_strategy','fix_and_hold','Fix and hold',2),
  ('cre_strategy','buy_and_hold','Buy and hold',3),
  ('cre_strategy','ground_up','Ground-up construction',4),
  ('cre_strategy','bridge','Bridge to permanent financing',5),
  ('cre_strategy','owner_occupied','Owner-occupied use',6),

  ('cre_property_type','single_family','Single family (non-owner occupied)',1),
  ('cre_property_type','multi_2_4','2-4 units',2),
  ('cre_property_type','multi_5_plus','5+ units',3),
  ('cre_property_type','office','Office',4),
  ('cre_property_type','retail','Retail',5),
  ('cre_property_type','industrial','Industrial or warehouse',6),
  ('cre_property_type','mixed_use','Mixed use',7),
  ('cre_property_type','land','Land',8),
  ('cre_property_type','other','Other',9),

  ('sba_use_of_proceeds','purchase_cre','Purchase commercial real estate',1),
  ('sba_use_of_proceeds','business_acquisition','Business acquisition',2),
  ('sba_use_of_proceeds','partner_buyout','Partner buyout',3),
  ('sba_use_of_proceeds','equipment','Equipment',4),
  ('sba_use_of_proceeds','working_capital','Working capital',5),
  ('sba_use_of_proceeds','debt_refinance','Refinance existing debt',6)
) as v(question_key, value, label, sort_order)
join public.application_questions q on q.key = v.question_key;

-- ---------------------------------------------------------------------------
-- CONDITIONAL DISPLAY RULES
--
-- These shape the form. They do not score the applicant — that is the
-- qualification engine's job, and it stays inactive until Robert supplies real
-- thresholds. Nothing here encodes an eligibility judgement.
-- ---------------------------------------------------------------------------
insert into public.question_rules (name, description, conditions, effect, priority) values
('bankruptcy_discharge_followup',
 'Ask about discharge only when a bankruptcy was reported',
 '{"all":[{"key":"fin_has_bankruptcy","op":"eq","value":true}]}',
 '{"show_questions":["fin_bankruptcy_discharged"]}', 10),

('existing_debt_followup',
 'Ask for the debt balance only when existing financing was reported',
 '{"all":[{"key":"fin_has_existing_mca","op":"eq","value":true}]}',
 '{"show_questions":["fin_existing_debt_balance"]}', 10),

('premises_payment_followup',
 'Ask for the payment amount only when the premises are rented or mortgaged',
 '{"any":[{"key":"business_premises_status","op":"eq","value":"rent"},{"key":"business_premises_status","op":"eq","value":"mortgage"}]}',
 '{"show_questions":["business_premises_payment"]}', 10),

('equipment_dealer_followup',
 'Ask for dealer details only when buying through a dealer',
 '{"all":[{"key":"equip_seller_type","op":"eq","value":"dealer"}]}',
 '{"show_questions":["equip_dealer_name"]}', 10),

('cre_rehab_followup',
 'Ask rehabilitation and ARV questions only for value-add strategies',
 '{"any":[{"key":"cre_strategy","op":"eq","value":"fix_and_flip"},{"key":"cre_strategy","op":"eq","value":"fix_and_hold"},{"key":"cre_strategy","op":"eq","value":"ground_up"}]}',
 '{"show_questions":["cre_rehab_budget","cre_after_repair_value"]}', 10),

('cre_purchase_price_followup',
 'Ask for purchase price only on a purchase',
 '{"all":[{"key":"cre_purpose","op":"eq","value":"purchase"}]}',
 '{"show_questions":["cre_purchase_price"]}', 10);
