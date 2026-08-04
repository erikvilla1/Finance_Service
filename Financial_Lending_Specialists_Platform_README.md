# Financial Lending Specialists — Digital Lending Platform
## Product, UX, Technical Architecture & Development Specification
### Version 1.0 — Foundation/MVP Build Specification

---

# 1. PROJECT PURPOSE

Build a modern financial lending and financing platform for Financial Lending Specialists (FLS).

The platform should replace a traditional, brochure-style financial services website with a modern digital financing experience that:

1. Attracts organic/direct customers.
2. Educates customers about financing solutions.
3. Helps customers identify the type of financing they may need.
4. Uses dynamic application flows rather than one generic long form.
5. Collects lead/application information in a structured database.
6. Routes applications into an internal CRM pipeline.
7. Allows financing specialists to review and manage opportunities.
8. Is architected to integrate third-party financial, identity, credit, banking, document, communication, and e-signature APIs later.
9. Can evolve into a full digital lending/loan-origination platform.
10. Provides a strong foundation for lender/program matching and automated qualification.

IMPORTANT:
This is a financial services platform. Do not represent the system as making final credit decisions unless the business has explicitly authorized and legally structured the platform to do so. Initial qualification should be presented as "potential fit," "potential financing options," or "subject to review."

The platform should prioritize trust, clarity, accessibility, conversion, security, and a low-friction customer experience.

---

# 2. CORE BUSINESS VISION

The customer should not have to understand the financial industry before asking for help.

Traditional model:

Third-Party Lead Provider
        ↓
Purchased Lead
        ↓
CRM
        ↓
Loan Officer
        ↓
Manual Qualification

Target model:

Customer discovers FLS
        ↓
FLS Website
        ↓
Customer explains what they are trying to accomplish
        ↓
Dynamic financing questionnaire
        ↓
Relevant information collected
        ↓
Potential financing options identified
        ↓
Lead/application created
        ↓
Internal CRM
        ↓
Financing specialist review
        ↓
Documents / verification
        ↓
Potential lender/program matching
        ↓
Application and underwriting
        ↓
Funding

The platform should become a direct customer acquisition and financing intake engine.

---

# 3. PRIMARY PRODUCT PRINCIPLE

The website is NOT simply a collection of service pages.

It is a:

- Marketing website
- Financing education platform
- Lead-generation engine
- Dynamic application platform
- Customer intake system
- Internal CRM
- Future lender/program matching engine
- Future customer portal

The architecture must support this evolution.

---

# 4. TARGET CUSTOMER EXPERIENCE

The desired emotional journey:

"I need financing."
        ↓
"These people understand my situation."
        ↓
"They may be able to help even if my situation isn't traditional."
        ↓
"I understand my potential options."
        ↓
"The process looks easy."
        ↓
"I trust them with my information."
        ↓
"I want to submit my information."

The website should avoid making customers feel like they are immediately applying for a complicated loan.

Primary conversion CTA:

"See My Financing Options"

Secondary CTAs:

"Start My Application"
"Talk With a Financing Specialist"
"Explore Financing Options"

Avoid making "Contact Us" the primary conversion action.

---

# 5. BRAND POSITIONING

Core positioning:

"Financing Solutions for Real-World Business Needs"

Suggested supporting message:

"Financial Lending Specialists helps businesses, investors, and professionals find financing for opportunities that don't always fit neatly into traditional lending programs."

Supporting positioning:

"From equipment and commercial real estate to working capital and specialized financing, we take a comprehensive approach to understanding your situation and identifying potential funding solutions."

Brand promise:

"Our goal isn't simply to offer one loan. It's to help you find the financing strategy that makes sense for your situation."

Do not make unsupported guarantees.

Avoid:
- Guaranteed approval
- Guaranteed funding
- Guaranteed rates
- Guaranteed results
- Guaranteed credit repair
- Guaranteed financing timelines unless legally and operationally verified

Use qualified language:
- "Potential financing options"
- "Programs may be available"
- "Subject to qualification"
- "Program availability varies"
- "Our specialists will review your situation"

---

# 6. INFORMATION ARCHITECTURE

Primary navigation:

HOME
FINANCING OPTIONS
HOW IT WORKS
ABOUT US
RESOURCES
CONTACT

Primary CTA:
SEE MY FINANCING OPTIONS

Financing Options should be organized by customer goal, not just by technical loan product.

