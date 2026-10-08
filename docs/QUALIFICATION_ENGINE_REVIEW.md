# Qualification engine — review against the client's punch list

Written 2026-10-07, against commit `5b6fe1f`.

**This is analysis, not a change.** The client's deep-dive punch list
(`FLS_Qualification_Engine_Deep_Dive_Punch_List_IWA.docx`) never reached the
session that produced it — see `QUESTIONS.md` §3 — so the per-product field
lists, the fields marked "Missing", and the document-checklist corrections are
all unread. Nothing here guesses at them.

What follows is the part that *can* be settled from the code: whether the
architectural problems the executive direction describes actually exist.

---

## 1. Which engine is live

There are two, and only one runs.

| Module | Status |
|---|---|
| `src/lib/matching/` | **Live.** `start/prequal/actions.ts` imports `match()` from `matching/engine` |
| `src/lib/qualification/engine.ts` | **Not reachable.** No file in `src/` imports it |

`src/lib/qualification/` is not entirely dead — `amount-ranges.ts` is used by
the prequal wizard and `types.ts` exports the `ProductMatch` type used by the
result page and the admin view. But `engine.ts` in that folder, a
rules-from-the-database design marked `ENGINE_VERSION = "2.0.0-rules"`, has no
importer and no test.

Worth settling before any engine work starts: it is either the intended
destination for the per-program configuration the client is asking for, or it
is dead code that will mislead the next reader. It should not stay ambiguous.

---

## 2. Priority 1 — "kill the single universal scorecard"

> Every product must independently declare, per field, whether it is a hard
> gate, a soft/ranking factor, informational only, or not applicable. Do not
> hard-code a global credit-score or time-in-business penalty.

**The live engine already works this way.** There is no universal scorecard to
kill.

`evaluateProgram()` in `matching/engine.ts` evaluates each program against
*that program's own* declared rules. The `Program` type carries:

- `hardRules` — failure excludes the program, or routes it to review if the
  rule sets `onFail: "manual_review"`
- `softRules` — failure moves Strong down to Potential and flags it for staff
- `requiredInputs` — facts that must be present to evaluate the program at all
- `amountMin` / `amountMax`, and `ruleConfidence`

That is the A/B/C/D distinction the client is asking for, in a different
vocabulary: hard gate = `hardRules`, ranking factor = `softRules`,
informational = collected but in neither list, not applicable = simply absent
from that program's rules.

**There is no global credit or time-in-business penalty.** Credit is a rule
helper (`minCredit(score)`, which builds `{ fact: "credit", op: "gte" }`)
applied only by programs whose lender actually requires it.

### The client's worked example already holds, and is already tested

> Owner FICO can be *collected* on a factoring lead but must not suppress a
> viable factoring match.

None of the four `invoice_factoring` programs has a credit hard rule:

| Program | Hard rules |
|---|---|
| `qualifi_factoring` | none |
| `orange_commercial_factoring` | business/government debtors only — notes: "Weak company credit OK with a strong debtor base" |
| `us_financial_factoring` | business/government debtors only — notes: "low credit scores OK" |
| `hedaya_factoring` | business debtors only |

And `matching/engine.test.ts:123` already asserts exactly the client's case —
a staffing company, owner credit band `550_599`, sound receivables — and checks
that the `invoice_factoring` family does **not** come back
`no_current_match`, that the overall state is not a decline, and that
`national_ar_line` stays `potential`. It is named for the principle: *"A/R /
weak owner credit: factoring stays viable; owner FICO is no system-wide
decline."*

**Recommendation:** do not rebuild anything for Priority 1. Take the docx's
per-product field lists and express them as `hardRules` / `softRules` entries
on the programs they belong to. The mechanism is already there and the
behaviour the client wants is already the behaviour, at least for the example
they chose.

If the client is reacting to something real, the likeliest candidate is the
*form*, not the engine: the universal profile asks owner credit on every
branch including factoring. The client's own wording allows that ("can be
collected"), but it is what a reviewer sees.

---

## 3. Priority 2 — "keep prequal light"

> Only add a prequal question if its answer can change the family, match state,
> lender route, or next step.

