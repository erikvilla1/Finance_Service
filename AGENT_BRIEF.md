# Agent Brief — FLS Capital Advisors platform

You are picking up an in-flight build. This file is the handoff: what the
product is, what has already been decided, the traps that will bite you, and
the work that is actually outstanding.

Read it fully before touching anything. Several items below exist because they
already went wrong once.

---

## 1. What this is

A financing-brokerage platform for **FLS Capital Advisors** (legal entity:
Financial Lending Specialists, Inc.). Three surfaces in one Next.js 16 app:

| Surface | Route group | Who uses it |
|---|---|---|
| Marketing site + prequalification flow | `(marketing)`, `(application)` | Prospective borrowers |
| Client portal | `(portal)` — `/dashboard` | Applicants tracking their file |
| Admin console | `(admin)` — `/admin/*` | Robert (the broker), daily |

FLS is a **broker, not a lender**. It arranges financing through third-party
funding sources and makes no credit decisions. That distinction governs almost
every copy and product decision in the repo — if you find yourself writing
anything that implies FLS lends, approves, or guarantees, you have gone wrong.

Stack: Next.js 16 (App Router), TypeScript, Tailwind v4, Supabase (Postgres +
Auth + Storage + RLS), Vercel, Resend for email.

**`AGENTS.md` at the repo root is written by `next dev` and warns that this
Next.js version has breaking changes versus your training data. Believe it.
Read `node_modules/next/dist/docs/` before writing framework code.**

---

## 2. Hard operational constraints

These are not style preferences. Violating them causes real damage.

### 2.1 Localhost writes to the PRODUCTION database

`.env.local` points at the same Supabase project as production
(`crgvrzcifidcpfhazhxu`). There is **no separate dev or staging database.**

- Submitting a form on `localhost:3000` creates a **real row in live data.**
- This has already happened: two junk prequal submissions were created while
  reproducing a bug, and they sit in the lead pipeline looking like real leads.
- Staff notification email did not fire only because `RESEND_API_KEY` is unset
  locally. That is an accident, not a safeguard.

**Rule:** reproduce UI bugs by driving a form up to the final submit and
inspecting state. Do **not** click the terminal submit unless the user has
explicitly asked for a real end-to-end test. Intermediate "Next" steps,
validation, and navigation are all safe — only the final submit persists.

### 2.2 You cannot deploy

Vercel refuses to build any commit whose GitHub author lacks a Vercel seat.
Kai has no seat, so **every build of a Kai-authored commit is `BLOCKED`** —
including one sitting on `main`. It fails silently: the push succeeds, CI goes
green, and production never moves.

Read `CONTRIBUTING.md` §Deploying. Deploys happen by `npm run deploy` (Vercel
CLI, run by a seat-holder — Erik), or by Erik merging with `--no-ff` so his
commit is the tip.

**Consequence for you:** never tell the user something is "live" because you
pushed it. Verify against the deployed URL or say explicitly that it is pushed
but not deployed.

### 2.3 Legal and regulated copy — do not invent

The Privacy Policy, Terms of Use and Disclosures carry a `DRAFT — NOT REVIEWED
BY COUNSEL` banner and bracketed `[CONFIRM]` placeholders.

Generic contract boilerplate (liability caps, indemnity, governing law) has
been filled in. **Factual claims have not**, deliberately:

- Business mailing address, phone, contact email — still bracketed. Nobody has
  supplied them. Do not invent an address.
- A "Licensing" section was **removed rather than filled**, because inventing
  state licence numbers is a false regulatory claim, not boilerplate.
- State commercial-financing disclosure tables (CA SB 1235, NY CFDL) are
  transaction-specific and cannot live as static page text.

The codebase states this principle in its own comments: *"writing
plausible-sounding disclosure language for a regulated activity is worse than
leaving the gap visible."* Hold that line even under pressure to make things
"launch ready."

### 2.4 iCloud eviction

The project lives on an iCloud-synced Desktop. Two known symptoms:

- The dev server can hang on evicted files.
- iCloud creates duplicate files like `routes.d 3.ts` inside `.next/types/`,
  which break `npm run typecheck` with bogus "Duplicate identifier" errors.
  Fix: `find .next/types -name "* [0-9].ts" -delete`, then re-run. This is not
  your code.

---

