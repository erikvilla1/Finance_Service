# Session log — 2026-10-07

Unattended cloud session. Branch
`claude/fls-frontend-qualification-review-8l331c`, eight commits on top of
`e4005e0`.

**Nothing here is deployed.** Everything is pushed to the branch; Vercel has
not built any of it, and I have no way to make it. Do not read "done" as "live".

Read `QUESTIONS.md` first — item 1 is time-sensitive.

---

## The one thing to read if you read nothing else

**The repository is public right now.** I checked the GitHub API rather than
assuming: `"private": false`, `"visibility": "public"`. So `Brochures/` (34
tracked files of third-party lender material, including two pricing PDFs) and
`docs/BUSINESS_CONTEXT.md` (names Robert as your cousin, describes the
engagement as pro-bono, characterises his business candidly) are **currently
readable by anyone**, not hypothetically exposed.

I did not delete them. The brief says they need your decision, and deleting
would have given you the appearance of a fix without the fact of one — they
stay in the history of a public repo either way. `QUESTIONS.md` §1 has the
options.

Two related finds in the same area:

- `public/brand/robert.jpg` carries a **third-party photographer's copyright**
  in its EXIF (Shane Karns INC., with a phone number). That changes the
  "compress it" advice: do not strip the EXIF, because the EXIF *is* the
  copyright notice. Measured compression options are in `QUESTIONS.md` §2.
- `docs/internal/PR12_HANDOFF.md:168` publicly documents that Supabase
  leaked-password protection is off and the minimum length is 6.

---

## What I could not do, and why

**The two client docx files never arrived.** You referenced them as
`@"/Users/kaisaucedo/Downloads/..."`, which are paths on your Mac; this session
ran in a cloud container with no access to them. I searched the whole
filesystem including `/mnt/user-data/uploads` and `/mnt/attach`. When you said
you had put them in the chat they still were not there. Attach them with the
paperclip control rather than an `@` path and they will land in
`/mnt/user-data/uploads`.

That blocked:

- **Front-end item 11, the founder bio.** Untouched.
- **The per-product half of the qualification punch list** (§6.2). This is the
  one you told me to read directly rather than from your summary, so I did not
  guess at it. What I could settle from the code, I did — see below.

**I never saw `/admin/*` or `/dashboard/*`.** They redirect to `/sign-in` and
no credentials exist. One portal fix below is reasoned and measured but not
visually confirmed.

**I could not reach the production site.** This environment's network policy
refused `www.flscapitaladvisors.com` (proxy answered 403 to CONNECT), so the
deployed half of item 9 is unanswered.

**The hero video never rendered locally.** This Chromium has no H.264 decoder
(`canPlayType` returns `""`). I worked around it where it mattered by analysing
the real file with ffmpeg, but I never *looked* at the hero in a browser.

---

## Front-end punch list (brief §6.1)

| # | Item | Outcome |
|---|---|---|
| 1 | CTA wording | Done, 7 files. Mobile needs a shorter label — measured |
| 2 | How It Works step 02 | Done, plus two causes diagnosed |
| 3 | $20M stat | Done, but **not literally** — see below |
| 4 | Counter duplication | Investigated. Real, and ARIA cannot fix it. No change |
| 5 | Testimonial duplication | **Found a real a11y bug the diagnosis missed.** Fixed |
| 6 | Resource navigation | Done — breadcrumbs + related guides, 5 new tests |
| 7 | Acronym casing | Done |
| 8 | Qualification weighting | See §6.2 below |
| 9 | Privacy/tracking | Half — code verifiably clean, production unreachable |
| 10 | Final legal review | Not mine. Draft banners left in place |
| 11 | Founder bio | **Blocked** — copy is in the docx |

### 1 — CTA wording, and a measured conflict

`"Get Your Free Quote"` → `"See Your Financing Options"` in all seven files.
Comments that named the old label were updated too — four of them explain *why*
the label is what it is, so a stale quote there is a wrong explanation rather
than just an old string. Checked that the string is not baked into generated
PDFs or email copy; it is not.

