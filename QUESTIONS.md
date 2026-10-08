# Questions for Kai

Written during the unattended session of 2026-10-07. Each item is something I
could not resolve without a business fact, a product decision, or a file I do
not have. Nothing here blocked the rest of the work — I kept going on what was
unambiguous.

Ordered by urgency, not by size.

---

## 1. URGENT — the repository is public *right now*, with other people's material in it

The brief said the repo "appears to already be public" and treated the
consequences as hypothetical. **I checked the GitHub API and it is public**:
`"private": false`, `"visibility": "public"`, 0 forks, homepage pointing at
www.flscapitaladvisors.com.

So these are not future risks, they are current exposures:

- **`Brochures/` — 34 tracked files of third-party lender material**, including
  `Equipment Finance Pricing.pdf` and `CRE price quoting.pdf`. Other companies'
  documents, with pricing, published under your name. This is the one I would
  act on first.
- **`docs/BUSINESS_CONTEXT.md`** — names Robert as your cousin, describes the
  engagement as pro-bono, and characterises his business candidly ("rents his
  leads and runs his whole business by hand"). That is a real person's business
  situation, publicly readable.
- **`docs/internal/PR12_HANDOFF.md:168`** states that Supabase leaked-password
  protection is **off** and the minimum password length is **6**. That is a live
  auth weakness documented publicly for anyone who looks. Worth fixing in the
  Supabase dashboard regardless of what you do with the file.

**Deleting these does not make them private.** They are in the git history of a
public repository, and anyone can fetch history. Actually removing them needs
either `git filter-repo` and a force-push, or a fresh repository with a clean
initial commit. I have not touched any of them — the brief says they need your
decision, and deleting would have given you the *appearance* of a fix without
the fact of one.

My recommendation, in order: make the repo private today; decide what must go;
rewrite history or start a clean repo; make it public again when it holds only
your own work.

---

## 2. `public/brand/robert.jpg` is a professional photographer's copyrighted work

Found while measuring whether the 9MB file could be compressed. Its EXIF says:

```
Artist     : Shane Karns
Copyright  : Shane Karns INC. / shanekarns.com / 323.963.3713
Camera     : Canon EOS R6, 3648x5472, Lightroom Classic, 2025-03-25
```

No GPS coordinates, so no location leak. But two things follow:

1. **It is licensed work by a third party**, sitting in a public repository with
   no licence note. Whatever FLS's arrangement with the photographer is, it
   probably contemplated a website, not redistribution in a public source repo.
   Worth confirming before the repo stays public.
2. **Do not strip the EXIF when optimising it.** I was going to suggest that as
   a free saving; it is not free, because the EXIF *is* the copyright notice,
   and removing copyright management information is its own problem.

On the size itself — you said never resize or recrop, and I have not. Measured
options at identical dimensions, EXIF preserved:

| Quality | Size | vs now | Mean pixel difference |
|---|---|---|---|
| current | 9.0MB | — | — |
| q=92 | 3.3MB | 37% | 1.17/255 (PSNR 43.7dB) |
| q=88 | 2.7MB | 30% | 1.36/255 (PSNR 42.3dB) |
| q=85 | 2.3MB | 25% | 1.48/255 (PSNR 41.6dB) |

q=92 is visually lossless at this resolution and saves 5.7MB. I did not apply
it — the brief lists this file under "needs your decision".

Worth knowing: it is 3648x5472 and displays at 448x560 CSS pixels, so it is
about four times larger per axis than even a 2x screen needs. The big win is a
resize, which you have ruled out. Say the word and q=92 is a one-line change.

---

## 3. BLOCKING — the two client docx files never reached me

You referenced these in the session prompt:

- `FLS_Front_End_IWA_Review 9-29-26.docx`
- `FLS_Qualification_Engine_Deep_Dive_Punch_List_IWA.docx`

Both were given as `@"/Users/kaisaucedo/Downloads/..."` paths. This session runs
in a cloud container with no access to your Mac, so the paths resolved to
nothing. I searched the whole filesystem (including `/mnt/user-data/uploads`
and `/mnt/attach`, where attachments would land) and they are not here. When you
said you had put them in the chat, they still had not arrived.

**To get them to me, use the paperclip/attach control in the chat composer
rather than an `@` path.**

What this blocks:

- **Front-end item 11, the founder bio.** The replacement copy is in the docx.
  Robert's bio is untouched.
- **All of brief §6.2, the qualification engine.** This is the one you told me
  to read directly and not work from your summary, so I have deliberately not
  guessed at it. I did the architectural groundwork that the brief itself
  specifies in enough detail (see SESSION_LOG.md) and stopped short of the
  per-product field lists, which only the docx has.
- **The client's inline annotations** ("Missing", "Disregard", "Please check for
  me") — the brief flags these as ambiguous, and I cannot read them at all.

---

## 4. `/how-it-works` is a second How It Works page with different copy

Found while diagnosing why Robert could not see the "Eight quick questions"
sentence (front-end item 2).

| Surface | Source | Steps | Step 02 |
|---|---|---|---|
| Home `/#how-it-works` | `PROCESS_STEPS` in `(marketing)/page.tsx` | 8 | the sentence the client asked about |
| Standalone `/how-it-works` | `STEPS` in `(marketing)/how-it-works/page.tsx` | 5 | different copy; the phrase is absent |

The standalone route is linked from nothing in `src/`, but it is prerendered,
has its own title and description, and is indexable — reachable by typing the
URL, an old bookmark, or a search result.

I changed only the home page's step 02, which is what the client asked for. Two
divergent accounts of the same process is a content decision, not a bug fix.

- (a) Leave both, and accept that they tell a different story.
- (b) Redirect `/how-it-works` → `/#how-it-works`. Cleanest for SEO; breaks the
      deep link the brief wanted kept.
- (c) Align the standalone page's copy to the home page's eight steps.
- (d) Keep it, but make it clearly a different, longer-form page.

I'd suggest (b) or (c). This is also a plausible cause of the client's
confusion, so worth settling before you reply to him.

---

## 5. The $20M stat — I did not comply literally, and you should check I was right

Item 3 asked for `"Available in loans"` → `"Financing solutions up to $20M+"`.
I implemented that wording but **moved it above the number instead of below**,
so the card reads:

```
Financing solutions up to
$20M+
```

Taken literally — caption under the animated number, as it was — the card
rendered `$20M+` directly above `Financing solutions up to $20M+`. The same
figure twice in one small box reads as a bug. I only saw how bad it looked once
I had a screenshot, which is why this changed mid-session.

Your instructions say to do what was actually wanted and explain, rather than
comply literally, so that is what I did: the claim correction is the point
("available in loans" says FLS holds money to lend, which is wrong for a
broker), and the reordering preserves the client's exact words while stating
the figure once. **If you'd rather have the literal version, it is a two-line
swap** and the reasoning is in the code comment.

---

## 6. Should How It Works get a purpose-built mobile treatment?

The brief asks this explicitly, so I am not guessing.

The pinned scroll-deck is gated on `(min-width: 80rem) and (min-height: 44rem)
and (prefers-reduced-motion: no-preference)`, so phones get the stacked
fallback and the signature animation is simply absent. The component's comment
explains why: pinning is measured against viewport height, and mobile browser
chrome resizes the viewport mid-scroll, which makes the maths jitter. That
reasoning is sound and I did not touch it.

- (a) Accept the stacked fallback on phones. No work, no risk.
- (b) Build a different mobile treatment that does not depend on pinning — a
      horizontal swipe, or a simpler step-by-step reveal.

(b) is real work and a product call about whether the signature moment matters
enough on mobile to justify a second implementation. Not started.

---

## 7. Things I could not verify, and want an eyeball on

**The mobile logo (mobile item 1) — I could not reproduce "invisible".** This
Chromium has no H.264 decoder, so the hero video never rendered locally and I
could not look at it. I measured it from the footage instead: 20 frames via
ffmpeg, the real mobile and desktop cover crops from the geometry the browser
reports, compositing the main gradient and top scrim at their actual alphas,
WCAG contrast against the white mark.

| | mean-luminance worst | brightest-local worst |
|---|---|---|
| mobile | 6.90:1 | 5.98:1 |
| desktop | 8.50:1 | 4.93:1 |

The mobile crop does sit on brighter material, as the brief says — raw
luminance behind the logo peaks at 0.559 against desktop's 0.306. But 5.98:1
clears WCAG AA, and against the brightest local pixels desktop is the *worse*
of the two. So I did not dim the hero on phones: the premise for it is not
there, and the existing comment argues specifically against dimming the shot to
fix a strip of it.

**If it still looks wrong to you on a real device, send me a screenshot.** The
fix is one line, and I measured what each scrim value buys (worst-case
contrast): `/60 /25` today → 6.90:1; `/75 /40` → 8.92:1; `/85 /50` → 10.59:1;
`/90 /60` → 11.96:1.

**The client portal — I could not open it.** `/dashboard` redirects to
`/sign-in` and no agent has credentials. I audited it statically and fixed one
real issue (the status track's first label truncated to "Your applic..." at
375px — the arithmetic and the text widths are measured, the result is not).
Everything else in the portal looked sound on inspection, but nobody has
actually viewed that screen on a phone.

**The production site's trackers (item 9) — half answered.** The code in this
repo is verifiably clean: across 11 public pages a real browser contacted zero
third-party hosts, set zero cookies, and left localStorage and sessionStorage
empty, and there is no analytics SDK anywhere in `src/`. But item 9 asks about
the *deployed* site, and this environment's network policy blocked
www.flscapitaladvisors.com, so I could not check it. That matters because
Vercel can inject its own analytics from the dashboard without appearing in
`src/` at all — worth confirming that is off, since the Privacy Policy claims
no advertising or analytics trackers.

---

## 8. The hero still overflows short phones

Fixed at 375x812 (865px → 788px, now exactly its intended `100dvh - 24px`), and
it fits at 390x844 and 414x896. It still exceeds the fold on short viewports:
846px at 320x568, 782px at 360x740.

Closing the rest means cutting content, not spacing — the ghost "How It Works"
button, or shortening the hero description. Both are design calls, so I left
them.

---

## 9. Business facts I will not invent

None of these are in the repo, and the brief is explicit that inventing them is
worse than leaving the gap visible. All still bracketed `[CONFIRM]`:

- Business mailing address
- Phone number — the source materials list **two different numbers**, which is
  why none is published
- Contact email
- Licensing / state licence numbers — a section was removed rather than filled,
  deliberately. I did not re-add it.
- **Whether FLS actually has $20M+ network capability.** The figure sits inside
  the catalog's stated maxima, but every one of those rows is
  `terms_verified = false`, meaning nobody has confirmed them with a lender.
  This is a public financial claim resting on unconfirmed data.

---

## 10. Minor — `AGENT_BRIEF.md` is at the root of a public portfolio repo

Not sensitive, but candid: it records the two junk prequal rows sitting in the
live pipeline, that Vercel will not build your commits, and internal process
detail. For a repo you are showing to employers, it reads as someone's desk
rather than a project. I left it where it is because you put it there
deliberately for agent sessions — moving it to `docs/internal/` is a one-liner
if you'd rather.

---

# Added 2026-10-08

## 11. Migrations — applied to production on 2026-10-08

Done through the Supabase connector you attached: `0035`, `0036`, and `0034`
(the Working Capital rename, on main since before this session but never
run on production). The migration history on the project now matches the
repository, 0001 through 0036. Nothing left to paste.

## 12. "Lend" → "fund" went into the Terms and the Disclosures

You said switch everywhere, so Terms §2 now reads "We do not fund loans"
and §3 "not a commitment to fund"; Disclosures and every disclaimer line
match. "Lender" as the word for the third party stayed — "lender review",
"lender underwriting" — because those describe someone else, and the note
was about the verb. The front-end docx item 10 already has counsel reading
the legal pages before launch; add this change to what they read.

## 13. 360's deposit-to-cost ratio now reads monthly revenue

Robert's deposits-as-a-count decision removed the dollar deposits figure
the equipment branch used for 360's "organic monthly deposits ÷ equipment
cost" rules (40% / 85%). The branch now asks average monthly revenue and
the ratio reads that. For the businesses this serves it is the same number
within noise, and the rule text says so, but it is Robert's lender rule and
he should confirm he is happy with revenue standing in for deposits there.

## 14. "Debt schedule … filled out thru email" — I did not build an email for it

The Notion line is "Business Debt Schedule is optional — if they do put in
application that they have debt, have it trigger based on the prequal
question and filled out thru email." I made it optional and triggered by
the prequal (an existing balance or an advance among the debt types) or by
the financials section. I did not read "thru email" confidently: it could
mean the schedule is collected on the signed document, or that a reminder
email asks for it. Neither is built. Tell me which and it is a small change.

## 15. Who unlocks signing — decided and built (10-08)

You asked where the applicant's button was, so it exists now: once every
section of the application is complete, the dashboard's "Your next step"
card and the application overview show **Sign now**. Pressing it releases
the application for signature, sends the ready-to-sign email with the link,
and opens the signing page, where the full SSN is typed onto the document
and never stored. The specialist's review moves to the signed document: it
lands on the checklist like any other, and a copy with a problem is
returned with a reason, which reopens signing. The specialist's own
"Request signature" button still works for files that need it.

One consequence to know about: if a specialist withdraws a signature
request after the applicant pressed the button, the button comes back and
the applicant can press it again. If that matters, say so and I will make
a withdrawal stick.

## 16. Three admin things Robert asked about

**"0 conditionally approved or countered."** It counts lender submissions
whose status is `countered`: a lender came back with an offer that is not
the one asked for (a different amount, term or structure). They need Robert
to accept or decline on the file before they move. Zero means no lender has
countered anything.

**"What needs you" vs "Where files sit."** The first list is the queue —
files with something waiting on Robert (a document to review, a signature
to request, an offer to answer). The second is the whole pipeline by stage,
whether or not any of it needs him today. One is a to-do list; the other is
a map.

**The `.txt` in the lender package.** It was a manifest — what was enclosed,
what was missing, what is collected at signing — put there so a funder
could see a debt schedule was waived rather than lost. It is gone. The same
facts are on the admin page the download comes from.

## 17. The test-data reset has to be run from the SQL editor

The Supabase connector attached to this session holds every `delete` for
a confirmation it never gets here, so each attempt timed out and nothing
was removed (verified by counting after each one). Run this in the
dashboard's SQL Editor; it clears the pre-launch test data and keeps the
configuration (products, questions, lenders, rulesets, document types) and
the new admin login:

```sql
delete from storage.objects where bucket_id = 'application-documents';
delete from public.applications;
delete from public.businesses;
delete from public.contact_submissions;
delete from public.audit_logs;
delete from auth.users where email <> 'admin@flscapitaladvisors.com';
```

Deleting `storage.objects` rows by SQL leaves the file bytes orphaned in
the bucket; to remove those too, open Storage → `application-documents`,
select all, delete, before or after the SQL. Everything else cascades:
answers, owners, documents, requests, results, debts, notes, tasks,
consents, submissions, and the profiles of the deleted users.