## 3. Verification — run these before claiming anything works

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint — 0 errors required; 2 known warnings exist
npm test               # 31 tests, all should pass
npm run build          # catches server/client boundary errors the others miss
```

`npm run build` with the CI env vars is the most useful single check:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://crgvrzcifidcpfhazhxu.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_oLemQmh7on_v8jxtluzudw_S4W90JB4 \
NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
npm run build
```

**Two known-good lint warnings** (`PASSWORD_MIN_LENGTH`, `useScrolledPast`
unused). Anything beyond those is yours.

**You cannot see `/admin/*` or `/dashboard/*` in a browser** — they are
auth-gated and no agent has credentials. Do not hand-wave past this. Either
verify a different way (read the prerendered HTML in `.next/server/app/`,
drive an unguarded route, reason from the code) or tell the user plainly that
you could not see it and ask them to look.

---

## 4. Conventions that are load-bearing

### 4.1 This is NOT a shadcn project

No `components.json`, no `class-variance-authority`, no `@radix-ui/react-slot`,
no `clsx`/`tailwind-merge`. There is a hand-rolled kit at
`src/components/ui/index.tsx`. Icons come from `lucide-react`.

When handed a shadcn snippet to integrate, **port the idea, not the
dependencies.** `src/app/sign-in/page.tsx` has a comment explaining what taking
one literally would have cost (five packages for a card and a button).

### 4.2 Tailwind v4 gotchas that have already caused bugs

- `translate`/`scale`/`rotate` utilities set **independent CSS properties**,
  not the composite `transform`. A `transition-[transform,...]` silently does
  nothing for them — list `translate,scale` instead.
- **Never put two conflicting `bg-*` utilities in one class string.** Tailwind
  resolves the collision by stylesheet order, not by which you wrote last.
  This produced an invisible "empty box" bug in the admin console. Decide a
  background in exactly one place. `Card` in the UI kit carries a comment
  about this trap.

### 4.3 Comment style

The codebase explains **why**, not what — especially for decisions that look
wrong without context, and for approaches that were tried and rejected. Match
it. When you reverse a decision, say what failed and why, so the next person
does not re-try it. Do not write comments that restate the code.

### 4.4 Admin console design language

`src/components/admin/console-ui.tsx` is the shared vocabulary: `PANEL`
(square, hairline), `GLASS` (translucent rows), `MICRO`/`HEADING` (mono,
uppercase, letterspaced), `CornerBrackets`, `StatTile`, `StatusChip`.

- **The admin area is dark-only.** The theme toggle was removed deliberately.
  The `dark:` variants throughout always apply; treat them as "the admin
  palette", not a branch that might be taken.
- Chart/series colours are **validated**, not chosen by eye (lightness band,
  chroma, colour-blind separation, contrast against the surface). If you
  change them, re-validate. Status colours always ship with an icon **and** a
  text label — never colour alone.
- Gold (`accent-*`) is the site's pale cream. On a dark surface it reads as
  **white, not gold** — this burned one attempt at a "gold" selected state.

---

## 5. Where the product stands

### Shipped and live
- Marketing site, 11 resource-guide landing pages, PDF downloads
- Goal-first prequalification flow deriving its goal list from the same
  `RESOURCE_GUIDES` source as the guides, so the two cannot drift
- Client portal (application, documents, e-sign, status)
- Admin: Overview (analytics console), Pipeline (the working surface), Lenders
- Legal pages under `(application)` chrome
- Qualification engine v1.1 (`src/lib/qualification/`, `src/lib/matching/`)

### Recently landed (last session, commits `56a110a`, `cc393c7`)
- Admin Overview rebuilt as an operations console: deals won/lost, amount
  funded/requested, requested-vs-funded chart at month/quarter/year
- Pipeline split into two labelled axes — "What needs you" (work state) vs
  "Where files sit" (pipeline status). They were previously twelve identical
  tiles silently filtering on different axes.
- "Chase documents" — a prefilled `mailto:` naming the specific outstanding
  documents, on files waiting on the applicant
- Two auth bugs fixed: admins landed on the customer portal after sign-in and
  after password reset (both now share `src/lib/auth/landing.ts`)
- Marketing header: `onHome` now uses `useSelectedLayoutSegment()` rather than
  `pathname === "/"`, which resolved true locally and false in the deployed
  build, shipping the wrong header into prerendered HTML

### Known data-model facts worth knowing before you touch matching
- `applications.status` is a 16-value enum. `STATUS_GROUP` in `src/lib/crm.ts`
  buckets it; `src/lib/leads.ts` computes an orthogonal "what does this file
  need" axis. **These are different questions** and conflating them is the
  single most common mistake on this surface.
