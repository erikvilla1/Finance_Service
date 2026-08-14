# Kai — what needs you

Written 2026-08-13, sitting together. Short on purpose: three things to do, then
context for why.

For the migration story see `FOR_KAI_MIGRATIONS.md` (resolved, nothing
outstanding). For the working agreement see `CONTRIBUTING.md`.

---

## 1. Fix `reveal.tsx` — this is blocking a PR right now

CI went red on its first real run, on two files. `flow-arrow.tsx` is fixed;
`reveal.tsx` is left for you because you were editing it when this was written.

Both call `setState` synchronously inside an effect, which
`react-hooks/set-state-in-effect` rejects. The practical cost is real, not
stylistic: the component renders once with the animation on and again with it
off, so someone who asked their operating system for no animation gets a flash
of one anyway.

Delete this block:

```tsx
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  setShown(true);
  return;
}
```

Then take `usePrefersReducedMotion` from the top of `flow-arrow.tsx` and:

```tsx
const reducedMotion = usePrefersReducedMotion();
const [scrolledInto, setScrolledInto] = useState(false);

// Reduced motion is a reason to be shown, not a separate state to set.
const shown = reducedMotion || scrolledInto;
```

Rename the `setShown` call inside the IntersectionObserver callback to
`setScrolledInto` — that one is fine where it is, because it fires from a
callback rather than the effect body — and add `reducedMotion` to the effect's
dependency array.

It is used in two files now, so worth lifting into
`src/components/marketing/use-reduced-motion.ts` and importing in both.

Check with:

```bash
npm run lint
```

---

## 2. Before your next migration, say the number out loud

Next free is **0030**.

Both of us applied migrations from branches the other could not see and reached
for the same numbers twice in one afternoon. The rule now in `CONTRIBUTING.md`
has two halves and the second is the one that actually prevents it:

- Say the number before you use it.
- **Push the branch before applying to the shared database.** Applying first
  makes a number real for everyone while the file is still invisible to them.

---

## 3. Know about three changes that reach into your side

All three are already merged. Nothing to do — but you would rather hear them now
than find them.

**`owner_title` is required** (`0025_obligations_and_owner_title`). The lender
package requires it and the form did not ask for it, so an applicant could
finish everything and still leave the file unsendable.

**One of your conditional rules is deactivated**
(`0024_show_card_processor_always`). `fin_credit_card_processor` only appeared
once `fin_avg_monthly_card_volume` had a value. Both are optional, so it was
never answered — an optional field hidden behind an optional field is a field
nobody ever fills in. The row is deactivated rather than deleted. Your other four
conditional rules are untouched.

**Conditional questions now evaluate in the browser.** They were computed once on
the server at page load, so answering "yes" to a parent question revealed the
follow-up only after a save and a reload — the form appeared to ignore you and
then sprouted new required fields once you thought you were done.
`hiddenQuestionKeys` moved to `src/lib/questions/rules.ts`: same function, no
server imports, so a client component can call it. `@/lib/questions` re-exports
it, so nothing that already imported it changed. Your prequal rules get this too,
in the good direction.

**Also:** `timezone-field.tsx` had the same lint error as above and is fixed the
same way. That is prequal UI and therefore yours — flagged here rather than left
for you to discover in a diff.

---

## What CI does now

Every push and every pull request into `main` runs `typecheck`, `lint` and
`build`. A red run blocks the merge button.

Two things worth knowing about it:

**A pull request is tested as your branch merged with current `main`**, not as
your branch alone. So a PR can fail while the push of the same commit passes —
that means `main` moved and the combination does not work. The fix is always
`git fetch origin && git merge origin/main`, resolve locally, push again.

**`build` catches what `typecheck` and `lint` cannot** — mainly server-only code
reaching a client component, which compiles perfectly and breaks at runtime. Run
it before you push rather than finding out from a red check.
