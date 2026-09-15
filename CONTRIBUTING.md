# Working on this repo

Two people and two AI agents share this codebase and one database. Everything
below exists because it already went wrong once — none of it is generic advice.

---

## Branches

Nobody commits to `main` directly.

```bash
git checkout main
git pull
git checkout -b yourname/what-youre-doing
# work, commit
git push -u origin yourname/what-youre-doing
```

Then open a pull request. Current branches: `erik/phase-1`, and Kai's work.

**Pull `main` before starting anything.** A branch cut from a stale `main`
silently loses whatever landed in between — that happened once already, and the
missing work included database migrations that were already live.

---

## Database changes go in a migration file. Always.

This is the rule that matters most, and the one that has been broken.

Columns were added to `applications` directly through the Supabase dashboard
during the prequal build. The database had them; the repository didn't. Anyone
setting up a fresh database from `supabase/migrations/` would have got a schema
the application code no longer matched. Migration `0017` exists purely to catch
the repo back up.

**Every schema change needs a file in `supabase/migrations/`**, numbered in
sequence, committed alongside the code that needs it. Applying it to the live
database is the second step, not the only one.

### Claim the number before you write it

This broke a second time on 13 Aug, worse than the first. Both of us applied
migrations from branches the other could not see, so both of us reached for
`0024` and then `0025` on the same afternoon. Two files ended up numbered `0022`
in the repo, and three migrations reached the live database with no file
anywhere — including one that created the `contact_submissions` table.

The rule is not "pick the next free number". Nothing on your machine knows what
the other person is about to apply.

**Say the number out loud before you use it.** A message is enough. Then:

```bash
git fetch origin && git log --oneline origin/main -3   # what has landed
```

**Push the branch before applying to the shared database.** Applying first makes
the number real for everyone while the file is still invisible to them. If you
apply from an unpushed branch you have taken a number nobody else can see.

**Check for drift when something feels off:**

```bash
ls supabase/migrations/            # what the repo thinks exists
npx supabase migration list        # what the database has actually run
```

If those two disagree, a fresh environment cannot rebuild production, which is
the entire reason the files exist.

### Don't deactivate a question the other side reads

Setting `is_active = false` on an `application_questions` row is a schema change
in disguise. `prequal_credit_band` was deactivated and replaced with
`prequal_credit_score`; the qualification engine reads `credit_band`, so it
silently stopped receiving credit data. Nothing errored — the signal just
stopped arriving.

If a question needs replacing, say so before doing it, or add a derivation so
both shapes keep working (see migration `0016`).

---

## Line endings

`.gitattributes` pins LF. Don't remove it.

Without it, a Windows editor rewriting a file with CRLF makes git report every
line as changed. That produced an 18-file, 9,186-line diff with **zero** actual
content changes, and it would have turned every merge into a conflict on every
line of every shared file.

If you ever see a diff where insertions exactly equal deletions, that's this.
Check with:

```bash
git diff --ignore-cr-at-eol --stat
```

Empty output means nothing actually changed.

---

## Who owns what

| Area | Owner |
|---|---|
| Prequal steps 1–3, marketing UI, brand | Kai |
| Everything after the prequal — customer dashboard, admin CRM, funding application, documents | Erik |
| Schema, migrations, RLS | Erik, but say so before changing it |

The seam is the database. Kai's form writes an `applications` row; everything
downstream reads it. Neither side calls the other, so both can be built in any
order — as long as the field names match.

**Use the question keys already in `application_questions`.** A form field
called `businessName` instead of `business_legal_name` doesn't error. It just
means Robert prints a funding application with a blank company name, weeks
later, in front of a client.

---

## Before you push

```bash
npm run typecheck    # must be clean
npm run build        # catches what typecheck can't
git status           # nothing unexpected, no .env.local, no node_modules
```

If `git status` shows a wall of modified files you didn't touch, see the line
endings section above before doing anything else.

---

## Deploying

Deploys go out by running a command, not by pushing.

Vercel refuses to build a commit whose GitHub author is not a member of the
Vercel team:

> The deployment was blocked because the commit author doesn't have permission
> to create deployments for this project.
> `seatBlock: { blockCode: "TEAM_ACCESS_REQUIRED" }`

Kai commits to GitHub but holds no Vercel seat, so **every build of a commit Kai
authored is `BLOCKED`** — including one sitting on `main`, when Kai is the one
who merged the PR. It fails quietly: the push succeeds, CI goes green, and
nothing reaches production.

Re-triggering does not help. The check is on the commit author, not on whatever
started the build, so a deploy hook pointed at the same commit is blocked
identically. That was tested, not assumed.

### Shipping Kai's work

```bash
git checkout main && git pull
npm run deploy
```

`npm run deploy` goes through the Vercel CLI. A CLI deploy carries no commit
author — Vercel records it as `source: cli`, attributed to whoever is logged in
— so the seat check never applies and Kai's commits ship like anyone else's.

It refuses to run if the working tree is dirty, or if `HEAD` is not
`origin/main`, because the CLI uploads the working directory rather than a git
ref: what is on disk is what ships. `npm run deploy -- --force` skips both
checks.

Needs `vercel login` once per machine, as someone holding a seat on the
`Financial_Lending_Advisors` team.

### The other way, where it applies

A push to `main` still auto-deploys **if the tip commit is authored by someone
with a seat**. So merging Kai's branch under your own merge commit also works:

```bash
git checkout main && git pull
git merge --no-ff kai/<branch>    # --no-ff matters: it creates YOUR commit
git push
```

A fast-forward merge leaves Kai's commit at the tip and the build is blocked, so
`--no-ff` is the entire trick. Prefer `npm run deploy` anyway — it does not
depend on who happened to write the last commit.

### Reviewing a branch before it merges

Kai's branches produce no preview URL, for the same reason. To get one:

```bash
git fetch origin && git checkout kai/<branch>
npm run deploy:preview
```

Preview URLs sit behind Vercel's deployment protection, so open them while
signed in to Vercel or they will just redirect.

### The permanent fix

Give Kai a seat on the Vercel team. That is precisely what
`TEAM_ACCESS_REQUIRED` is asking for, and it retires everything above — his
pushes would build and preview on their own. It costs a paid seat, which is the
only reason this workaround exists.

---

## Things that are enforced, not suggested

Some rules live in the database because a convention someone has to remember is
a convention that eventually gets forgotten.

- **Unverified product terms cannot be published.** A CHECK constraint blocks
  `is_published = true` unless `terms_verified = true`. All 25 products are
  currently unverified, which is why `/financing-options` shows an empty state.
  That's correct until Robert confirms the figures.
- **Full SSNs and Tax IDs are never stored.** They're collected on the signed
  document. `buildMergePayload` excludes them structurally, so a future change
  can't start sending data we don't hold.
- **The qualification engine won't guess.** With no active ruleset it returns
  `requires_review`, never a match. Don't activate a placeholder ruleset to make
  the UI look better.
- **Customers never see internal pipeline state.** Everything customer-facing
  goes through `customerStatus()`, which maps 16 internal stages to 5. A decline
  never renders as a status.

If one of these is in your way, that's worth a conversation rather than a
workaround.
