# Migration numbering — resolved

Written 2026-08-13. Kept as the record of what happened and the rule that came
out of it. **Nothing here is outstanding.**

---

## What happened

We each applied migrations from branches the other could not see, on the same
afternoon. Erik took `0024` and `0025` from an unpushed branch; Kai took `0024`
through `0027` from his. Neither of us could have known — there was nowhere to
look.

The result was two files numbered `0022` in the repo, three migrations live in
the database with no file anywhere, and then — after we both tried to fix it
independently — two files numbered `0024` and two numbered `0025`. Kai committed
the three missing files and renumbered to match the database's own version
records; Erik renumbered to match applied order. Both were reasonable and they
collided.

The database was correct throughout. What was broken was the repo's ability to
rebuild it.

---

## How it was resolved

Numbered by **applied order**, which is the order a fresh environment replays
them in:

```
0021_document_request_status_sync            (Erik)
0022_customer_edit_window                    (Erik)
0023_address_and_contact_validation          (Erik)
0024_show_card_processor_always              (Erik)
0025_obligations_and_owner_title             (Erik)
0026_require_prequal_scored_fields           (Kai)
0027_qualification_ruleset_v3_revenue_floor  (Kai)
0028_prequal_revenue_and_industry            (Kai)
0029_contact_submissions                     (Kai)
```

Filenames no longer match the `version` recorded in the database for Kai's four —
the database has them as `0024`–`0027`. That is fine and not worth chasing: those
rows are already applied and never replay. The filenames are for the next person
building this from scratch, and for them the order above is the correct one.

**Next free number is 0030.** Say so before you take it.

---

## The rule that prevents it

In `CONTRIBUTING.md`, and the important half is the second line:

- Say the number out loud before you use it.
- **Push the branch before applying to the shared database.** Applying first
  makes a number real for everyone while the file is still invisible to them.

Checking for drift:

```bash
ls supabase/migrations/            # what the repo thinks exists
npx supabase migration list        # what the database has actually run
```

---

## Kai — three things from Erik's side that reach into yours

**`owner_title` is now required** (`0025`). The lender package requires it and
the form did not ask for it, so an applicant could finish and still leave the
file unsendable.

**One of your conditional rules is deactivated** (`0024`).
`fin_credit_card_processor` only appeared once `fin_avg_monthly_card_volume` had
a value. Both are optional, so it was never answered. The row is deactivated
rather than deleted; the other four conditional rules are untouched.

**Conditional questions now evaluate in the browser.** They were computed once on
the server at page load, so answering "yes" to a parent question revealed the
follow-up only after a save and a reload. `hiddenQuestionKeys` moved to
`src/lib/questions/rules.ts` — same function, no server imports, so a client
component can call it. `@/lib/questions` re-exports it, so nothing that already
imported it changed. Your prequal rules get this too.

**`timezone-field.tsx` and `flow-arrow.tsx`** had the only two lint errors
blocking CI, and are fixed. Both set state synchronously inside an effect.
`flow-arrow` now reads the reduced-motion preference through
`useSyncExternalStore` — a media query is an external store that changes on its
own, which is what that hook is for, and reading it in an effect meant briefly
animating at someone who asked for no animation.

`reveal.tsx` has the identical pattern and is left alone because you were in it.
The hook in `flow-arrow.tsx` is worth lifting out and sharing when you fix it.
