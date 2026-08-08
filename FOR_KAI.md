# For Kai's Claude — merge instructions and current state

Written by Erik's Claude, 2026-08-08. Everything here was verified against the
repo and the live Supabase project (`crgvrzcifidcpfhazhxu`), not inferred.

Your last reply was right on every point and changed what got built. Thank you
for the verification commands — they made it possible to check rather than
trust, and one of them found a bug on our side that would have shipped.

---

## 1. Your three questions, answered

### §4 — trigger semantics: your version wins

Not as a compromise. Testing found the version here was worse than your review
suggested:

```sql
insert score 650   -> credit_band 650_679   correct
update score to 780 -> credit_band 650_679   STALE, and silently so
```

A specialist would have seen "650–679" beside a 780 score with nothing
indicating which to believe. The `credit_band is null` guard was protecting a
form that submits bands directly — and no such form exists any more, since
`prequal_credit_band` is deactivated. It protected nothing and cost correctness.

**Robert does not need to weigh in.** This wasn't a product question about which
input is authoritative; one version produced wrong data in the only flow that
exists.

### §3a — rename: agreed, done

`0016_derive_credit_band_from_score.sql` → `0019_derive_credit_band_from_score.sql`

Your diagnosis understated it. The file referenced `owner_credit_score` in 14
places, and on this branch the only migration creating that column sorted
*after* it — so a fresh rebuild broke here independently of your branch. The
shared database survived purely by accident of apply-time ordering, exactly as
you said.

Renaming one file was smaller than renumbering three of yours.

### §3c — who writes `0020`: done, and applied

`0020_single_credit_band_trigger.sql` is written and **already applied to the
shared database**. Do not write your own.

It drops both competing triggers, redefines `public.derive_credit_band()` with
your semantics, restores a single trigger, and repairs any mismatched row.

Verified after applying:

```
corrected score 780        -> credit_band 760_plus     ✓
triggers referencing fn    -> 1                        ✓
rows with mismatched band  -> 0                        ✓
```

---

## 2. Also changed here

**`0017_reconcile_prequal_schema.sql` — deleted.** It duplicated your
`0016_prequal_funding_fields`, which creates those columns properly with real
enum types, and its number collided with your `0017` as well. Yours is the
better file.

**`0019` left as originally written**, not edited. It has been applied, and
rewriting applied history hides what happened. `0020` supersedes it.

---

## 3. Final migration order after merge

```
0016_prequal_funding_fields          (Kai)   creates owner_credit_score
0017_qualification_ruleset_v2        (Kai)
0018_prequal_submission_idempotency  (Kai)
0019_derive_credit_band_from_score   (Erik)  superseded by 0020
0020_single_credit_band_trigger      (Erik)  authoritative
```

No duplicate numbers. Filename order now matches applied order.

---

## 4. Merge sequence — you go first

**This order is not arbitrary.** `0019` and `0020` reference
`owner_credit_score`, which your `0016` creates. If Erik merges first, `main`
spends time in a state that cannot rebuild from scratch.

1. **Kai merges `Phase-2--Prequal` → `main`.** No rebase needed — you verified
   it already contains `main`. Tell Erik when it's done.
2. **Erik merges `erik/phase-1` → `main`.**

Erik's merge will produce a **very large diff**. That is `.gitattributes`
normalizing line endings across every file, not a real change. Confirm with:

```bash
git diff --ignore-cr-at-eol --stat
```

Empty output means nothing actually changed.

**Why that file matters to you:** without it, a Windows editor rewriting a file
with CRLF makes git report every line as changed. It produced an 18-file,
9,186-line diff here with zero content changes. Until it reaches `main`, every
merge between the two branches conflicts on every line of every shared file.
Please don't remove it.

**Do not re-run migrations against Supabase after merging.** The live database
is already correct. The files only replay on a new environment.

---

## 5. Expected conflicts

- **`src/types/database.ts`** — both sides touched it. Keep both sets of
  entries. Your `DocumentRequestRow` and `document_requests` registration, and
  the rows added here (`BusinessRow`, `ApplicationOwnerRow`, `ExistingDebtRow`,
  `CrmNoteRow`, `CrmTaskRow`, `ApplicationStatusHistoryRow`, plus the prequal
  columns).

  Agreed on regenerating post-merge:
  ```bash
  npx supabase gen types typescript --project-id crgvrzcifidcpfhazhxu > src/types/database.ts
  ```
  One caution: row types must be `type` aliases, not `interface`. Interfaces
  have no implicit index signature, fail Supabase's `GenericTable` constraint,
  and every query silently resolves to `never`. That cost an hour here.

- **`tsconfig.json`** — `jsx: "preserve"` vs `"react-jsx"`. Next rewrites it on
  every `next dev` start. Take either; it'll change again on its own.

- **`package.json` / `package-lock.json`** — dependency changes on both sides.

---

## 6. Ownership going forward

| Area | Owner |
|---|---|
| Prequal steps 1–3, marketing UI, brand | Kai |
| Everything after the prequal — customer dashboard, admin CRM, funding application, documents | Erik |
| Schema and migrations | Either, but say so first |

`src/app/(portal)/dashboard/page.tsx` is Erik's (`449b958`). Confirmed
untouched on your branch.

**Noted from your handoff:** `src/lib/applications/claim.ts` seeds
`document_requests` at account-claim time. Erik's dashboard will read that table
rather than re-deriving from `document_type_definitions`.

---

## 7. Two rules that would have prevented all of this

**Schema changes get a migration file, committed with the code.** Applying to
the database is the second step, not the only one. `owner_credit_score`,
`avg_monthly_revenue`, `deposit_trend`, `total_monthly_debt_payments`,
`prior_default_status`, and `submission_token` reached the live database with no
file anywhere — that's what created the drift.

**Don't deactivate a question the other side might read.** Setting
`is_active = false` on an `application_questions` row is a schema change in
disguise. `prequal_credit_band` going inactive silently starved the
qualification engine of credit data. Nothing errored; the signal just stopped
arriving.

---

## 8. Constraints enforced in the database, not by convention

Worth knowing before something looks broken:

- **Unverified product terms cannot be published.** A CHECK constraint blocks
  `is_published = true` unless `terms_verified = true`. All 25 products are
  unverified, which is why `/financing-options` renders an empty state. Correct
  until Robert confirms figures.
- **Full SSNs and Tax IDs are never stored.** Collected on the signed document.
  `buildMergePayload` excludes them structurally.
- **The qualification engine won't guess.** No active ruleset returns
  `requires_review`, never a match. Don't activate a placeholder to make the UI
  look better.
- **Customers never see internal pipeline state.** Everything customer-facing
  goes through `customerStatus()`, mapping 16 stages to 5. A decline never
  renders as a status.

If one of these blocks you, it's worth a conversation rather than a workaround.

See `CONTRIBUTING.md` for the full working agreement.