- "Amount funded" = `SUM(lender_submissions.offered_amount)` where that
  submission funded — **not** `requested_amount` on funded applications. What a
  business asked for and what a funder wrote are different numbers.
- "Deals won" = status `funded`, not `approved`. An approval that never funds
  is not a deal.
- `lender_submissions.status` already has `countered`, which is the schema's
  name for "conditionally approved".

---

## 6. Outstanding work

### 6.1 Client punch list — front end
From `FLS_Front_End_IWA_Review 9-29-26.docx` (Sept 29). The client's framing:
*"refinement items, not a redesign request."*

1. **CTA wording** — `"Get Your Free Quote"` → **`"See Your Financing Options"`**
   everywhere. Reason: the flow produces indicative ranges, not a lender quote.
   **Verified: the string appears in 7 files under `src/`.** Change all of
   them, and check it is not also baked into generated PDFs or email copy.
2. **How It Works step 02** — replace *"Eight quick questions about revenue,
   time in business, and credit."* with *"A few quick questions about your
   business and financing needs."* **First confirm** why Robert does not see
   the "Eight quick questions" sentence in his browser — the client flagged a
   possible responsive/animation/content-version discrepancy. Diagnose before
   editing.
3. **$20M stat** — `"Available in loans"` → `"Financing solutions up to
   $20M+"`. Note: this figure is flagged `⚠️ UNVERIFIED` in `page.tsx` pending
   Robert's sign-off. Do not remove that warning comment.
4. **Animated counter duplication** — crawlers read `"$20.0M+$20M+$20M+"`.
   **Verified before you start:** `count-up.tsx` *already* marks its
   decorative layers `aria-hidden` (lines 167, 174, 310, 315) and exposes one
   `sr-only` value (line 179). So the obvious fix is already in place.
5. **Testimonial carousel duplication** — **also already handled**:
   `marquee.tsx:154` sets `aria-hidden` on the cloned copy, and the file's own
   comment block (line 41) explains why.

   **Read 4 and 5 together — they are one problem, and it is probably not the
   one the client diagnosed.** Both components already do the correct
   accessibility thing. The likely explanation is that **search crawlers do not
   honour `aria-hidden`** the way assistive technology does; Google will
   happily index text inside an `aria-hidden` subtree. If so, no amount of ARIA
   will fix the crawler reading, and the real options are to render the
   duplicate layers in a way crawlers skip, or to accept it.

   **Do not "fix" this by adding ARIA that is already there.** Confirm what the
   crawler actually receives first (fetch the deployed HTML and look at the raw
   markup), then report what you find. This may be a "the diagnosis was wrong,
   here is the actual constraint" answer rather than a code change.
6. **Resource navigation** — replace/supplement "Back to Resources" with
   breadcrumbs (`Home > Resources > Equipment Financing`) and add a "Related
   Financing Guides" section. Client-suggested pairs: Acquisition↔SBA,
   SBA↔CRE, Fix&Flip↔Ground-Up, Factoring↔Working Capital, Working
   Capital↔Term Loans/LOC, Debt Refinance↔Term Loans/Working Capital,
   Startup↔Equipment/Term Loans.
7. **Acronym casing** — `(marketing)/resources/[slug]/page.tsx:238` does
   `{guide.title.toLowerCase()}` in "Find the right … path", which lowercases
   "SBA". Fix without breaking the titles where lowercasing reads correctly
   (e.g. "Equipment Financing" → "equipment financing" is fine). Consider
   storing a display-safe lowercase form on the guide data rather than
   transforming at render.
8. **Qualification weighting** — see 6.2; this is the big one.
9. **Privacy/tracking verification** — confirm the production site's actual
   analytics/cookies/pixels match the Privacy Policy, which currently claims
   no advertising trackers and only session cookies. Verify, do not assume.
10. **Final legal review** — FLS's responsibility, not yours. Leave the draft
    banners in place.
11. **Founder bio** — replace with the client's supplied copy (in the docx).

### 6.2 Qualification engine punch list — the substantial work
From `FLS_Qualification_Engine_Deep_Dive_Punch_List_IWA.docx`.

**Executive direction: the goal-first architecture is correct. Do not rebuild
it.** The change is to separate three things the current engine blurs:

- **Universal questions** = lead/profile data
- **Product-specific questions** = what decides whether a family is plausible
- **Lender-specific rules** = routing logic applied *after* the family is known

