# Branch sync notes for Kai

Context for whoever (human or Claude) is working from `Kai's-First-Branch`. Written by Erik's Claude on 2026-08-07, from the last snapshot it could see of `origin` — Kai has pushed more since, so treat the "last known state" section as a starting point to verify, not a current fact.

## Repo / branch layout

- `main` — integration branch.
- `erik/phase-1` — Erik's active branch, currently ahead of `main` by 3 commits, pushed and clean.
- `Kai's-First-Branch` — Kai's branch.
- No CI/CD is configured (no GitHub Actions workflow in the repo). Nothing runs automatically on push — merging is manual, and so is applying Supabase migrations.

## Last known state of Kai's branch (verify before trusting this)

As of the last commit visible on `Kai's-First-Branch` (`c7297be`, a merge of `main`), the branch predates several things that have since landed on `main`:

- Migrations `0008` through `0013` (seed questions, application public token, CRM, applicant timezone, RLS performance, FK indexes).
- App code: admin CRM pages, prequal actions/results flow, question engine, sign-in form.
- The `proxy.ts` rename (Next.js 16 renamed `middleware.ts` → `proxy.ts`).
- Brand assets: logo files, hero video.

**If that's still true, merging this branch as-is would delete/revert all of the above rather than add to it.** First step for Kai's Claude: pull/rebase current `main` into this branch and resolve conflicts *before* opening a PR, not after.

## Known collision risk: the `applications` table

Erik added migration `0016_derive_credit_band_from_score.sql` — a trigger on `public.applications` that derives `credit_band` from `owner_credit_score`, plus a one-time backfill. It's already applied to the shared Supabase project (`crgvrzcifidcpfhazhxu`).

Kai's side has separately added columns to the same table: `avg_monthly_revenue`, `deposit_trend`, `total_monthly_debt_payments`, `prior_default_status`, `submission_token`. Different columns, so no direct SQL conflict expected — but:

- If Kai's migration is *also* numbered `0016`, one side needs renumbering before merge (Supabase migrations must be strictly ordered, no duplicate version numbers).
- Check `src/types/database.ts` for merge conflicts — both sides touched the generated row types for `applications`.
- After merging, regenerate types to catch anything missed:
  ```
  npx supabase gen types typescript --project-id crgvrzcifidcpfhazhxu > src/types/database.ts
  ```

## Other likely conflict spots

- `package.json` / `package-lock.json` — dependency changes on both branches.
- `tsconfig.json` — Kai's branch has a different version.

## Suggested merge order

1. Merge `erik/phase-1` → `main`.
2. Kai's Claude rebases (or merges) updated `main` into `Kai's-First-Branch`, resolves conflicts above.
3. Run `npm run typecheck` and `npm run lint` on the rebased branch before opening a PR.
4. Confirm no duplicate Supabase migration version numbers before applying anything new.
5. Open PR into `main`.

## What to confirm back with Erik

- Has `Kai's-First-Branch` already been rebased onto current `main`? (This doc assumes not — correct if wrong.)
- What migration number is Kai's `applications` schema change using?
- Any other tables/files touched on both branches worth flagging before merge?
