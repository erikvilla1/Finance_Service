# FLS Platform — Development Setup

## Documents to read first

| File | What it governs |
|---|---|
| `Financial_Lending_Specialists_Platform_README.md` | Architecture, build order, coding rules, copy constraints |
| `docs/BUSINESS_CONTEXT.md` | Business facts, product terms, application fields, open conflicts |

`docs/BUSINESS_CONTEXT.md` §14 lists the four unresolved decisions. Check it before building anything that touches products, the CRM, or phasing.

---

## Getting it running

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

### Environment values

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are already filled in `.env.example` — the anon key is designed to be public and is safe in the browser, because Row Level Security is the real boundary.

`SUPABASE_SERVICE_ROLE_KEY` is **not** included and must never be committed. Get it from the Supabase dashboard → Project Settings → API. It bypasses RLS entirely.

Supabase project: `crgvrzcifidcpfhazhxu` (free tier, us-west-1).

---

## Project layout

```
src/
  app/
    (marketing)/     public site — home, financing options, how it works, legal
    (application)/   the application flow
    (portal)/        customer dashboard
    (admin)/         internal pipeline view
    sign-in/
  components/
    ui/              design system primitives
    marketing/       header, footer
  lib/
    supabase/        browser, server, and service-role clients
    qualification/   the prequalification engine
    products/        goal definitions
  types/             database types
supabase/migrations/ schema, RLS, seed data
```

---

## Database

Seven migrations, all applied:

| Migration | Contents |
|---|---|
| `0001_foundation` | Extensions, enums, role helpers |
| `0002_product_catalog` | Products, questions, rules, document definitions |
| `0003_applications` | Profiles, businesses, applications, answers, guarantors, results |
| `0004_documents_consents_audit` | Documents, consents, audit log, private storage bucket |
| `0005_rls_policies` | Row Level Security across all 17 tables |
| `0006_seed_catalog` | 5 categories, 25 products, 16 document types, placeholder rulesets |
| `0007_function_hardening` | search_path pinning, REST exposure cleanup |

To regenerate database types after a schema change:

```bash
npx supabase gen types typescript --project-id crgvrzcifidcpfhazhxu > src/types/database.ts
```

Note: row types must be `type` aliases, not `interface`. Interfaces have no implicit index signature, so they fail Supabase's `GenericTable` constraint and every query silently resolves to `never`.

---

## Two things that are enforced, not just documented

**Unverified terms cannot be published.** `financing_products` carries a `terms_verified` flag and a CHECK constraint: `is_published = false or terms_verified = true`. All 25 products are currently unverified, so nothing is publishable. This is why `/financing-options` renders an empty state — that is correct behaviour until Robert confirms the figures.

To verify a product after the Phase-0 session:

```sql
update public.financing_products
   set terms_verified = true,
       verified_at = now(),
       verified_by = 'Robert Saucedo',
       is_published = true
 where slug = 'construction-equipment-financing';
```

**The prequal engine will not guess.** All nine qualification rulesets are seeded inactive with placeholder content. A track with no active ruleset returns `requires_review`, never a match. Indicative amounts appear only for products where `terms_verified = true`. See `src/lib/qualification/engine.ts`.

---

## Product taxonomy

Every product carries both:

- **`category`** — goal-based, drives site navigation (5 categories)
- **`track`** — underwriting-based, drives prequal rules and document lists (9 tracks)

They deliberately cross. `working-capital-equipment-equity` sits under Business Cash Flow for navigation but underwrites on the equipment track.

`startup-growth-capital` is a **proposed** fifth category not in the platform spec — added because the unsecured term-loan, credit-line, and startup programs had no home in the spec's four. Flag for review.

---

## Security notes

- RLS is enabled on all 17 public tables; there are no tables without it.
- Full SSNs are **not** stored. `application_owners.ssn_last4` only. Changing this needs a compliance review first.
- Owner/guarantor data is in its own table with its own policies, so a bug in application access cannot leak it.
- Documents live in a private bucket, path-scoped to `{application_id}/`. Never generate public URLs.
- Consents are insert-only. There is no update or delete policy, by design.
- Audit logs are admin-read and append-only.
- `is_staff()` and `is_admin()` remain callable over REST because RLS policies need them. Both report only on the calling user.

Two advisor warnings remain, both for those functions, both intentional and documented in `0007`.

---

## Creating a staff account

Sign-in is wired, but every new signup defaults to the `customer` role — staff roles must be granted explicitly (spec §22). To get into the CRM at `/admin`:

1. Register the account. Supabase dashboard → Authentication → Users → **Add user**, with "auto confirm" checked so you skip the email step in development.
2. Promote it. SQL Editor:

```sql
update public.profiles
   set role = 'admin', full_name = 'Erik Villa'
 where email = 'you@example.com';
```

Roles are `customer`, `specialist`, `manager`, `admin`. A non-admin cannot change their own role — the `guard_role_changes` trigger blocks it, so this has to be done here.

**Before any real applicant data exists**, turn on MFA for staff in Supabase → Authentication → Providers → enable TOTP enrolment. Spec §22 requires it and password-only is not sufficient for production.

---

## Current state

Working: schema, RLS, seed catalog, design system, marketing pages, goal selector, prequal engine (pure function, no rules yet).

Scaffolded but not wired: sign-in, application steps 2+, customer portal, admin pipeline.

Blocked on the Phase-0 session with Robert: qualification thresholds, verified program terms, brand and ICP positioning, CRM scope, state licensing coverage.

---

## Known environment issue

`next build` crashes with a bus error in some constrained Linux sandboxes (an SWC binary issue, not a code issue). `npm run typecheck` passes clean, and the build works normally on a standard machine.