**The full label does not fit the mobile header.** Below `sm` the row is logo
(92px) + "Sign in" (52px) + button, and the new label renders at 242px: that
overflows a 375px viewport by 64px, and 360px by 80px. So the header button
carries two labels — "See Options" (129px) below `sm`, the full label above —
in `display:none` halves, which stay out of innerText and so do not duplicate
the label for crawlers. Every other CTA takes the full label.

### 2 — why Robert could not find the sentence

Two separate mechanisms, both verified in a browser:

1. **There are two How It Works surfaces with different copy.** The home page
   section has eight steps; the standalone `/how-it-works` route has five
   entirely different ones and the phrase appears nowhere on it. That route is
   linked from nothing in `src/` but is prerendered and indexable.
2. **On desktop the sentence is `visibility: hidden` at rest.** Measured at
   1440×900: the pinned scroll-deck shows one step at a time, so step 02's body
   does not appear until you scroll through the deck. At 1280×680 and 375px the
   deck is gated off and the stacked fallback shows everything.

The count was also just wrong. `prequal-layout.ts` records that migration 0016
took the prequal from six questions to fifteen, so "Eight" had been stale for
several migrations — and it cannot be corrected to "fifteen" either, because
questions live in the database so Robert can edit the form without a deploy.
The client's wording is the only version that stays true.

### 3 — I did not comply literally

The requested caption, placed under the animated number as it was, rendered
`$20M+` directly above `Financing solutions up to $20M+`. I only saw how bad
that looked once I had a screenshot. The caption now sits *above* the number,
which keeps the client's exact words, states the figure once, and still does
what the request was for — "available in loans" says FLS holds money to lend,
and it is a broker. `QUESTIONS.md` §5; reverting is a two-line swap. The
`UNVERIFIED` warning on the figure is untouched.

### 4 and 5 — read together, as the brief asks

**Counter:** three layers in the DOM. `aria-hidden` on the decorative two means
screen readers read the figure once, correctly. But `innerText` contains it
**twice** — the visible animating layer and the `sr-only` one, because
`sr-only` is clip-based and stays in the text layer. The client's reading is
real and ARIA cannot fix it. No change made.

**Marquee — this one was a real bug.** The brief records that `marquee.tsx`
already marks the cloned copy `aria-hidden`, and it does. But that is only one
of two duplications: `copies` (default 2) repeats the children *within* each
half to fill a wide viewport, and that repetition was unmarked. Measured: the
testimonial "FLS helped us secure $350,000" rendered five times, four in
innerText, **two of them outside any `aria-hidden` subtree** — so a screen
reader was announcing every testimonial twice, which is the opposite of what
the file's comment claims.

Fixed with one attribute on the existing per-item wrapper. Exposed copies 2 → 1;
zero focusable elements ended up inside an `aria-hidden` subtree; track width
and overflow unchanged. The crawler count stays at 4 and cannot be lowered with
ARIA — the text must be in the DOM for the loop to be seamless.

### 6 — resource navigation

Breadcrumbs (`Home > Resources > <guide>`) replace the top "Back to Home"; the
bottom one stays, so the page keeps a second way out. "Resources" points at
`/#resources`, **not** `/resources` — there is no index route, so that would
404.

Related guides are stored as **unordered pairs with both directions derived**,
not a per-guide list: the client wrote every relation two-way, and a per-guide
list stores that twice and lets the halves drift into a silent one-way
relation. Five new tests hold symmetry, slug validity, no self-reference, and
that every guide has at least one pair. One consequence is documented because
it looks like a mistake: symmetry means the Equipment guide offers Startup.

---

## Mobile (brief §6.3)

Started from your measurements rather than re-deriving, and two of them needed
correcting.

**Sign in on a phone — fixed.** It was `hidden sm:inline`, so below 640px there
was no way into the portal at all. Now visible at every width. That addition
cost 52px and pushed 320px 6px into horizontal overflow, which the page
otherwise does not have anywhere; two gaps come in 4px below `sm` and it clears
with 2px spare. Verified no overflow at 320/360/375/390/414/640/768/1024/1440.

