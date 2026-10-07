# Questions for Kai

Written during the unattended session of 2026-10-07. Each item is something I
could not resolve without a business fact, a product decision, or a file I do
not have. Nothing here is blocking the rest of the work — I kept going on what
was unambiguous.

Ordered by how much it costs to leave unanswered.

---

## 1. BLOCKING — the two client docx files never reached me

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

## 2. `/how-it-works` is a second How It Works page with different copy

Found while diagnosing why Robert could not see the "Eight quick questions"
sentence (front-end item 2).

There are two surfaces:

| Surface | Source | Steps | Step 02 |
|---|---|---|---|
| Home `/#how-it-works` | `PROCESS_STEPS` in `(marketing)/page.tsx` | 8 | the sentence the client asked about |
| Standalone `/how-it-works` | `STEPS` in `(marketing)/how-it-works/page.tsx` | 5 | different copy; the phrase is absent |

The standalone route is linked from nothing in `src/`, but it is prerendered,
has its own `<title>`/description, and is indexable — so it is reachable by
typing the URL, an old bookmark, or a search result. The brief notes those
standalone routes were kept deliberately because they are indexable and
deep-linkable.

I changed only the home page's step 02, which is what the client asked for. I
did not touch the standalone page, because two divergent narratives of the same
process is a content decision rather than a bug fix.

**Which do you want?**

- (a) Leave both. Accept that the two tell a different story.
- (b) Redirect `/how-it-works` → `/#how-it-works`. Cleanest for SEO and
      removes the confusion, but breaks the deep-link the brief wanted kept.
- (c) Align the standalone page's copy to the home page's eight steps.
- (d) Keep it but make it clearly a different, longer-form page.

My recommendation is (b) or (c). This is also a decent candidate for the actual
cause of the client's confusion, so it is worth answering before you reply to
him.

---

## 3. The $20M caption now states the figure twice

Front-end item 3 asked for `"Available in loans"` → `"Financing solutions up to
$20M+"`. I implemented that exact wording. The card now reads:

```
$20M+                              <- the animated counter
Financing solutions up to $20M+    <- the new caption
```

The claim correction is right and I would not undo it — "available in loans"
implies FLS holds money to lend, which is wrong for a broker. But the figure
appearing twice in one small card will read as a mistake to anyone who sees it.

I kept the client's literal words rather than paraphrasing, because the figure
is still awaiting Robert's sign-off and inventing a third version mid-review
seemed worse. **Pick one:**

- (a) Leave as-is (client's exact wording).
- (b) Caption → `"In financing solutions"`. Reads cleanly, but it is a
      *volume arranged* claim, which is a different and also unverified one.
      I would not ship this without Robert confirming it.
- (c) Swap the order inside the card: caption `"Financing solutions up to"`
      above the number `$20M+`. Uses the client's words, reads correctly,
      states the figure once. Small layout change. **My recommendation.**

---

## 4. Should How It Works get a purpose-built mobile treatment?

The brief asks this explicitly, so I am not guessing at it.

The pinned scroll-deck is gated on `(min-width: 80rem) and (min-height: 44rem)
and (prefers-reduced-motion: no-preference)`, so phones get the plain stacked
fallback and the signature animation is simply absent. The component's own
comment explains why pinning is off on mobile: it is measured against viewport
height, and mobile browser chrome resizes the viewport mid-scroll, which makes
the maths jitter. That reasoning is sound and I did not touch it.

**Options:**

- (a) Accept the stacked fallback on phones. Zero risk, zero work.
- (b) Build a different mobile treatment that does not depend on pinning — a
      horizontal swipe through the steps, or a simpler step-by-step reveal.

(b) is real work and a product call about whether the signature moment matters
enough on mobile to be worth a second implementation. I have not started it.

---

## 5. Business facts I will not invent

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