**Priority 1 — kill the single universal scorecard.** Every product must
independently declare, per field, whether it is: (A) hard gate, (B)
soft/ranking factor, (C) informational only, or (D) not applicable. Add
per-program configuration for rule type and weighting. Do **not** hard-code a
global credit-score or time-in-business penalty.

The client's worked example: owner FICO can be *collected* on a factoring lead
but must not suppress a viable factoring match, because that program
underwrites receivables and account-debtor quality. The same FICO is material
for unsecured/startup credit.

**Priority 2 — keep prequal light.** It answers *"is there a plausible path,
and which family should FLS review first?"* — not enough for a lender
approval. Only add a prequal question if its answer can change the family,
match state, lender route, or next step. Financials, tax returns, debt
schedules and transaction documents belong after account creation.

**Match states** — four customer-facing outcomes, and borderline cases must
not become false approvals or hard declines: `Strong Match`, `Potential
Match`, `Specialist Review`, `No Current Match`. The last must explain that
FLS cannot identify a path *from the information provided* — never imply the
borrower is unfinanceable.

**Per-product changes** are specified in detail in the docx for all nine
branches (working capital, equipment, CRE, fix & flip, acquisition, factoring,
debt refinance, startup, "I'm not sure"). Read it directly rather than working
from a summary — it names specific fields to add, fields to move to the
application, and document-checklist corrections, including items the client
marked "Missing".

Note the client wrote that punch list with inline annotations in places
(e.g. *"Please check for me I do not have another email to use"*, *"Missing"*,
*"Disregard"*). Treat ambiguous annotations as questions for the user, not as
instructions to guess at.

### 6.3 Mobile — the site is not acceptable on a phone

The user's words: *"it looks shit on mobile right now. scroll animations don't
work, cropping incorrect at some areas."* This is a priority, not polish.

**I measured these at 375×812 before writing this brief, so start from facts
rather than re-deriving them.** Two of the user's assumptions turned out to be
wrong, which matters — do not go fix the thing that already works.

**Verified broken:**

1. **The logo is invisible on mobile.** It renders correctly — light mark,
   `opacity: 1`, 84px wide at (32, 32). The problem is what is *behind* it.
   The mobile crop (below) puts **sky** behind the header where the desktop
   crop puts buildings, so a white mark sits on pale grey. The drop-shadow and
   top scrim added for desktop are not enough against sky. Fix the contrast at
   mobile widths specifically — a stronger scrim, a different crop, or the
   dark mark.

2. **There is no way to sign in on a phone.** "Sign in" is `hidden sm:inline`
   in `site-chrome.tsx`, so below 640px it is `display: none`. The header
   offers only "Get Your Free Quote". A returning client on a phone — the
   most likely mobile visitor, since the portal is where they track their file
   — has no entry point. This is a functional gap, not a styling one.

3. **The hero video is ~76% cropped horizontally.** Source is 1600×900 (16:9),
   displayed in a 351×822 box with `object-fit: cover`. To cover that height
   the frame scales to ~1461px wide, of which only 351px is visible. Roughly
   three-quarters of the shot is thrown away, and `object-position: 50% 68%`
   was tuned for desktop (to show street level). On a phone it lands on a
   narrow vertical slice of two towers. Consider a separate mobile crop
   position, a shorter hero, or a portrait-oriented source.

4. **Hero content is cramped.** The hero is 822px tall on an 812px viewport.
   The description runs seven lines, pushing the $20M card and both CTAs down,
   with "Scroll to explore" pinned at the very bottom edge. Also the CTA
   appears twice within one screen (header + hero), which is redundant in that
   space.

**Verified NOT broken — do not "fix" these:**

5. **Scroll reveal animations work fine on mobile.** I scrolled the full page
   and checked all 10 `Reveal` wrappers; none were stuck invisible. The one
   element at `opacity: 0` is the header backdrop bar, which is correct.

6. **No horizontal overflow.** `scrollWidth === clientWidth === 375`. The very
   wide elements in the DOM (marquee track at 10080px) are inside
   `overflow-hidden` containers, which is the intended design.

**The actual "scroll animations don't work" complaint is almost certainly
this:** the How It Works pinned scroll-deck is gated on `(min-width: 80rem)
and (min-height: 44rem)`, so on mobile it renders the plain stacked fallback.
The signature animation is simply absent. That is by design — the component's
comment explains that pinning is measured against viewport height and mobile
browser chrome resizes the viewport mid-scroll, which makes the maths jitter.