## Category 1 — Equipment & Asset Financing

- Construction Equipment Financing
- Equipment Leasing
- Equipment Equity / Working Capital
- Sale & Leaseback

## Category 2 — Business Cash Flow

- Working Capital Loans
- Accounts Receivable Financing

## Category 3 — Real Estate

- Real Estate Financing
- Hard Money / Fix & Flip
- Fix & Hold
- Ground-Up Construction
- Commercial Bridge Loans

## Category 4 — Specialized Financing

- Medical Working Capital
- Business Acquisition Financing
- Church Financing
- Securities-Based Lending
- Debt Restructuring
- Revenue-Based Financing

Some products listed above are not fully specified in the current source material. Do not invent product terms. Create placeholder/coming-soon structures until authoritative information is supplied.

---

# 7. HOMEPAGE EXPERIENCE

## Hero

Headline:

"Financing Solutions Built Around Your Goals"

Supporting copy:

"Whether you're acquiring equipment, expanding your business, investing in real estate, or looking for working capital, Financial Lending Specialists can help you explore financing options tailored to your situation."

Primary CTA:
"See My Financing Options"

Secondary CTA:
"Talk With a Financing Specialist"

## Goal-Based Financing Selector

Headline:

"What are you looking to accomplish?"

Cards:

- Finance Equipment
- Grow My Business
- Access Working Capital
- Buy or Refinance Real Estate
- Fund a Fix & Flip
- Acquire a Business
- Finance a Medical Practice
- I'm Not Sure — Help Me Find an Option

Clicking a card launches a dynamic application/qualification flow.

## Trust Section

"Why Work With Financial Lending Specialists?"

Cards:

1. Specialized Financing Experience
2. Multiple Financing Programs
3. Solutions for Non-Traditional Situations
4. Personalized Guidance
5. Simple Application Experience
6. Nationwide Program Availability where applicable

Only publish claims that are verified.

## Process

1. Tell Us What You Need
2. We Review Your Situation
3. Explore Potential Financing Options
4. Complete the Next Steps

## Final CTA

"Let's Explore Your Financing Options"

---

# 8. CUSTOMER APPLICATION EXPERIENCE

The application should be conversational and progressive.

Do NOT display one giant form.

Recommended flow:

STEP 1 — Financing Goal

"What are you looking to accomplish?"

STEP 2 — Financing Type

"What are you financing?"

STEP 3 — Amount

"How much financing are you looking for?"

STEP 4 — Business / Applicant Profile

- Business name
- Applicant name
- Business type
- Industry
- Years in business
- Business location
- Contact information

STEP 5 — Financial Profile

Only ask questions relevant to the selected product.

STEP 6 — Credit Profile

Use ranges where possible during early qualification.

STEP 7 — Asset / Property Information

Only when applicable.

STEP 8 — Existing Financing

Only when applicable.

STEP 9 — Documents

Only request documents when appropriate.

STEP 10 — Consent

Collect appropriate consent and disclosures.

STEP 11 — Submission

Display:

"Thank you. Your information has been submitted."

"Your request will be reviewed by a financing specialist. We may contact you if additional information is needed."

Do not promise approval.

---

# 9. DYNAMIC QUESTION ENGINE

The application engine should be configuration-driven.

Do not hard-code every question directly into frontend pages.

Database entities:

financing_products
application_questions
question_options
question_rules
application_answers

Example:

Question:
"How long has your business been operating?"

Options:
- Startup / Less than 2 years
- 2–5 years
- 5–10 years
- 10+ years

Rule:

IF product = equipment_leasing
AND business_age < 2 years
THEN show startup_program = true

Another example:

IF financing_goal = fix_and_flip
THEN ask:
- Property address
- Purchase price
- Estimated rehab cost
- Current/estimated value
- Requested loan amount
- Investor experience
- Exit strategy

This makes the application system scalable.

---

# 10. PRODUCT: CONSTRUCTION EQUIPMENT FINANCING

## Customer-facing positioning

"Finance the Equipment Your Business Needs to Move Forward"

Supporting:

"Construction equipment and specialty vehicle financing for businesses of all sizes, including startups and borrowers who may not fit traditional bank lending requirements."

## Source information

