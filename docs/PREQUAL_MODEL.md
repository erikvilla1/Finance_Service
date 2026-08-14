# How the prequal calculator works

**Status:** Living document. Audited 2026-08-12 against engine `2.0.0-rules` and ruleset v2.
**Read this before describing the prequal to Robert, a lender, or an applicant.**

---

## The one-sentence version

The prequal does not calculate what someone can borrow. It does two unrelated
things: a set of pass/fail gates decides **which products to show**, and a
multiple of monthly revenue decides **how big a range to print next to each
one**.

## The two-sentence version

Which products appear is decided almost entirely by **credit score**, with time
in business as a second gate on four of the six. How large each range is, is
decided **entirely by average monthly revenue** — nothing else moves the number,
including how much the applicant said they wanted.

---

## The mechanism, in order

1. The applicant answers 8 questions.
2. Ten rules run. Six are product gates, two are risk flags, two check that the
   two load-bearing answers are present.
3. For every product whose gate passed:
   `range = average monthly revenue × [min multiple, max multiple]`
   capped at that product's catalog maximum, rounded to the nearest $100.
4. Each product is labelled `potential_match`, `requires_review`, or
   `not_eligible`.
5. An overall outcome is recorded, and `review_required` is set to `true`.
   **Always true. Not conditional.** A specialist sees every submission.

There is no scoring, no weighting, and no arithmetic beyond one multiplication
per product. It is a lookup table with a multiplier attached.

---

## The gates

| Product | Min credit score | Min time in business | Other | Revenue multiple |
|---|---|---|---|---|
| Revenue-Based Financing | 500 | — | — | 0.5× – 1.5× |
| Equipment Leasing | 550 | — | — | 0.3× – 1.2× |
| Unsecured Term Loans | 600 | 1 year | — | 1.0× – 3.0× |
| Unsecured Credit Lines | 620 | 1 year | — | 0.5× – 2.0× |
| Commercial Real Estate | 620 | 1 year | must pledge real property | 3.0× – 8.0× |
| SBA Loan Program | 650 | 2 years | — | 3.0× – 8.0× |

Six products out of a catalog of twenty-five. The other nineteen are never
matched by the prequal at all — they exist in the catalog and on the marketing
pages, but no rule references them, so they can only reach an applicant through
a specialist.

---

## Worked example

A business with **$50,000 average monthly revenue**, a **640 credit score**,
**3 years** operating, **no real estate** to pledge:

| Product | Gate | Result |
|---|---|---|
| Revenue-Based Financing | 640 ≥ 500 ✓ | **$25,000 – $75,000** |
| Equipment Leasing | 640 ≥ 550 ✓ | **$15,000 – $60,000** |
| Unsecured Term Loans | 640 ≥ 600, 3y ≥ 1y ✓ | **$50,000 – $150,000** |
| Unsecured Credit Lines | 640 ≥ 620, 3y ≥ 1y ✓ | **$25,000 – $100,000** |
| Commercial Real Estate | no property pledged ✗ | not eligible |
| SBA Loan Program | 640 < 650 ✗ | not eligible |

Headline figure: **$150,000** — the largest maximum among matched products.

Change the credit score to 650 and SBA appears at $150,000 – $400,000, which
moves the headline to $400,000. **A ten-point credit difference more than
doubles the number on the page.** That cliff is worth understanding before
anyone describes this as an estimate of borrowing capacity.

---

## Where the numbers came from

**They are not Robert's.** Every multiple and every threshold was
reverse-engineered from **a single worked example** on United Capital Source's
public referral-partner tool, captured 2026-08-03: a business with $138,000
monthly revenue and a 630 credit score.

The multiples were recovered by dividing the ranges that tool displayed by
$138,000. That arithmetic is exact and reproducible — see the header of
`0017_qualification_ruleset_v2.sql`.

Two values were never observed and are assumptions:

- The **real-estate multiple (3.0× – 8.0×)** was never displayed; that sample
  failed the product for want of an asset. It was assumed equal to SBA because
  both are collateral-backed.
- The **SBA two-year minimum** is not on the competitor's form. It comes from
  `BUSINESS_CONTEXT` §5.1, which is itself marked UNVERIFIED.

