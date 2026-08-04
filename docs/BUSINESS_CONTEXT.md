# FLS Platform — Business Context & Game Plan

**Prepared for:** Kai & Erik (partners)
**Building for:** Robert Saucedo (Kai's cousin), Founder & Managing Director, Financial Lending Specialists Inc. (FLS)
**Date:** August 3, 2026
**Status:** Living document — update as decisions are made.

> **Note:** This is a pro-bono build to help Robert's business — not a client engagement. No selling required; the goal is to hand him infrastructure he doesn't have and can't easily build himself.

**The one-line thesis:** Robert rents his leads and runs his whole business by hand. We build him a website that owns the leads, prequalifies them automatically, and runs the deal from application to signature — turning FLS from a solo broker into a lead-generating platform.

---

## ⚠️ DOCUMENT PRECEDENCE — READ FIRST

This repository contains **two** authoritative documents. They cover different domains. Neither supersedes the other wholesale.

| Question | Authoritative source |
|---|---|
| What are the real loan amounts, rates, FICO minimums, and terms? | **This file (§5)** — subject to the UNVERIFIED caveat below |
| What fields does an application collect? | **This file (§6)** |
| What documents does a deal require? | **This file (§5.2)** |
| Who is the client, what are the business economics, why are we building this? | **This file (§1–4, §11)** |
| What is the system architecture, database schema, and file structure? | `Financial_Lending_Specialists_Platform_README.md` |
| What is the build order and what ships in MVP? | `Financial_Lending_Specialists_Platform_README.md` |
| What are the coding rules, security requirements, and copy constraints? | `Financial_Lending_Specialists_Platform_README.md` |

Where the two genuinely conflict, see **§14 — Open Conflicts**. Do not silently pick one; those are decisions the team still owes.

---

## 🚨 CRITICAL — READ BEFORE USING ANY FIGURE IN THIS DOCUMENT

**Every rate, loan range, FICO minimum, and term in §5 is INTERNAL and UNVERIFIED.**

These figures were transcribed from Robert's marketing brochures, which contain overlapping and occasionally contradictory numbers (e.g., unsecured LOC appears as both "$150K" and "$25K–$200K per guarantor"; MCA appears as both "up to $250K" and "up to $500K"). Rates are market-dependent and will drift.

**Rules:**

1. **Never render these figures as customer-facing claims** without written confirmation from Robert. This is a hard constraint carried over from the platform spec (§5, §39): no invented rates, no unverified terms, no guaranteed approvals.
2. Use them as **v1 defaults for the internal prequalification ruleset only.**
3. Confirm exact thresholds with Robert in the Phase-0 session (§13) before anything goes live.
4. When a figure is confirmed, mark it in the table and note the date and source.

**Contact numbers in source material vary:** 213-332-0573 (cell) / 323-285-3721 (office). Confirm before publishing.

---

## 1. The play, in one paragraph

Robert has a genuinely good business hiding inside bad infrastructure. He has direct access to 115+ lenders, charges clients zero upfront fees, and matches each borrower to a custom lender — a real differentiator in commercial finance. But every lead he touches is rented from a third party (US Fund Advisors) and shared with competing brokers, and every step after the lead — qualification, document collection, lender submission, client updates — is manual email, phone, and Google Sheets.

We replace both problems with one asset: a website that captures its own leads, gives each applicant an instant "here's what you likely qualify for" result (a CarFax-style prequalification), and carries the deal through a client portal with e-signature. **Own the lead, automate the middle, keep the commission.**

---

## 2. Where Robert is today (the honest current-state)

### The lead engine is rented and shared

Robert pays US Fund Advisors ~$4,000 ($3k spent, $1k on retainer) for leads that are also sold to other brokers. Those leads arrive as a data record (name, email, company, revenue band, funding amount, credit-score band, industry, financing purpose, urgency, bank statements) — but they're a race against every other broker who bought the same list.

### The funnel numbers

| Metric | Value |
|---|---|
| Total leads to date | 208 |
| Spoken to / doc requested | 44 |
| Submitted to lenders | 14 |
| Denials | 11 |
| Client declined options | 3 |
| In active sequence | 18 |
| No-response nurture (monthly) | 142 |
| New leads (that day) | 4 |
| Cost paid for 14 submittals | ~$3,000 (≈$214 per submittal) |

The number Robert himself flags as the one that matters is **submittals** — deals actually packaged and sent to a funder. Everything upstream is noise until it becomes a submittal.

His own read on the business: *"A denial is not a forever 'no'; it's a 'no' right now."* Which means the 142-lead no-response pool and the 11 denials are not dead — they're a nurture asset the current setup can't work systematically.

### The economics are lean

Monthly software/overhead ran ~$1,146/mo Jan–July, dropping to ~$531/mo Aug–Dec once he gives up the office to work from home (baby due September). Current stack: Crexi ($250 of that), ChatGPT, Microsoft, Adobe, Bizzee, Google, Airtable, PandaDoc, Dropbox, Instantly.ai.

Revenue is entirely referral-driven right now. A funded line of credit pays him ~$1k–4k/month in commission depending on draw.

> **Handling note:** this subsection and §11 contain Robert's private business financials. See §15.

### The website is a brochure, not a tool

The current site (financiallendingspecialists.com) is a static HTML template listing 17 financing products with no lead capture beyond a "Contact Us" form — no accounts, no application, no prequalification, no portal.

An outside consultant (Kailos Marketing Lab) scored the business **49/100** overall in March 2026, with the lowest marks in exactly the areas we'd fix:

| Assessment area | Score | Status |
|---|---|---|
| Digital Presence & Discoverability | 35% | Immediate Priority |
| Content & Distribution | 38% | Immediate Priority |
| Lead Generation & Demand | 42% | Immediate Priority |
| Sales & Marketing Alignment | 45% | Immediate Priority |
| Positioning & ICP | 55% | Immediate Priority |
| MarTech & Operations | 62% | Needs Attention |
| AI & Automation Readiness | 68% | Needs Attention |

Crucially, Kailos independently recommended the same three things we're building: (1) a loan pre-qualification calculator on the website as the lead-capture tool, (2) lead-gen/pipeline infrastructure with a real CRM, and (3) a client portal with a document checklist, progress bar, and auto-reminders.

That's outside validation that the instinct is right — Robert already paid a consultant who reached the same conclusions.

---

## 3. The problem we're actually solving

There are two, and they compound:

**1. Rented, shared leads cap the ceiling.** No matter how good Robert is, he's competing on speed against every other broker who bought the same record. He can't out-convert a shared lead; he can only out-hustle it. That's not scalable and it's not defensible.

**2. Manual operations cap the throughput.** Even with more leads, a solo operator drowns. Kailos mapped his lead-to-close flow and found a gap at every stage: no CRM intake, no qualification scorecard, no client portal, no deal tracker, no automated client comms. The single biggest bottleneck to closing is **documentation intake** — chasing clients by phone/email for bank statements, credit reports, and debt schedules, with no visibility into what's outstanding.

The platform attacks both at once: it manufactures owned leads (fixing #1) and automates the middle of the funnel (fixing #2). One build, two moats.

---

## 4. The product vision — what the platform does

The borrower experience, end to end:

1. **Land** — A prospect arrives from an ad or organic search (ads layer on after the site exists; see §10).
2. **Create an account & apply** — They register and complete a smart application. The form adapts to what they need (working capital vs. equipment vs. CRE vs. SBA vs. AR factoring) so they only see relevant fields.
3. **Get an instant prequalification** — On submit, the platform returns a CarFax-style result: "Based on what you told us, you likely qualify for these product types, in roughly this amount range, at roughly these terms." This is the hook — it turns an anonymous visitor into a captured, self-qualified lead, and it's exactly what Robert's lender partners (SLIM Capital, RCN, CLS CRE) already do with their own calculators.
4. **Robert reviews & packages** — The lead lands in Robert's CRM already structured and pre-scored. He reviews, requests missing docs through the portal (not email tag), and builds the submission package.
5. **Client e-signs** — Robert sends the funder application; the client signs off via DocuSign (or equivalent) inside the portal.
6. **Track to funding** — The client watches their application status in the portal (submitted → in review → approved/countered → funded), with automated status updates.

**The genius of the prequal step:** it does double duty. For the borrower it's instant gratification and trust ("Financing you count on" — his tagline — made literal). For Robert it's a self-qualifying filter that converts the anonymous ad click into a structured, owned lead record he never has to buy.

> **Naming constraint (from the platform spec §26):** the result is a *"Potential Match"* / *"Potential Financing Option"* / *"Requires Specialist Review"* — never "Approved." See §12.

---

## 5. The loan-product catalog

> ## ⚠️ INTERNAL / UNVERIFIED — DO NOT PUBLISH
>
> **Every figure in §5.1 is a v1 default pending confirmation from Robert.** Source brochures contain overlapping and contradictory numbers. Rates are market-dependent and will drift. These encode the prequalification ruleset — they are **not** customer-facing claims. See the critical notice above.

Robert's site advertises 17 products; his brochures (in `Brochures/`) give the terms, loan ranges, and FICO minimums. **Encode these numbers, don't invent new ones.** Products are grouped into underwriting "tracks" because prequal logic and document requirements cluster by track.

### 5.1 Product catalog with advertised terms `[UNVERIFIED]`

| Track / Product | Loan range | Rate (as advertised) | Min FICO | Key terms | Live app on file |
|---|---|---|---|---|---|
| Equipment Finance (leasing, construction equip.) | $10K – $500K (app-only ≤ $200K) | A+ 6.50–6.75% · A 7.25–7.75% · B 8.25–8.75% · C 11–12% · Corp 7% | Tiered by rate grade | New vs. used; annual/semi/quarterly/monthly terms; 24–48h approval | ✅ Equipment Credit App |
| MCA / Easy Pay Cash Advance / Revenue-Based | Up to $250K (some sheets say $500K) | Factor-based (not APR) | Poor credit OK | 80–120% of avg monthly card/sales volume; 6 mo statements; no tax returns/financials; 48h approval, funds in 5–7 days; up to 2-yr repay | ✅ Working Capital App |
| Unsecured Term Loans | $25K – $350K | As low as 5.99%; 8–12% avg fixed | 680+ | 3/5/7/10-yr terms; ≥4 tradelines, ≥1 installment; ≤50% utilization; DTI <40%; approval as fast as 24h | ✅ Working Capital App |
| Unsecured Credit Lines | $25K – $200K per guarantor | 0% intro up to 21 months | 680+ | No derogatory marks in 6 mo; ≥1 bank credit line w/ $2K limit; funds in ~10 business days | ✅ Working Capital App |
| Start-up / Unsecured Funding | Up to $500K | Term loans 9–15%; biz credit card 0% for 6–12 mo | 680+ (term) / 700+ (card) | Little/no time-in-business required; 2 yrs personal tax returns showing $50K+ income; stated income | — |
| Unsecured Business LOC (established) | Up to $150K | Lender-dependent | Est. 3+ yrs helps | FLS sets up corp + builds business credit profile; national/regional lender network | ✅ Working Capital App |
| AR / Factoring | Advance up to 80% of receivables | Interest on advance | Credit-agnostic | Remaining 20% on customer payment less interest; set up in 7–10 business days; cash in 24h | ✅ AR Financing App |
| SBA Loan Program | $150K – $12M | Low; no balloon | Strong credit + cash flow | Up to 25-yr payout; FLS is a designated "Preferred" partner (~30-day target); 3-yr avg sales ≤ $6M for retail/service | ✅ SBA Credit App |
| CRE — Real Estate Financing | $250K – $10M+ | 4.20% – 6.75% | — | As little as 10% down; up to 20-yr payout; purchase / refi / cash-out; 24–48h approval | ✅ CRE Submission Pkg |
| CRE — Fix & Flip | $75K – $2M (min value $100K ARV) | Hard-money | 650 | 12-mo term; up to 95% of purchase + 100% of rehab, not to exceed 75% ARV; non-owner 1–4 family/condo/townhome | ✅ CRE Submission Pkg |
| CRE — Long-Term Rental | $75K – $1.5M (min value $115K) | — | 680 | 30-yr; purchase lesser of 80% As-Is or 80% LTC; refi 80% As-Is; cash-out 75%; 0–5 yr prepay options | ✅ CRE Submission Pkg |
| CRE — Short-Term Multi (5+ units) | $250K – $2M (min value $375K) | Bridge | 650 | 12-mo; stabilized bridge purchase up to 75% As-Is, refi 70%, cash-out 65% | ✅ CRE Submission Pkg |
| CRE — Long-Term Multi (5–9 units) | $150K – $1.5M ($100K/unit min) | — | 700 | 30-yr; purchase lesser of 70% As-Is or 70% LTC; refi 70%; cash-out 65%; 0 & 5-yr prepay | ✅ CRE Submission Pkg |
| CRE — Commercial Bridge | $75K – $2M | Hard-money | 650 | 12-mo; purchase lesser of 80% price or 80% LTC; refi 70% As-Is; cash-out 60% | ✅ CRE Submission Pkg |
| Securities-Based Lending | LOC 70–90% of portfolio value | — | — | Nation's only non-transfer-of-title program; borrow as needed, any purpose | — |
| Healthcare Vertical (specialized, Base44) | LOC/Factoring $100K–$30M; Term $5K–$1M | LOC Prime+6%; factor fee 1.25%; factor rate 1.15x | — | Up to 85% advance; 2–3 wks to close (term: 3 days); home health, substance abuse, specialty pharmacy, senior care | — |
| Specialty (church, biz acquisition, debt restructuring, medical working capital) | Deal-specific | Varies | Varies | Church up to 60-mo; debt restructuring cuts payments 30%+; medical working capital $15K–$250K | Case-by-case |

### 5.2 Universal document set

Build the portal checklist around this. Robert's own words for what he needs on nearly every deal: everything on the application, plus:

- Copy of the borrower's **Experian report/score**
- Last **6 months of bank statements**
- A **business debt schedule** (his form is in the packages)

**Track-specific additions:**

| Track | Additional documents |
|---|---|
| Equipment | Equipment invoice |
| CRE | Rent roll, operating statements, purchase contract |
| AR | A/R + A/P aging, top-debtor list, sample invoices |
| SBA | Tax returns, ownership/affiliate detail, collateral schedule |

---

## 6. The application data model (the spine of the whole thing)

Every application form Robert uses shares a common backbone, then branches. **Build it as one unified intake with a shared core plus product-specific modules — not six separate forms.** Consolidated field map extracted from his actual PDFs:

### Core business (every product)

Legal name, DBA, entity type, state of incorporation, EIN/Tax ID, business start date, industry, physical + billing address, business phone/email, web address, ownership status (rent/mortgage + monthly payment).

### Financial snapshot (every product)

Gross annual sales, average monthly credit-card volume, existing MCA/loan accounts + balances, open judgments/tax liens, bankruptcies (open/discharged), requested amount, use of funds.

### Owner/guarantor (every product, repeatable for each owner ≥20%)

Name, title, % ownership, SSN, DOB, home address, home/mobile phone, email, credit score.

> ⚠️ **This is regulated PII.** See §12. Encrypt at rest, segregate the table, audit-log every access.

### Product-specific modules

| Module | Fields |
|---|---|
| **Equipment** | Equipment year/make/model/condition, sales price, taxes, trade-in, down payment, dealer info, total finance request |
| **AR / Factoring** | Total open A/R + aging (0–30/31–60/61–90/90+), top 6 debtors, avg monthly sales, avg invoice value, # invoices/month, # customers, terms of sale, charge-off %, days to collect, A/P aging |
| **CRE** | Property address, type, sq ft, units, % occupied, owner-occupied?, loan amount, desired rate, as-is/stabilized value, LTV, DSCR, cap rate, NOI, rent roll (per-tenant), purchase vs. refi, 1031 flag |
| **SBA** | Use of proceeds (purchase CRE, acquisition, partner buyout, equipment, working capital, debt refi), all owners/affiliates, collateral offered, lease info |

### Lead metadata

Mirrors what US Fund Advisors already sends, so Robert's mental model transfers: revenue band, funding amount, credit-score band, financing purpose, financing urgency, created-at, source/channel. Matching this shape means the new owned-lead record looks familiar to Robert on day one.

**Why one adaptive form matters:** the prequal engine reads the same core fields regardless of product. Six separate forms would make the CarFax result impossible to compute.

---

## 7. The prequalification engine (the "CarFax for loans")

This is the crown jewel, and it needs to be honest: it's a **soft, indicative prequalification, never a firm approval** (that's the lenders' job, and saying otherwise creates legal exposure — see §12). Mechanically it's a rules engine, not magic.

**Inputs:** the core fields — time in business, monthly/annual revenue, credit-score band, industry, existing debt load, requested amount, product interest.

**Rules:** each lender track has known thresholds, most already documented in §5.1 (e.g., Fix & Flip needs 650 FICO and caps at 75% ARV; Unsecured Term Loans need 680+ and ≤40% DTI; SBA wants strong credit + 3-yr avg sales ≤$6M; MCA keys off 80–120% of monthly volume with poor credit OK). Encode the §5.1 ranges as the v1 ruleset, then refine with Robert.

**Output:** a ranked shortlist of product types the applicant is likely eligible for, an indicative amount range, and rough term/rate ranges — displayed as a clean result card, with clear *"indicative only, subject to lender approval"* language.

**Where the real leverage is:** Robert's lenders have calculators (SLIM Capital, RCN Capital, CLS CRE at clscre.ai), and he's noted you can pair this with a financial model and fraud-verification software to underwrite loans and produce a tight file for client and lender. Phase 1 ships a simple rules-based prequal using thresholds Robert supplies. Later phases layer in bank-statement parsing, credit-pull integration, and lender-specific calculators.

**Don't over-engineer v1** — a credible shortlist beats a perfect number, and it's the capture, not the precision, that makes money.

> **Consistent with platform spec §26:** rules-based, auditable, stores the rules used to produce each result.

---

## 8. Client portal & document workflow

This is where deals currently go to die, so it's high-ROI. The portal gives each client a logged-in view of:

**Document checklist** built on the universal doc set (§5.2) with upload, a progress bar, and automated reminders — replacing Dropbox-plus-phone-tag. Kailos called this out as the single biggest bottleneck to closing.

**Application status tracker** (submitted → under review → approved/countered → funded) so clients stop calling Robert for updates and Robert stops manually chasing.

**E-signature** via DocuSign or an equivalent (Dropbox Sign, or PandaDoc which he already pays for) so the funder application gets signed inside the portal, not over email.

**A secure home for the nurture pool.** The 142 no-response leads and the 11 "no right now" denials become a re-engagement asset — automated sequences that bring them back when their situation changes, matching Robert's "a denial is not a forever no" philosophy.

---

## 9. Recommended technical architecture

> **See §14.3** — this section is advisory. The platform spec (§33) makes firmer commitments. Reconcile before building.

- **Frontend:** a modern framework (Next.js/React) for the marketing site + application flow + portal, so SEO-friendly pages and app logic live in one stack.
- **Auth & accounts:** a managed auth provider (Auth0, Clerk, or Supabase Auth) — **do not hand-roll auth** for a system holding SSNs and bank data.
- **Database:** hosted Postgres (Supabase/Neon/RDS) with the unified data model from §6. Encrypt PII at rest; segregate the sensitive owner/financial tables.
- **Prequal engine:** server-side rules/config (a JSON ruleset Robert can tune) — no ML needed for v1.
- **Documents & e-sign:** DocuSign or Dropbox Sign API; store uploads in encrypted object storage (S3/Supabase Storage), not raw Dropbox.
- **CRM:** the diagnostic named **Deal360** as Robert's ideal system and flagged Instantly.ai for outbound. Decide early — see §14.1.
- **Compliance posture from day one:** HTTPS everywhere, least-privilege access, audit logging on PII access, a real privacy policy, and FCRA-compliant consent language (his application PDFs already contain the FCRA authorization text — **reuse it, don't improvise**).

**A blunt note on cost:** Robert already balked at how much his current tools cost (*"You have to pay for all these services?? That's a lot of money"*). Since we're building this for free, keep his recurring costs minimal — lean on free/low tiers where possible. The whole point is that this build replaces the $4k lead spend, so any unavoidable cost nets out positive.

---

## 10. Phased roadmap

> **See §14.4** — this phasing differs from the platform spec's build order (§40). Reconcile before scheduling.

Mapped to the Kailos "Growth Matrix" stages so it dovetails with the assessment Robert already bought into.

**Phase 0 — Foundation & alignment (Weeks 1–2)**
Lock scope with Robert. Nail down: exact prequal thresholds per product (his knowledge), which lenders map to which tracks, brand/positioning for the relaunch (his ICP, his "zero upfront fees / 115+ lenders / custom matching" differentiators), and the CRM decision. Verify Google Business Profile and connect Search Console now — Kailos flagged GBP as unverified and this is free organic groundwork.
*Deliverable: signed-off spec + wireframes.*

**Phase 1 — Owned-lead website + prequal (Weeks 3–8) — the core build**
New branded site with ICP messaging, the unified adaptive application, account creation, and the rules-based prequalification result. This is the minimum that flips FLS from renting leads to owning them.
*Deliverable: a live site where a stranger can apply and get prequalified, and Robert gets a structured lead.*

**Phase 2 — Client portal + document workflow + e-sign (Weeks 6–12, overlapping)**
Document checklist with progress bar and auto-reminders, application status tracker, DocuSign integration, and the nurture/re-engagement sequences for the no-response and denial pools.
*Deliverable: a deal can run start-to-finish inside the platform.*

**Phase 3 — Demand generation (Post-launch)**
Only now do paid ads make sense — you never run ads to a site that can't capture and convert. Layer Google Search (high-intent commercial-finance keywords), local SEO, and targeted outbound via Instantly.ai per ICP. This is also where deeper prequal (bank-statement parsing, credit pulls, lender calculators) and A/B testing live.
*Deliverable: the site becomes a lead engine, and the US Fund Advisors spend can wind down.*

---

## 11. The economics (why this is worth building)

> **Handling note:** contains Robert's private financials. See §15.

Even though we're not selling this, the economics matter — they're how we prioritize what to build first and how Robert will judge whether it's working.

Today Robert pays roughly **$214 per submittal** (~$3k / 14) for leads he doesn't own and shares with rivals. The platform's marginal cost per owned lead, once ads are running, trends toward his own CPC and converts better because the prequal self-filters and the lead is exclusive. Every owned lead also compounds: it lives in his database forever as a nurture asset, where today a rented lead is a one-shot race.

Beyond cost-per-lead, the platform unlocks throughput he literally can't reach by hand — the portal removes the documentation bottleneck that's currently his rate-limiter on closing.

And it de-risks his single biggest dependency: right now if US Fund Advisors raises prices or shared-lead quality drops, his pipeline craters. Owning the funnel removes that gun from his head.

**The payoff:** the month his owned leads replace the $4k rented-lead spend, the whole thing is pure upside — plus a defensible asset he owns instead of rents.

---

## 12. Risks & things we must not get wrong

**Regulatory / compliance — this is lending, it's regulated.** The platform collects SSNs, DOBs, bank statements, and credit data. That triggers real obligations: FCRA (his applications already carry the correct authorization language — reuse it, don't improvise), state lending/broker licensing (confirm FLS's licensing covers online origination in the states it markets to), GLBA-style data-safeguard expectations, and clear *"indicative only, not a commitment to lend"* disclaimers on every prequal result. Robert should run the final flow past his compliance/legal contact before launch.
*We're not lawyers — this is a flag, not legal advice.*

**Data security is existential, not optional.** A breach of a financial applicant database is a business-ending event. Managed auth, encryption at rest and in transit, least-privilege access, and audit logging are non-negotiable from v1. **No SSNs in Google Sheets, ever again.**

**Scope creep vs. the CRM.** The temptation is to build a full CRM. See §14.1 — this is an open decision, not a settled one.

**Prequal accuracy expectations.** Set them low and honest. A v1 shortlist that's "directionally right" is fine and converts; a v1 that promises exact approvals and is wrong destroys trust and creates liability. Precision is a Phase 3 upgrade, not a launch requirement.

**Robert's cost sensitivity & bandwidth.** He's price-conscious and about to have a baby in September while running the business solo. Keep recurring costs lean and framed against the lead-spend offset, and keep his required involvement tight and scheduled.

---

## 13. Immediate next steps

1. **Get the prequal thresholds out of Robert's head.** One working session where he tells us, per product track, the rough eligibility rules his lenders use. This is the raw material for the engine and only he has it. *This also resolves the UNVERIFIED status of §5.1.*
2. **Confirm the CRM decision and licensing/compliance coverage** — two questions that shape the architecture and must not be discovered late.
3. **Lock brand + ICP positioning** for the relaunch (his differentiators are strong and undocumented — Kailos said so).
4. **Verify Google Business Profile + connect Search Console** — free, immediate, foundational for the organic play.
5. **Erik:** finalize the stack (auth, DB, hosting) and scaffold the unified data model from §6 in the existing repo.
6. **Kai:** draft the site's positioning/messaging and the prequal result-page copy — the trust-building layer that makes strangers hand over their financials.

---

## 14. Open conflicts between this document and the platform spec

These are **unresolved decisions**, not errors. Do not silently pick a side while building — raise them.

### 14.1 CRM scope — ⏸️ DEFERRED BY DECISION

| Source | Position |
|---|---|
| Platform spec §18, §35 (MVP item 17), §40 (Phase 3) | Build a first-party CRM into the platform. Full pipeline with 16 stages, notes, tasks, communications, audit history. |
| This document §12, §10 | "Resist [building a full CRM] in Phase 1. Ship lead-capture + prequal first; let the portal grow into the CRM only if an off-the-shelf tool doesn't fit." Names Deal360 as the diagnostic's recommendation. |

**Status:** Explicitly deferred by Erik on Aug 3, 2026. To be settled in the Phase-0 session with Robert (§13.2). Until then, **do not scaffold CRM tables beyond what the application pipeline needs.**

The deciding question is what Robert will actually use day-to-day — a license he ignores is worse than a lean tracker he opens.

### 14.2 Product taxonomy mismatch — 🔴 OPEN

The two documents organize the same products differently, and neither list is a superset of the other.

| | Platform spec §6 | This document §5.1 |
|---|---|---|
| **Organizing principle** | Customer goal (4 categories) | Underwriting track (prequal + docs cluster) |
| **Categories** | Equipment & Asset · Business Cash Flow · Real Estate · Specialized | Equipment · Working Capital/MCA · Unsecured · AR · SBA · CRE (5 sub-products) · Securities · Healthcare · Specialty |

**Products in this doc that the spec's taxonomy does not cover at all:**

- **MCA / Revenue-Based Financing** — has a live Working Capital app and a brochure
- **SBA Loan Program** — has a live SBA Credit App, a brochure, and a one-sheet; FLS is a designated "Preferred" partner
- **Start-up / Unsecured Term Loans & Credit Lines** — three brochures in `Brochures/`
- **Healthcare vertical** — has a flyer

**Products in the spec not detailed here:** Sale & Leaseback, Ground-Up Construction, Church Financing, Business Acquisition, Debt Restructuring, Medical Working Capital (partially covered under Specialty).

**Why this matters:** both groupings are legitimately useful and they aren't in tension — customer-goal is the *navigation* layer, underwriting-track is the *rules and documents* layer. The likely resolution is to model both: a product record carries a `category` (goal-based, for the site) and a `track` (underwriting, for prequal + doc checklist). But that's a schema decision someone has to actually make.

**Blocker for:** the `financing_products` / `product_categories` schema, the goal selector cards, and the prequal ruleset.

### 14.3 Tech stack ambiguity — 🟡 MINOR

| Source | Position |
|---|---|
| Platform spec §33 | Commits: Next.js, Supabase (Postgres/Auth/Storage/RLS). Deployment: evaluate Netlify vs. Vercel. |
| This document §9 | Leaves open: "Auth0, Clerk, or Supabase Auth"; "Supabase/Neon/RDS". |

The spec is more decided and Supabase + Netlify MCPs are already connected to this workspace. Recommend the spec wins unless there's a reason to revisit. E-signature is also Phase 2 in the spec vs. named as DocuSign here — same intent, different specificity.

### 14.4 Phasing and build order — 🟡 MINOR

The spec has a 5-phase build order with no dates; this document has Phase 0–3 with week ranges and puts demand generation last. They're compatible in spirit (both build marketing → application → portal), but the numbering collides — "Phase 2" means different things in each file. **When referring to a phase, name the document.**

### 14.5 Repo name — ✅ CORRECTED

This document originally referenced `erikvilla1/Finance_Lending`. The actual repository is **`erikvilla1/Finance_Service`**. Corrected here.

---

## 15. Sensitive data handling

**This file contains Robert's private business information** — accounts receivable, business debt, commission range, monthly overhead, lead-vendor spend, personal circumstances, and direct phone numbers.

As of Aug 3, 2026 the GitHub repository appears to be **private** (anonymous clone was refused). That is the assumption this file's presence relies on.

**Before making the repository public, or adding collaborators outside Kai/Erik/Robert:** split §2 (economics subsection), §11, and the contact numbers into a separate gitignored file. Do not assume this will be remembered later.

Nothing in this file is customer PII — but the application data model in §6 describes fields (SSN, DOB, bank data) that will be. Those live in the database under the controls in §12, never in the repo.

---

## Sources

FLS Growth Diagnostic Report (Kailos Marketing Lab, March 2026); FLS loan application packages (Working Capital, Equipment, AR, CRE, SBA, Business Debt Schedule); FLS product brochures (`Brochures/` — General Services, CRE Loan Matrix, Equipment Finance Pricing, MCA, SBA, AR, Real Estate, Bridge Loan, Start-up/Unsecured Term & Credit Line programs, Healthcare); United Capital Source funding menu; financiallendingspecialists.com; Robert↔Erik email thread (July–Aug 2026); Lead Details record (US Fund Advisors).

---

*Living project documentation. Last updated: August 3, 2026 — added precedence header, unverified-figures notice, and §14–15 (open conflicts, sensitive data handling).*