- Up to $300,000 for certain application-based programs
- Larger transactions may be available
- Transactions up to $10M or more may be possible
- 24–48 hour approval timeline stated for qualifying transactions
- Normally no financial statements or tax returns for transactions up to $300,000, subject to program requirements
- Startup companies may be eligible
- Programs may be available for less-than-perfect credit
- Works directly with equipment dealers or end users
- Preferred rate program may be available for stronger credit
- Specialty trucks and construction equipment
- Easy application process

The supplied marketing material also includes an alternate range of $10,000 to $5,000,000, terms of 1–7 years, and rates starting at 7.99%. These figures must be verified before publishing because the source materials contain differing program descriptions.

## Customer segments

- General contractors
- Subcontractors
- Excavation/grading
- Landscaping/site work
- Demolition
- Utility/infrastructure
- Specialty contractors
- Equipment buyers
- Startups
- Borrowers with challenged credit

## Potential application questions

- What equipment are you financing?
- New or used?
- Equipment cost?
- Requested financing amount?
- Equipment dealer or private-party purchase?
- Business name?
- Industry?
- Time in business?
- Annual revenue range?
- Credit range?
- Startup?
- Existing equipment financing?
- Purpose of financing?
- Equipment location?

## CTA

"See My Equipment Financing Options"

## Trust message

"Turned down somewhere else? Your financing options may not be over."

Use qualified language and avoid implying guaranteed approval.

---

# 11. PRODUCT: WORKING CAPITAL LOANS / EQUIPMENT EQUITY

## Positioning

"Turn Equipment Equity Into Business Capital"

Potential uses:

- Working capital
- Take on more jobs
- Acquire equipment
- Expand operations
- Business needs

Source information:

The program may be based on the value/equity of equipment rather than company profitability. Challenged personal credit may be considered.

Do not state "we can get you cash" as a guarantee.

## Application questions

- What is the purpose of funds?
- Amount requested?
- Equipment owned?
- Equipment type?
- Estimated current value?
- Existing liens?
- Business age?
- Revenue?
- Credit profile?
- Urgency?

CTA:
"Explore My Working Capital Options"

---

# 12. PRODUCT: ACCOUNTS RECEIVABLE FINANCING

## Positioning

"Get Access to Cash While You Wait to Get Paid"

Customer pain:

Businesses may wait 60, 90, or 120 days for customers to pay.

Potential structure:

Funds may be advanced against eligible receivables and repaid when customers pay, subject to program terms.

## Application questions

- How much funding is needed?
- Total outstanding receivables?
- Average invoice age?
- Typical payment terms?
- Customer concentration?
- B2B or B2C?
- Major customers?
- Industry?
- Current receivables aging?

CTA:
"Explore Accounts Receivable Financing"

---

# 13. PRODUCT: HARD MONEY / REAL ESTATE FIX & FLIP

## Positioning

"Fund Your Next Real Estate Investment"

Potential loan range:
$75,000 to $3M+ per source material.

Potential uses:
- Straight acquisition
- Acquisition + rehab
- Refinance
- Cash-out

Potential strategies:
- Fix & flip
- Fix & hold
- Ground-up construction

Source material states potential financing of 80–90% of purchase price and 100% of rehab costs. These figures must be verified by program and should not be represented as universally available.

## Application flow

Ask:

- Strategy
- Property address
- Purchase price
- Current value
- After-repair value
- Rehab budget
- Requested loan amount
- Borrower experience
- Number of previous projects
- Exit strategy
- Estimated timeline
- Existing liens
- Down payment/equity available

CTA:
"Evaluate My Real Estate Financing Options"

---

# 14. PRODUCT: REAL ESTATE FINANCING

## Positioning

"Commercial Real Estate Financing Built Around Your Transaction"

Source information:

- Private commercial lender / structured finance positioning
- Loans from $75K to $10M+
- Investor and owner-occupied loans
- Purchase
- Refinance
- Cash-out
- Most commercial property types considered
- Up to 90% LTV stated in source material
- Same-day approvals stated in source material
- Nationwide programs
- No exorbitant upfront deposits stated

All terms must be verified before final publication.

## Application questions

- Property type
- Property address
- Purchase/refinance/cash-out
- Purchase price
- Current value
- Requested loan
- Existing debt
- LTV
- Occupancy
- NOI
- DSCR if applicable
- Borrower experience
- Credit profile

CTA:
"Explore My Real Estate Financing Options"

---

# 15. PRODUCT: EQUIPMENT LEASING

## Positioning

