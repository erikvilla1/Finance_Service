# PR #12 — `kai/prequal-ui-and-consent` → `main`

Handoff for whoever merges this, human or agent. Written 2026-08-15 by Kai's
session. Branch head at time of writing: `3c93621`.

Two commits, 30 files, +2512 / −753. Built clean (`next build`) and `tsc`
clean **on the branch as it stands** — before merging main.

---

## THE MERGE HAS TWO CONFLICTS. GITHUB ONLY SHOWS YOU ONE.

This is the important part of this document. A trial merge was run locally to
find this; do not resolve this PR in the GitHub web editor.

### 1. `src/lib/funding-application/consent-text.ts` — git flags this

Both sides changed `ConsentTextVersion.consentType`.

- **Take main's version.** `consentType: ConsentType` (the full enum) is
  strictly better than the branch's `"fcra_authorization" | "terms_of_use"`,
  and it already covers the `terms_of_use` value the branch needs.
- Keep main's doc comment. It records why the type was widened — the ESIGN
  consent had been declaring itself an FCRA authorization to satisfy the
  narrowed type, and the signed PDF printed it that way.
- **Keep the branch's `TERMS_OF_USE_V1` export and its entry in
  `CONSENT_TEXTS`.** Those are outside the conflict hunk and merge cleanly.

### 2. `src/types/database.ts` — git does NOT flag this, and it will break the build

Both sides added a `ConsentRow` type and a `consents:` entry to the `Tables`
map, in **different parts of the file**. Git auto-merges both. The result has:

```
488: export type ConsentRow = {      <- Kai's
687: export type ConsentRow = {      <- main's
752:       consents: Table<ConsentRow>;
765:       consents: Table<ConsentRow>;
```

Duplicate identifier, duplicate object key. No conflict marker anywhere. It
compiles in the editor and fails at `tsc`.

**Delete Kai's copy, keep main's.** Main's is better — it has `document_id`,
and it documents that the table has no update or delete policy by design.
Kai's block is identifiable by its comment beginning `consents — migration
0004` and the phrase `ADDED LATE`; it sits immediately before
`export type ContactSubmissionRow`. Also delete the second
`consents: Table<ConsentRow>;` line, the one directly after
`contact_submissions: Table<ContactSubmissionRow>;`.

### After resolving

```bash
npm install     # main added @ark-ui/react, pdf-lib, resend — REQUIRED
npx tsc --noEmit
npm run build
```

In the trial merge, the only `tsc` errors were those three modules missing.
Anything else is a real regression.

---

## MIGRATIONS

The branch adds **one** migration: `0034_rename_revenue_based_financing.sql`.
It renames the `revenue-based-financing` product's display name to
`Working Capital`. The slug does not move — the ruleset and every stored
`qualification_results` row reference it.

**It has not been applied anywhere.** Until it runs, the results page still
shows "Revenue-Based Financing / Cash Advance".

Good news: the merge **resolves the pre-existing duplicate migration prefixes**
(`0024` and `0025` each had two files on the branch side). After merging there
are no duplicate prefixes, and `0034` sits correctly at the end. `supabase db
push` should work post-merge; it would have been ambiguous before.

Worth a decision, not a code change: "Working Capital" is broader than
revenue-based financing, and `working_capital` is already this product's
*track* — so the product and its category now read the same. Confirm with
Robert that he doesn't intend it to cover term loans and lines of credit,
which are separate rows. The tagline and description were deliberately left
describing advance structures sized against monthly volume; renaming a product
is a label change, rewriting what it does is a product change.

---

## WHAT'S IN THE PR

### Account creation — the part with compliance surface

- **Terms checkbox, required.** Native `<input type="checkbox">`, not the
  Radix component that was suggested (it needed three new deps to reproduce a
  platform control).
- **Enforced server-side.** `required` is a browser hint; `createAccount`
  rejects a submission without it before creating anything.
- **It writes a consent record.** On success, a row goes into `consents` with
  `consent_type: terms_of_use`, the profile, the application, `granted_at`, IP
  and user-agent. The privacy policy already promises exactly this, so a policy
  describing a record the system doesn't keep was the alternative.
- **The label wording is versioned.** `TERMS_OF_USE_V1` in `consent-text.ts`,
  with a SHA-256 hash stored per row. **Changing the checkbox label without
  adding a V2 makes existing records claim people agreed to words they never
  saw.**
- Consent-write failure is logged, not fatal — the account and claim already
  succeeded by then. It goes to `console.error`, which nothing is watching in
  production. Worth wiring to real alerting.

### Password policy

- `password-policy.ts` is now the single source: the server validates against
  `assessPassword().meetsPolicy` rather than a hand-copied length check. It
  previously checked length only, so a rule marked required was not actually
  enforced — the drift that file exists to prevent.
- A number or symbol is now **required**. This is deliberately against NIST SP
  800-63B, which advises against composition rules; it was asked for and is
  defensible on a financial site, and the reasoning is recorded in the file.
  `correct horse battery staple` is now rejected.
- Meter is three stages driven by the two visible required rules: 0 checks
  Weak, 1 Fair, 2 Strong. Guessable passwords cap at Weak regardless.
- **The two advisory rules are now dead** — neither shown nor scored. Left in
  place as future "suggestions" content, flagged in the file.

### Prequal results page

- The two match tiers (`potential_match` / `requires_review`) are merged into
  one list. A single risk flag used to move every product into "needs review",
  so the largest number on the page read **0** while viable products sat below
  it. Both confidences are still recorded on the row and still visible in admin.
- Progress bar is 3 of 3 and completes here; account creation left the bar.
- Summary tiles removed, dark CTA panel, side-by-side lists replaced with
  stacked grids so an uneven split can't strand a column.
- Reference code removed from the results and create-account pages — it's a
  case number nothing on the site accepts, and the codes are sequential, so
  printing one leaks volume.

### Everything else

FLS Capital mark across header / application flow / sign-in / footer; footer
restructure with scroll reveal and back-to-top; confetti on the results page
(gated on there being qualifying products); shimmer and cursor-glow on the
prequal submit; legal bodies extracted to `src/components/legal/` so `/terms`,
`/privacy` and the new dialog render one source.

Two real bug fixes worth noting:
- Credit score accepted any value; out-of-range scores were silently discarded
  server-side, and a null score gates all six products.
- Asset rows: clearing the first row left later rows orphaned, and because all
  rows share the field name `prequal_asset_type`, a *second* asset could
  satisfy the required question and reveal the submit button.

---

## NEW DEPENDENCIES

**None.** Several suggested components were reimplemented rather than
installed: `react-lottie` (confetti), `@radix-ui/react-checkbox` (terms),
`motion` (shimmer), a modal library (the legal dialog uses native `<dialog>`).
The project has held at 8 packages and this PR keeps it there.

---

## STILL OPEN — NOT IN THIS PR

- `npm audit fix` — `nanoid <3.3.18`, high severity
- Supabase: leaked-password protection is **off**; min length is 6 while the
  app enforces 8
- Counsel review of the terms checkbox — whether one tick box is sufficient
  assent, and whether Terms and Privacy need separate acceptance (spec §29)
- `[BRACKETS]` placeholders remain throughout `/terms`, `/privacy`,
  `/disclosures`
- Robert's sign-off on the `$20M+` hero figure — it rests on `terms_verified =
  false` catalog rows
- Real testimonial content; the Aspekta font file; `/video/sign-in.mp4`
- **Prequal answers are not persisted.** Clicking the logo mid-flow discards
  everything — the wizard holds answers in React state and nothing is written
  until final submit. A draft row keyed on the existing `submission_token`
  would fix it.