**What this means in practice:** the ranges are a faithful reproduction of one
competitor's undisclosed formula, fitted to one data point. They are not FLS
terms, they are not lender terms, and no lender has agreed to any of them. The
result page labels them illustrative and `review_required` is hard-coded true,
which is what keeps this honest.

---

## What each question actually does

| Question | Effect on the result |
|---|---|
| Owner credit score | Gates all six products. **The single most powerful input.** |
| Average monthly revenue | Sets the size of every range. **Nothing else does.** |
| How long in business | Gates four of six |
| Assets to secure financing | Gates commercial real estate only |
| Deposit trend | If declining: risk flag, forces everything to review |
| Prior defaults | If active/recent: risk flag, forces everything to review |
| **How much financing you want** | **Nothing.** See finding 2 below. |
| **Roughly what are your annual sales** | **Nothing.** See finding 3 below. |
| Industry, urgency, legal name, existing balance, monthly debt payments, asset value, asset debt | Nothing. Stored for the specialist to read. |

If you explain one thing to Robert, explain this table. Two answers do all the
work; the applicant cannot tell that from looking at the form.

---

## Audit findings

Ordered by how likely each is to produce a wrong answer in front of an applicant.

### 1. A migration that silently never ran — FIXED

`0022_require_prequal_scored_fields.sql` was written to make asset type, prior
defaults, and deposit trend required. It shared its `0022` prefix with
`0022_customer_edit_window.sql`. Only the latter was applied. The runner had
seen `0022` and moved on.

Confirmed against the live database: all three were still `is_required = false`,
while `prequal-layout.ts` carried a comment asserting the migration had made
them required and that its own safety net "changes nothing on a current
database." That safety net was the only reason those questions were on screen
at all.

Renumbered to `0024`. **Not yet applied** — see "What to do next".

### 2. The requested amount does not affect anything

`requested_amount` is only ever compared against a product's range when that
product has `terms_verified = true`. Every one of the 25 products in the catalog
has `terms_verified = false`. The check therefore never runs.

An applicant asking for $25,000 with $138,000 monthly revenue is shown
"$69,000 – $207,000" for revenue-based financing. The engine never notices the
mismatch. This is defensible — the multiples model capacity, not demand — but it
is not what the form implies when it asks the question first.

### 3. Annual sales is collected and ignored

`prequal_revenue_band` is a required question, is stored, and is resolvable by
the engine — but no rule in v2 references it. It is asked, and it does nothing.
Either a rule should use it or it should stop being required, because right now
it costs conversion and buys nothing.

### 4. `min_fico` is loaded, passed to the engine, and never read

Every product row carries a `min_fico`. `actions.ts` selects it, maps it onto
`CandidateProduct`, and the engine never references it. There are two credit
thresholds per product and only one is live:

| Product | Catalog `min_fico` | Rule threshold | Live |
|---|---|---|---|
| Unsecured Term Loans | 680 | 600 | 600 |
| Unsecured Credit Lines | 680 | 620 | 620 |

An applicant with a 620 score is currently told they are a potential match for
Unsecured Credit Lines, a product whose own catalog record says 680 minimum.
**One of those two numbers is wrong and nobody has decided which.**

### 5. Unverified catalog maximums cap the estimate but cannot disqualify

The engine refuses to use `amount_max` to rule a product out, on the grounds
that nobody has verified it — then uses that same unverified `amount_max` to cap
the estimate. The code acknowledges this and argues erring low is safer, which
is reasonable. Flagged so the inconsistency is a choice rather than an accident.

### 6. The provenance contradicts itself on SBA

The captured sample had a 630 credit score and displayed an SBA range. The same
form states a 650 minimum for SBA. Both cannot be true. Either that tool shows
ranges for products you do not qualify for, or the gate is not 650. The ruleset
implements 650. Worth one more look at the source before these numbers are ever
described as accurate.

### 7. One data point

Every multiple rests on a single observation. Two businesses at the same revenue
and score would confirm the model reproduces; a third at a different revenue
would confirm the relationship is actually linear, which is currently assumed
rather than shown.

### 8. Banded money answers now post a midpoint