"Acquire the Equipment You Need Without Tying Up All Your Cash"

Source information:

- Application-only programs up to $300,000
- No financial statements for certain programs
- No tax returns for certain programs
- Middle market financing up to $2M
- Large-ticket financing above $2M
- Application approvals stated as 24 hours for certain programs
- Middle/large ticket may take 3–5 days
- Terms up to 84 months
- Startup program
- B/C/D credit programs
- Sale & leaseback
- Government and municipal leasing

The source material says established companies generally have two or more years of operating history for certain programs, while startup programs may be available for newer businesses.

## Leasing benefits

Present as educational information, not universal financial advice:

- Preserve working capital
- Fixed payment structures may be available
- Potentially reduce upfront capital requirements
- Preserve existing credit lines
- Financing flexibility
- Potential tax/accounting considerations

Always include:
"Consult your tax and accounting professionals regarding your specific situation."

## Application questions

- Equipment type
- Equipment cost
- New/used
- Vendor
- Business age
- Revenue
- Credit range
- Amount requested
- Startup?
- Government/municipal entity?
- Sale & leaseback?

CTA:
"Explore Equipment Leasing Options"

---

# 16. PRODUCT: MEDICAL WORKING CAPITAL

## Positioning

"Flexible Working Capital for Medical Professionals"

Source information:

- $25,000–$500,000
- Competitive rates
- Credit approval stated within 48 hours from application submission
- Funding stated within 5 days of signed documents
- Programs for medical professionals with damaged credit
- Potential uses:
  - Personal needs
  - Debt consolidation
  - Practice expansion
  - Other eligible purposes

Potential professional categories include:

- Physicians
- Dentists
- Specialists
- Surgeons
- Veterinarians
- Other eligible medical professionals

Do not publish an exhaustive list unless verified.

## Application questions

- Profession
- Practice name
- Time in practice
- Practice revenue
- Amount requested
- Purpose
- Credit profile
- Existing debt
- Ownership status

CTA:
"Explore Medical Working Capital Options"

---

# 17. PRODUCT: COMMERCIAL BRIDGE LOANS

## Positioning

"When Timing Matters, Bridge the Gap"

Use case:

A borrower may have long-term financing pending but need capital before that financing closes.

Potential uses:

- Property acquisition
- Renovation
- Time-sensitive opportunities
- Short-term business needs

Source material:

- Short-term financing
- Six months to three years mentioned
- Potential closing as quickly as 10 days or less for some transactions
- Higher rates/fees may apply due to short-term nature

## Application questions

- Purpose
- Amount
- Property/business involved
- Current financing
- Expected permanent financing
- Expected closing date
- Exit strategy
- Collateral
- Current property value
- Existing debt

CTA:
"Explore Bridge Financing"

---

# 18. INTERNAL CRM

Build a first-party CRM into the platform.

Core pipeline stages:

1. New
2. Submitted
3. Initial Review
4. Contact Attempted
5. Contacted
6. Information Requested
7. Documents Requested
8. Documents Received
9. Under Review
10. Potential Match
11. Submitted to Funding Source
12. Approved
13. Declined
14. Withdrawn
15. Funded
16. Closed

CRM features:

- Lead/application list
- Search
- Filters
- Status
- Assigned specialist
- Notes
- Tasks
- Follow-up dates
- Communication history
- Documents
- Application answers
- Qualification results
- Audit history

Never expose internal CRM data to customers.

---

# 19. ADMIN DASHBOARD

Dashboard metrics:

- New applications
- Applications by product
- Applications by status
- Qualified/potential-fit applications
- Unassigned applications
- Follow-ups due
- Documents pending
- Applications by source
- Conversion rate
- Application abandonment
- Funding conversion
- Average time to first contact
- Average time to funding

Future analytics:

- Cost per acquisition
- Organic vs paid leads
- Product conversion rates
- Lead quality
- Lender performance
- Funding performance

---

# 20. DATABASE ARCHITECTURE — SUPABASE

Recommended initial database:

users
profiles
businesses
financing_products
product_categories
application_questions
question_options
question_rules
applications
application_answers
documents
document_requests
consents
qualification_results
crm_statuses
crm_tasks
crm_notes
communications
lenders
lender_programs
lender_submissions
audit_logs

Relationships:

users
  ↓
profiles
  ↓
businesses
  ↓
applications
  ↓
application_answers
  ↓
