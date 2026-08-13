# Kai — three migration files are missing from the repo

Written 2026-08-13, after PR #6 merged. Everything here was read off the live
Supabase project (`crgvrzcifidcpfhazhxu`) and compared against `main`, not
inferred.

**Nothing here is broken right now.** The database is correct and the app works.
What is wrong is that the repo can no longer rebuild the database, and that only
becomes visible the day someone needs it to.

---

## What happened, and it was both of us

We each applied migrations from branches the other could not see, on the same
afternoon. I took `0024` and `0025` from a branch I had not pushed; you took
`0024` through `0027` from yours. Neither of us could have known — there was no
way to look.

I have renamed one file and written the rule that would have prevented it into
`CONTRIBUTING.md`. The three missing files need you, because only you have the
SQL you ran.

---

## 1. Renamed — no action needed

`0022_require_prequal_scored_fields.sql` → `0026_require_prequal_scored_fields.sql`

It arrived in the repo as `0022`, which collided with `0022_customer_edit_window.sql`,
and it was applied to the database as `0024_require_prequal_scored_fields`. The
new number matches where it actually sits in the applied order. Content is
untouched.

---

## 2. Missing — this is the part I cannot do

These three are **applied to the live database and have no file in the repo**:

| Applied as | Needs to be committed as |
|---|---|
| `0025_qualification_ruleset_v3_revenue_floor` | `0027_qualification_ruleset_v3_revenue_floor.sql` |
| `0026_prequal_revenue_and_industry` | `0028_prequal_revenue_and_industry.sql` |
| `0027_contact_submissions` | `0029_contact_submissions.sql` |

The last one created a whole table. `contact_submissions` exists in the database
and nothing in `supabase/migrations/` creates it, so a fresh environment gets an
app that queries a table it has never made.

**Please commit the SQL you ran, under those filenames.** Do not re-run them —
the live database already has all three, and the files only replay on a new
environment.

If you no longer have the exact SQL, say so and I will reconstruct the files
from the live schema. Reconstruction is worse than the original: it captures
what the schema is and loses why, which for the ruleset in particular is the
part worth keeping.

---

## 3. The order once you are done

```
0021_document_request_status_sync          (Erik)
0022_customer_edit_window                  (Erik)
0023_address_and_contact_validation        (Erik)
0024_show_card_processor_always            (Erik)
0025_obligations_and_owner_title           (Erik)
0026_require_prequal_scored_fields         (Kai)   renamed from 0022
0027_qualification_ruleset_v3_revenue_floor (Kai)  MISSING
0028_prequal_revenue_and_industry          (Kai)   MISSING
0029_contact_submissions                   (Kai)   MISSING
```

Next free number after that is **0030**. Say so before you take it.

---

## 4. Worth knowing from my side

**`0025_obligations_and_owner_title` touched the prequal indirectly.** It set
`owner_title` to required, because the lender package requires it and the form
did not ask for it — an applicant could finish and still leave the file
unsendable. That is the `owner` module, not prequal, but it is a question row so
it is worth you knowing it moved.

**`0024_show_card_processor_always` deactivated one of your rules.**
`fin_credit_card_processor` was revealed only once `fin_avg_monthly_card_volume`
had a value. Both are optional, so it was never answered. The rule row is
deactivated rather than deleted, and the other four conditional rules are
untouched.

**Conditional questions now evaluate in the browser.** They were computed once on
the server at page load, so answering "yes" to a parent question revealed the
follow-up only after a save and a reload. `hiddenQuestionKeys` moved to
`src/lib/questions/rules.ts` — same function, no server imports, so a client
component can call it. `@/lib/questions` re-exports it, so nothing that already
imported it changed. This affects your prequal rules too, in the good direction.

**CI now runs on every push.** `typecheck`, `lint` and `build`, and a red run
blocks the merge button. Your `timezone-field.tsx` was the only lint error in the
repo and I fixed it — hidden inputs are set through refs rather than `setState`
inside an effect. Behaviour is identical. That crosses into prequal UI, which is
yours; it is flagged here rather than left for you to find.

See `CONTRIBUTING.md` for the working agreement, including the new rule about
claiming a migration number.
