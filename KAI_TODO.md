# Kai — working solo on the database

Updated 2026-08-14. Erik is logging off; you are carrying on. This is the short
version of what keeps the shared database safe while nobody is watching it with
you.

There is **one database**. No staging, no copy. Everything you run tonight lands
on the same schema Erik's work runs against tomorrow, and on the real
applications in it.

---

## 1. Take 0031

`0030` is applied. Every number up to and including it is used.

```
0026_require_prequal_scored_fields           (Kai)
0027_qualification_ruleset_v3_revenue_floor  (Kai)
0028_prequal_revenue_and_industry            (Kai)
0029_contact_submissions                     (Kai)
0030_signature_request                       (Erik)
```

---

## 2. Write the file first, apply second

This is the rule that has broken twice, and both times the same way: a migration
reached the database with no file in the repo, so the repo could no longer
rebuild production. Once it was a whole table — `contact_submissions` existed in
the database and nothing in `supabase/migrations/` created it.

**Write `supabase/migrations/0031_whatever.sql`, commit it, then apply it.**
Applying first is what makes it easy to forget, because everything works and
nothing complains.

If you apply through the Supabase SQL editor, paste the same SQL into the file
before you run it, not after.

---

## 3. Check yourself before you finish

```bash
ls supabase/migrations/          # what the repo thinks exists
npx supabase migration list      # what the database has actually run
```

If those two disagree, stop and reconcile before logging off. Tomorrow it costs
an hour; tonight it costs a minute.

Then diff the schema against `docs/SCHEMA_SNAPSHOT.md` — it has the query in it.
Anything that appears or disappears without a migration file is drift.

---

## 4. Four things that are load-bearing

They are listed in `docs/SCHEMA_SNAPSHOT.md` too. If a change of yours would
drop or alter one, that is worth a message rather than a judgement call:

- **`guard_customer_application_fields`** on `applications` — keeps status,
  owner, assignee and the signature release out of a customer's reach. RLS
  grants a row, never a column, so without this an applicant can move their own
  file through the pipeline.
- **`guard_role_changes`** on `profiles` — stops anyone making themselves admin.
- **`sync_document_request_status`** on `documents` — the whole checklist is
  derived from it. Drop it and every request freezes where it stands.
- **`customer_may_edit(status)`** — the window in which an applicant may edit
  their own file. Nine policies reference it; changing it changes all nine.

---

## 5. Don't delete data to test

The database was cleared once already today and it is fine to do again — but
say so first. Erik has a live application in there he is testing the signature
flow against, and `applications` cascades to answers, owners, documents,
checklists and qualification results.

If you need a clean slate, make a new application rather than removing the
existing one.

---

## 6. Still yours from earlier

**`reveal.tsx`** — `setState` called synchronously inside an effect, the last
lint error in the repo, and it turns CI red on every pull request including
Erik's. `flow-arrow.tsx` is fixed and has the pattern to copy:
`usePrefersReducedMotion` at the top of the file, then
`const shown = reducedMotion || scrolledInto`. Worth lifting the hook into
`src/components/marketing/use-reduced-motion.ts` since it is used twice.

---

## What Erik changed today

All merged or about to be. Nothing needs action, but you would rather know.

- **`0030`** adds `signature_requested_at` to `applications` and extends the
  guard trigger to cover it.
- **Signature flow** — applicants sign the funding application in the portal,
  on a page a specialist releases. Generates a PDF, stores it as the
  `signed_application` document, records two consents with the text hash, IP and
  user agent.
- **Lender package** — one zip with every document and a manifest, from the
  admin application page.
- **New dependencies:** `@ark-ui/react` and `pdf-lib`. Run `npm install` after
  pulling or the build will fail.

See `CONTRIBUTING.md` for the working agreement and
`FOR_KAI_MIGRATIONS.md` for how the numbering got settled.