qualification_results

applications
  ↓
documents
  ↓
document_requests

applications
  ↓
crm_tasks
  ↓
crm_notes
  ↓
communications

applications
  ↓
lender_submissions
  ↓
lender_programs

Use PostgreSQL relational design.

Use UUID primary keys.

Include created_at and updated_at timestamps.

Use soft deletion where appropriate.

Do not store sensitive information unnecessarily.

---

# 21. SUPABASE SERVICES

Potentially use:

- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Row Level Security
- Edge Functions where appropriate

Use strict RLS policies.

Customers must only access their own records.

Internal employees must only access records permitted by their role.

Admin roles must be explicit.

Use server-side validation for sensitive operations.

Never rely only on frontend authorization.

---

# 22. AUTHENTICATION

Customer:

- Email/password
- Magic link optional
- MFA optional for higher-risk workflows

Internal staff:

- Secure authentication
- MFA required/recommended
- Role-based permissions

Roles:

customer
specialist
manager
admin

Potential future roles:

underwriter
operations
compliance
lender_partner

---

# 23. DOCUMENT STORAGE

Potential documents:

- Tax returns
- Financial statements
- Bank statements
- Equipment invoices
- Purchase agreements
- Property documents
- Receivables aging
- Identification
- Other supporting documents

Use private object storage.

Never expose public URLs for sensitive documents.

Use signed, time-limited URLs.

Track:

- uploader
- document type
- application
- timestamp
- status
- verification status

---

# 24. FUTURE API INTEGRATION LAYERS

Do not integrate every API in MVP.

Design abstraction layers so providers can be replaced.

Potential categories:

Identity verification
Business verification
Credit data
Bank account connectivity
Bank transaction data
Document OCR
Document classification
E-signature
Email
SMS
Phone
Fraud detection
Analytics
CRM integration
Payment processing if required

Potential providers should be evaluated later based on:
- API quality
- compliance
- pricing
- data ownership
- security
- coverage
- licensing requirements

Do not hard-code the platform to one vendor unnecessarily.

---

# 25. AI — FUTURE, NOT MVP DECISION MAKER

AI may eventually support:

- Document classification
- OCR extraction
- Financial statement summarization
- Bank transaction categorization
- Application summarization
- Lead routing
- Customer support
- FAQ assistant
- Internal specialist assistant

AI should NOT initially:

- Make final credit decisions
- Automatically deny customers
- Make legally significant eligibility decisions without appropriate review and controls
- Replace required underwriting or compliance processes

Initial qualification should be rules-based and auditable.

---

# 26. QUALIFICATION ENGINE

Version 1:

Rules-based.

Example:

IF product = construction_equipment
AND amount <= program_limit
AND business_age >= minimum
THEN potential_fit = TRUE

Output:

potential_fit
product_matches
missing_information
risk_flags
review_required

Do not call this:
"Approved"

Call it:
"Potential Match"
"Potential Financing Option"
"Requires Specialist Review"

Store the rules used to produce each result.

This creates an audit trail.

---

# 27. CUSTOMER RESULTS EXPERIENCE

After application:

"Based on the information you've provided, we identified potential financing paths that may be relevant to your situation."

Example:

Potential Match:
Construction Equipment Financing

Potential Match:
Equipment Leasing

May Require Additional Review:
Working Capital / Equipment Equity

Next step:

"A financing specialist will review your information and contact you if additional information is needed."

Do not promise approval.

---

# 28. SECURITY REQUIREMENTS

Because the platform may process sensitive financial and personal information:

- HTTPS everywhere
- Secure authentication
- MFA for internal users
- Row Level Security
- Private file storage
- Signed document URLs
- Server-side validation
- Input validation
- Rate limiting
- Bot protection
- CSRF protections where applicable
- Audit logs
- Least-privilege access
- Secrets stored in environment variables
- No API keys in frontend code
- Secure logging
- No sensitive information in analytics events
- Regular dependency updates
- Backup/recovery strategy

The production security architecture must be reviewed with qualified security/compliance professionals.

---

# 29. COMPLIANCE / LEGAL ARCHITECTURE

Before production launch, obtain appropriate legal and compliance review.

The platform may need to address requirements involving:

- Privacy
- Data protection
- Consumer disclosures
- Commercial lending rules
- Fair lending
- Credit reporting
- Marketing consent
- TCPA/SMS consent
- CAN-SPAM
- E-SIGN
- State-specific lending/broker requirements
- Licensing
- Record retention
- Data security