So the decision to make is a product one, and worth asking the user rather
than guessing: accept the stacked fallback on phones, or design a *different*
mobile treatment for that section (a horizontal swipe, or a simpler
step-by-step reveal) that does not depend on pinning.

**Also still unchecked:** the client portal (`/dashboard`) and the prequal
flow on mobile. The portal is the surface real clients will use on a phone
most often, and no one has looked at it at 375px. The admin console is
desktop-only by intent and is not a priority.

### 6.3 Carried over from earlier, still open
- **"Conditionally approved" has no manual-marking control.** The admin box
  counts `countered` lender submissions correctly, but Robert cannot set one
  by hand. This is the one capability from his original admin list that is not
  built. Needs a write path on the application detail page.
- **Pipeline sub-nav** — designed, unbuilt. Decision pending from the user:
  no counts (free) / cached counts (~30s stale) / live counts (7 queries per
  admin page, since `loadLeadSummaries` is expensive).
- **Pipeline has no default filter** — opens showing all files.
- **How It Works animation** — gated on `(min-width: 80rem) and (min-height:
  44rem) and (prefers-reduced-motion: no-preference)`. Erik reported it not
  working; the likely cause is viewport *height* just under 704px on a laptop,
  not a bug. Unconfirmed with him.

---

## 7. Repo cleanup for public showcase

The user wants this repo presentable for a public GitHub showcase and their
résumé. **Several items here need a human decision before you act — flag them,
do not quietly delete.**

### Safe and clearly needed
- **There is no `README.md`.** This is the single biggest gap. Write one:
  what the product is, the architecture, the stack, notable engineering
  decisions, screenshots. This is the file a reviewer actually reads.
- **Internal handoff clutter at root** — `FOR_KAI.md`,
  `FOR_KAI_MIGRATIONS.md`, `KAI_BRANCH_SYNC.md`, `KAI_TODO.md`,
  `docs/PR12_HANDOFF.md`. Move to a `docs/internal/` folder or delete.
- **`Financial_Lending_Specialists_Platform_README.md`** (1,691 lines) is the
  platform spec with a confusing name. Rename and move under `docs/`.
- `.DS_Store` is untracked but present — ensure it is in `.gitignore`.

### Needs the user's decision — do not act unilaterally
- **`Brochures/` contains third-party lender material**, including
  `Equipment Finance Pricing.pdf` and `CRE price quoting.pdf`. These are other
  companies' documents and include pricing. Publishing them is plausibly a
  confidentiality or copyright problem and they are not source code. Recommend
  removing from the repo entirely.
- **`docs/BUSINESS_CONTEXT.md`** is explicitly internal. It names Robert as
  Kai's cousin, describes the engagement as pro-bono, and characterises his
  business candidly ("rents his leads and runs his whole business by hand").
  Publishing it would expose a real person's business situation. Recommend
  removing or heavily redacting.
- **Deleting a file does not remove it from git history.** If any of the above
  must not be public, the repo needs history rewriting (`git filter-repo`) or
  a fresh repository with a clean initial commit. Deleting and committing is
  **not** sufficient. Raise this explicitly.
- **The repo appears to already be public** under `erikvilla1/Finance_Service`.
  If so, the lender brochures and business-context doc are already exposed and
  that is worth telling the user now rather than treating it as hypothetical.
- **`public/brand/robert.jpg` is 9 MB** — oversized for web. It can be
  compressed, but note a standing instruction: **never resize or recrop
  Robert's photo** in the Who We Are card. Optimise file size only; do not
  change framing or dimensions.

---

## 8. Working agreement

- **Verify before asserting.** This project has repeatedly produced situations
  where the obvious explanation was wrong — a "stale deploy" that was actually
  a prerender difference, a "broken button" that was a 5.8-second server
  action, a "missing header" that was a stale dev-server bundle. Check the
  actual state rather than reasoning from what should be true.
- **Say what you could not verify.** Auth-gated screens, anything requiring a
  deploy, anything needing a credential. Do not imply coverage you do not have.
- **Prefer the smaller correct change.** Several large refactors in this
  codebase were reverted for being more than the problem required.
- **Ask when the client's instruction and correctness conflict.** This has come
  up for real: relabelling "Decided" to "Approved" was requested, but that
  bucket contained approved *and* declined, so the rename would have filed
  every declined deal under a heading saying the opposite. Splitting the two
  was what the request actually wanted. Say so rather than complying literally.