As of the wizard change, requested amount and average monthly revenue are
dropdowns and post the **midpoint** of the selected band. Since average monthly
revenue sets every range, an applicant selecting "$25,000 – $50,000" is modelled
at $37,500 regardless of where they actually sit. Ranges are therefore accurate
to roughly half a band. See `src/lib/qualification/amount-ranges.ts`.

---

## Is it only United Capital Source, and is it accurate?

**Only UCS.** All six credit gates, all six multiples, both time-in-business
minimums. There is no second source anywhere in the ruleset.

**Accuracy is unknown, and currently unknowable from inside the system.** There
is no validation step: no held-out example, no comparison against a lender's
actual decision, no record of whether anyone the tool matched went on to be
funded. The model reproduces one competitor's output for one input. That is the
entire evidence base.

Checked against published 2026 industry benchmarks, it holds up unevenly:

| Our rule | Public benchmark | Assessment |
|---|---|---|
| Revenue-based 0.5× – 1.5× | MCA funding typically 0.75× – 1.5× of average monthly deposits | **Consistent.** Our floor is more conservative. |
| Revenue-based: credit ≥ 500, no revenue floor, no time floor | MCA underwriting typically wants $15,000+/mo deposits and 6+ months trading | **Gap.** See finding 9. |
| SBA: credit ≥ 650 | Most SBA lenders want 680+, many prefer 700+; some go to 650 on strong cash flow; below 620 unlikely | **Too permissive.** Our gate is at the most optimistic end of the real range. |
| SBA: 2+ years | 2+ years is the common lender expectation | **Consistent.** |

### 9. Revenue-based financing has no revenue or trading-history floor

The rule is credit score ≥ 500 and nothing else. A business with $3,000 a month
in deposits and two months of history passes it and is shown a range. Every
public description of MCA underwriting includes a deposit minimum (commonly
$15,000/month) and a minimum time in business (commonly 6 months), because the
product is repaid out of daily receipts.

This is the most likely source of a visibly wrong answer today: it is the
lowest gate in the ruleset, so it is the product most applicants match, and it
is the one with the least underwriting behind it.

### Models that would be more defensible, in ascending order of effort

1. **Robert's actual lender term sheets.** The only source that produces
   *correct* answers rather than plausible ones, because those are the desks the
   deal will actually be sent to. Everything else is a proxy for this.
2. **Published lender criteria, per product.** SBA lender overlays, and the
   stated minimums of the specific funders FLS places business with. Slower to
   assemble than one competitor's tool, but each number has a citable source
   instead of a division.
3. **More competitor samples.** Cheap, and immediately useful: running three or
   four more profiles through the same UCS tool at different revenue levels
   would show whether the relationship is actually linear — which the current
   model assumes on the strength of a single point — and whether the SBA gate is
   really 650.
4. **Outcomes from FLS's own funded deals.** The only thing that closes the loop.
   Not available yet; worth structuring the data now so it can be.

**The cheapest meaningful improvement is (3).** It costs an afternoon and would
either confirm the multiples or expose that they bend.

---

## What to do next

**Apply the renumbered migration.** Until `0024` runs, three questions the engine
reads remain optional in the database.

```
supabase db push
```

**Then decide, in rough priority order:**

1. Reconcile `min_fico` against the rule thresholds (finding 4). Pick one source
   of truth and delete the other.
2. Decide whether the requested amount should influence the result (finding 2),
   or move the question later so it stops implying that it does.
3. Give annual sales a job or stop requiring it (finding 3).
4. Get Robert's own thresholds and multiples, and replace `0017` wholesale
   rather than tuning it — otherwise nobody will be able to tell which numbers
   are his and which are a competitor's.

---

## How to describe this to someone else

Safe and accurate:

> It's an indicative range based on your monthly revenue and credit profile.
> A specialist reviews every submission before anything is confirmed.

Not accurate, do not say:

> It tells you what you qualify for.
> It's based on your business's financials.
> We calculate your borrowing capacity.

The first is wrong because nothing here is an approval. The second is wrong
because it uses two answers, not a financial picture. The third is wrong because
the multiples are a competitor's, fitted to a single example.