The exact requirements depend on the company's role:

- Lead generator
- Loan broker
- Loan originator
- Lender
- Marketplace
- Combination

The technical architecture must not assume the legal classification.

Required website pages may include:

- Privacy Policy
- Terms of Use
- Disclosures
- SMS Terms
- Consent language
- Cookie policy where applicable

Do not create legal language as final legal advice. Use placeholders and have counsel approve production language.

---

# 30. ANALYTICS

Track funnel events:

page_view
product_view
financing_goal_selected
application_started
application_step_completed
application_abandoned
application_submitted
document_requested
document_uploaded
specialist_contacted
potential_match
lender_submission
approved
funded

Do not send sensitive financial information into analytics platforms.

Analytics should focus on event metadata, not raw financial data.

---

# 31. SEO STRATEGY

Create SEO landing pages around customer intent.

Examples:

Construction Equipment Financing
Equipment Financing for Contractors
Construction Equipment Loans
Equipment Financing for Startups
Equipment Financing for Challenged Credit
Equipment Leasing
Commercial Real Estate Financing
Fix and Flip Financing
Hard Money Real Estate Loans
Commercial Bridge Loans
Accounts Receivable Financing
Medical Practice Working Capital

SEO pages should provide useful education and lead naturally to:

"See My Financing Options"

Do not keyword-stuff.

---

# 32. DESIGN SYSTEM

The website should feel:

- Professional
- Trustworthy
- Modern
- Financial
- Approachable
- Fast
- Premium
- Clear

Avoid:

- Dense blocks of text
- Outdated brochure layouts
- Too many equal-weight service boxes
- Aggressive sales language
- Fake urgency
- Excessive popups
- Generic stock-photo overload

Use:

- Large typography
- Strong whitespace
- Clear hierarchy
- Cards
- Icons
- Visual process steps
- Goal-based navigation
- Interactive forms
- Progress indicators
- Sticky CTA where appropriate
- Mobile-first design

Every service page should follow:

Hero
↓
Who It's For
↓
What It Can Help With
↓
Key Program Highlights
↓
How It Works
↓
Why Work With Us
↓
FAQs
↓
CTA

---

# 33. TECH STACK — INITIAL RECOMMENDATION

Frontend:

Next.js
React
TypeScript
Tailwind CSS

Backend:

Next.js server-side functionality and/or Supabase Edge Functions

Database:

Supabase PostgreSQL

Authentication:

Supabase Auth

File Storage:

Supabase Storage initially, subject to security/compliance review

Deployment:

Evaluate Netlify and Vercel.

Do not finalize deployment until the security and data-handling architecture is confirmed.

If the frontend is primarily Next.js, Vercel is a natural option. Netlify can also be evaluated.

Version control:

GitHub

Development:

VS Code

Design:

Figma

Analytics:

PostHog or another privacy-conscious analytics solution

Email/SMS:

Integrate later through an appropriate provider.

---

# 34. RECOMMENDED PROJECT STRUCTURE

/app
  /(marketing)
    /page.tsx
    /financing-options
    /how-it-works
    /about
    /resources
    /contact

  /(application)
    /start
    /goal
    /questions
    /review
    /success

  /(portal)
    /dashboard
    /applications
    /documents
    /messages

  /(admin)
    /dashboard
    /applications
    /customers
    /crm
    /products
    /settings

/components
  /ui
  /marketing
  /application
  /crm
  /admin

/lib
  /supabase
  /validation
  /qualification
  /products
  /analytics

/types

/config

/public

---

# 35. MVP SCOPE

Build first:

1. Modern homepage
2. Financing categories
3. Service pages
4. Goal-based financing selector
5. Dynamic application flow
6. Construction Equipment Financing flow
7. Equipment Leasing flow
8. Fix & Flip flow
9. Real Estate Financing flow
10. Working Capital flow
11. Accounts Receivable flow
12. Medical Working Capital flow
13. Commercial Bridge flow
14. Lead/application database
15. Supabase Auth
16. Internal admin dashboard
17. CRM pipeline
18. Email notification
19. Secure document upload foundation
20. Basic qualification engine
21. Analytics
22. SEO foundation
23. Legal/disclosure placeholders

---

# 36. PHASE 2

Add:

- Customer accounts
- Save and resume application
- Customer portal
- Document request system
- SMS
- E-signature
- Business verification
- Identity verification
- Bank connectivity
- Credit integrations
- Advanced CRM
- Automated follow-ups

---

# 37. PHASE 3

Add:

- Lender database
- Lender program database
- Lender matching engine
- Automated program matching
- Document extraction
- AI-assisted application summaries
- Financial analysis
- Automated routing
- Lender submission management

---

# 38. PHASE 4

Potential full platform:

Customer
  ↓
Dynamic Application
  ↓
Identity / Business Verification
  ↓
Financial Data
  ↓
Qualification Engine
  ↓
Lender Matching
  ↓
Underwriting Workflow
  ↓
Documents
  ↓
E-Signature
  ↓
Funding
  ↓
Servicing / CRM

---

# 39. CLAUDE CODE GENERATION INSTRUCTIONS

Claude should build the application incrementally.

DO NOT:
- Build the entire platform in one huge code generation step.
- Invent financial products or terms.
- Invent interest rates.
- Invent lender partnerships.
- Claim guaranteed approvals.
- Hard-code sensitive secrets.
- Put private financial data in client-side code.
- Build a fake underwriting engine that presents itself as real underwriting.
- Use fake API integrations in production.
- Store sensitive documents publicly.
- Hard-code all application questions into components.

DO:
- Use TypeScript.
- Use reusable components.
- Use database-driven product configuration.
- Use database-driven question configuration.
- Validate inputs on client and server.
- Use Supabase RLS.
- Separate marketing, application, customer portal, and admin functionality.
- Build mobile-first.
- Build accessible UI.
- Include loading, error, and empty states.
- Use clear status messages.
- Use audit logs for important internal actions.
- Make all claims configurable.
- Keep product terms in structured data.
- Make external integrations modular.

---

# 40. FIRST DEVELOPMENT ORDER

Build in this order:

PHASE 1:
Project setup
↓
Design system
↓
Database schema
↓
Supabase setup
↓
Authentication
↓
Marketing homepage
↓
Financing categories
↓
Product pages

PHASE 2:
Goal selector
↓
Dynamic application engine
↓
Application database
↓
Construction Equipment Financing flow
↓
Equipment Leasing flow

PHASE 3:
Admin dashboard
↓
CRM pipeline
↓
Lead/application review
↓
Notes
↓
Tasks
↓
Email notifications

PHASE 4:
Remaining product application flows
↓
Qualification rules
↓
Potential match results

PHASE 5:
Secure document system
↓
Customer portal
↓
API integrations

---

# 41. SUCCESS METRICS

Primary:

- Organic financing application starts
- Application completion rate
- Application submission rate
- Qualified/potential-fit rate
- Specialist contact rate
- Funding conversion rate

Secondary:

- Time to first contact
- Application abandonment by step
- Product conversion rate
- Organic traffic
- SEO traffic
- Cost per qualified lead
- Cost per funded customer
- Revenue per funded customer

The most important metric for the new platform:

"How many qualified financing opportunities does the platform generate directly?"

---

# 42. IMMEDIATE NEXT TASK

Before production launch, perform an information audit of all existing company materials:

- Flyers
- Brochures
- Word documents
- Existing website content
- Product sheets
- Financing program descriptions
- Application forms
- Disclosures
- Existing CRM fields
- Existing lead sources
- Lender/program information

For every product, create a verified product record:

Product
Category
Description
Ideal Customer
Loan/Lease Amount
Terms
Rates
Credit Requirements
Business Age
Collateral
Required Documents
Application Questions
Qualification Rules
Program Restrictions
Geographic Restrictions
Lender/Program
Customer-Facing Claims
Internal Notes

Never publish conflicting terms until the source of truth is established.

---

# 43. FINAL PRODUCT VISION

The final platform should feel like:

"Tell us what you're trying to accomplish, and we'll help you explore the financing paths that may fit your situation."

The customer should be able to arrive without knowing the correct loan terminology.

The platform should understand their goal.

The platform should ask only relevant questions.

The platform should create a structured application.

The platform should route the opportunity to the right internal specialist.

The specialist should have a complete view of the customer's situation.

The architecture should eventually support verification, financial data, document processing, lender matching, and digital underwriting workflows.

The website is the beginning.

The long-term goal is a first-party digital financing infrastructure platform.