That is a testable property, so it was tested. Tracing all 81 prequal fields
through `buildFacts()` into every consumer — rule `fact:` references, `is(...)`
helpers, direct `facts.*` reads in the engine and family mapping, and the
`showIf` conditions that steer the form itself:

- **21** are consumed directly as a fact
- **41** feed a derived fact (`owner_credit_range` → `credit`,
  `time_in_business` → `tib_months`, `credit_events` → `bk_active` and others)
- **19 are read by nothing at all**

Note that `buildFacts()` copies every answer into `facts` wholesale, so every
field *is* available to a rule. These 19 are the ones no rule, policy, routing
step or `showIf` currently takes up.

| Field | Branch |
|---|---|
| `acq_seller_note`, `acq_target_cashflow` | Business acquisition |
| `ar_concentration`, `ar_days_to_pay` | Accounts receivable |
| `cre_existing_debt`, `cre_gross_income`, `cre_noi`, `cre_occupancy` | Commercial real estate |
| `current_financing_balance`, `monthly_debt_payments`, `deposit_trend` | Working capital |
| `debt_remaining_term`, `debt_total_monthly_payment` | Debt refinance |
| `equipment_titled`, `seller_type` | Equipment |
| `re_liquidity`, `re_monthly_rent`, `re_taxes_insurance` | Investment real estate |
| `unsure_priority` | I'm not sure |

**Read this as a candidate list, not a verdict.** Three caveats:

1. The analysis is static. A field could still earn its place through the staff
   view, the document checklist, or result copy — it only establishes that no
   *matching* logic consumes it.
2. Some are collected deliberately for the specialist. `prequal-layout.ts`
   records exactly this reasoning for asset value and asset debt: "no rule
   reads either, so they cost a specialist nothing to receive late."
3. **The docx is the authority on which of these move.** It names per-product
   fields to add and fields to move to the application. This list is where to
   start reading it, not a substitute for it.

Several do look like the underwriting detail the client explicitly places
after account creation — `cre_noi`, `cre_gross_income`, `cre_existing_debt`,
`debt_total_monthly_payment`, `re_monthly_rent`, `re_taxes_insurance`,
`acq_target_cashflow`. Confirm against the docx before moving any of them.

---

## 4. Match states

All four exist, with the client's names, in `matching/copy.ts`:

| State | Staff label | Customer label |
|---|---|---|
| `strong` | Strong Match | Strong Match |
| `potential` | Potential Match | Potential Match |
| `specialist_review` | Specialist Review | Specialist Review |
| `no_current_match` | No Current Match | **"May not fit"** |

The client's requirement for the last one — explain that FLS cannot identify a
path *from the information provided*, never imply the borrower is
unfinanceable — is met:

> Your profile does not currently match the preliminary criteria in our
> automated program library. Financing guidelines vary and change frequently,
> so you may still request a manual review.

It attributes the outcome to the automated library's preliminary criteria and
offers a manual review. The customer-facing label is softened further to "May
not fit".

One wording gap worth raising with the client: that copy says "does not match
our automated program library" where the client's phrasing is "from the
information provided". The results disclaimer does open with "Based on the
information provided", so the idea is present on the page — but if the client
wants the no-match card itself to carry it, that is a one-line change in
`NO_CURRENT_MATCH_COPY`.

Borderline cases do not become false approvals. The live engine's `MatchState`
has no "approved" in it at all — the four states above are the whole
vocabulary — and `review_required: true` is written on every submission
(`start/prequal/actions.ts:299`). The unreachable rules engine holds the same
commitment independently (`qualification/engine.ts:282`), which is worth
knowing if it is ever brought into service. They do not become hard declines
either: `applyPolicies()` caps a current default or 4+ positions at
`specialist_review` and routes toward restructuring rather than declining.

---

## 5. What still needs the docx

Everything product-specific:

- Per-product field lists for all nine branches — which fields to add, which to
  move to the application
- Document-checklist corrections, including the items the client marked
  "Missing"
- The inline annotations ("Disregard", "Please check for me") whose intent the
  brief already flags as ambiguous and not to be guessed at

The architecture is ready to receive all of it. Priority 1 needs no rebuild.