**Hero cramping — fixed at the reference viewport.** 865px inside an 812px
viewport, so it exceeded its own `min-h` of `calc(100dvh - 24px)` by 77px and
pushed "Scroll to explore" below the fold. Now 788px, exactly the min-height.
Three changes: `text-base` below `sm` on the description (23px — it is still
seven lines, just shorter ones), two margins (16px), and hiding the scroll cue
below `sm` (44px — on a phone it was a second link to the same anchor as the
button beside it). **Still exceeds the fold on short viewports**: 846px at
320×568, 782px at 360×740. Closing that means cutting content, which is a
design call.

**Logo contrast — I could not reproduce "invisible", and did not change it.**
The video does not decode in this browser, so I measured it from the footage:
20 frames via ffmpeg, the real mobile and desktop cover crops from the geometry
the browser reports, compositing the main gradient and top scrim at their
actual alphas, WCAG contrast against the white mark.

| | mean-luminance worst | brightest-local worst |
|---|---|---|
| mobile | 6.90:1 | 5.98:1 |
| desktop | 8.50:1 | 4.93:1 |

The mobile crop *does* sit on brighter material, as you say — raw luminance
behind the logo peaks at 0.559 against desktop's 0.306. But 5.98:1 clears WCAG
AA, and against the brightest local pixels desktop is the worse of the two. So
the premise for dimming the hero on phones is not there, and the existing
comment argues specifically against dimming the shot to fix a strip of it.

**If it still looks wrong on your device, send a screenshot** — the fix is one
line and I measured what each scrim value buys: `/60 /25` today → 6.90:1;
`/75 /40` → 8.92:1; `/85 /50` → 10.59:1; `/90 /60` → 11.96:1.

**Two corrections to the brief's hero analysis:**

- The horizontal crop is **77%**, confirming your ~76%.
- `object-position`'s vertical `68%` is **inert at every phone size**. A 351px
  box against 16:9 footage can only ever be height-limited, so there is no
  vertical overflow to position — the crop is purely a horizontal slice, and
  the top of the frame is always what sits behind the header. Worth knowing
  before anyone tunes that number to fix the logo.

**Prequal flow at 375px — clean, nothing to fix.** No horizontal overflow, no
interactive target under 44px, and every select, text and number input is 16px,
which is what stops iOS Safari zooming on focus. Seven inputs compute to 14px
but they are all checkboxes, which do not trigger that zoom — a false positive
worth recording. Note the prequal is a single page whose only button is the
terminal submit; there are no intermediate steps to drive, so there is no way
to exercise it further without writing a real row. I did not click it.

**Client portal — static audit only.** Two candidates were false alarms (the
drawer's `w-[19rem]` is capped by `max-w-[85vw]`, the skeleton's `w-[28rem]` by
`max-w-full`). One was real: the status track is four columns with no
breakpoint prefix, so at 375px each column is 68px — and rendering the labels
at `text-xs` in the real font gives "Your application" 94px against 51/57/55
for the other three. With `truncate` it read "Your applic...". Now wraps below
`sm`, truncates above. Not `grid-cols-2`, because the connector between steps
is a `flex-1` rule drawn after every step but the last and would run off the
end of each row. **The arithmetic is measured; the result is not — this wants
an eyeball.**

---

## Qualification engine (brief §6.2)

Analysis only, in `docs/QUALIFICATION_ENGINE_REVIEW.md`. No engine code changed.

**Priority 1 — "kill the single universal scorecard" — there is nothing to
kill.** `evaluateProgram()` already evaluates each program against that
program's own `hardRules`, `softRules`, `requiredInputs` and amount range. That
is the client's A/B/C/D distinction in different words. There is no global
credit or time-in-business penalty; credit is a per-program rule helper.

**The client's own worked example already holds and is already tested.** None
of the four `invoice_factoring` programs has a credit hard rule — two say so in
their notes ("Weak company credit OK with a strong debtor base", "low credit
scores OK") — and `matching/engine.test.ts:123` has asserted exactly that case
since before this session, down to the owner credit band `550_599`.

So Priority 1 is a population task, not an architecture task. If the client is
reacting to something real, the likeliest candidate is the *form*: the
universal profile asks owner credit on every branch, factoring included. Their
wording allows that, but it is what a reviewer sees.

**Priority 2 — "keep prequal light" — is testable, so I tested it.** Tracing
all 81 prequal fields through `buildFacts()` into every consumer: 21 are
consumed directly as a fact, 41 feed a derived fact, and **19 are read by
nothing at all**. They are tabulated by branch in the review doc as the place to
start reading the docx — explicitly a candidate list, not a verdict, since some
fields are collected deliberately for the specialist.

**Match states** are already the four specified, and the No Current Match copy
already attributes the outcome to the automated library rather than implying
the borrower is unfinanceable.

**One thing to settle before any engine work.** There are two engines and only
one runs. `src/lib/qualification/engine.ts` — a rules-from-the-database design
marked `ENGINE_VERSION 2.0.0-rules` — has **no importer anywhere in `src/`** and
no test. It is either the intended home for the per-program configuration the
client wants, or it is dead code that will mislead the next reader.

---

## Repo and README (brief §7)

**`README.md` written** — the brief calls it the biggest gap and the file a
reviewer actually reads, so I treated it as a deliverable. Every number in it
is checked rather than estimated: 68 lender programs (not the 100 a naive grep
gives), a 16-value status enum (not 17 — the extra came from the adjacent
`user_role` enum), 34 migrations, 25 tables, 11 guides, 36 tests.

**Six screenshots** in `docs/screenshots`, 1.1MB. Two things were needed to
make them honest: the hero video does not decode here, so a real frame is
extracted with ffmpeg and painted behind the gradient so the capture matches
what a visitor sees; and the script asserts the page is styled before saving,
because the first batch was captured against a server holding a stale `.next`
and produced six screenshots of unstyled HTML.

**Safe cleanup done:** five internal handoff docs moved to `docs/internal/`
with a README explaining what they were;
`Financial_Lending_Specialists_Platform_README.md` → `docs/PLATFORM_SPEC.md`,
with the four references to it updated rather than left dangling. `.DS_Store`
needed nothing — already gitignored and untracked.

**Not touched, needs your decision:** `Brochures/`, `docs/BUSINESS_CONTEXT.md`,
`robert.jpg`, and whether history needs rewriting. See `QUESTIONS.md` §1–2.

---

## Verification

`npm run typecheck`, `npm run lint`, `npm test`, `npm run build` were run before
every commit. Final state: typecheck clean, lint 0 errors and the 2 known
warnings (`PASSWORD_MIN_LENGTH`, `useScrolledPast`), **36/36 tests** (31 before,
5 added for the related-guides map), build compiles.

Browser work used Playwright against a **production build**, not the dev
server — the brief records two bugs that survived dev testing and only appeared
in prerendered output.

**A trap worth recording for the next session.** Three times, measurements came
back nonsense because the server was serving a stale `.next` after a rebuild —
once producing six screenshots of completely unstyled HTML. `npm run build`
invalidates the running server's chunks; it must be restarted afterwards. And
`pkill -f "next start"` kills the agent's own shell, because the pattern is in
its argv — kill by scanning `/proc` and skipping `$$`/`$PPID` instead.

---

## What is left

1. **Decide on the public-repo exposures** (`QUESTIONS.md` §1). Time-sensitive.
2. **Send the two docx files**, which unblocks the founder bio and all the
   per-product engine work.
3. **Answer the product questions**: the duplicate `/how-it-works` page, whether
   How It Works gets a purpose-built mobile treatment, and whether the $20M
   card reordering is what you wanted.
4. **Look at two things I could not see**: the portal status track on a phone,
   and the hero logo on a real device.
5. **Supply the bracketed business facts**, or decide they stay bracketed.
6. **Deploy.** Nothing here is live.
