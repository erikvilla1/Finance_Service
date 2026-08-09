# Auth and email confirmation

How account creation works, and exactly what has to be true in the Supabase
dashboard for it to work in production. The code is finished; the remaining
items here are configuration, not development.

---

## The funnel

```
/start                        pick a goal
/start/prequal                answer the questions        → applications row, profile_id NULL
/start/result/[public_token]  see indicative options
                              "Start Application Now"
/create-account?application=  email + password            → auth.users row, application claimed
/auth/confirm                 exchange the email link for a session
/dashboard                    status + document checklist
```

The account wall sits **after** the estimate, never before. The estimate is what
earns the account — asking someone to register before they know whether it was
worth their time is how a lead-capture form gets abandoned
(`docs/BUSINESS_CONTEXT.md` §2).

---

## Claiming an anonymous application

Prequal applications are written with `profile_id` null, because no account
exists at that point. The RLS policy `users update own draft applications` has
`profile_id = auth.uid()` in its `USING` clause, so a null-profile row matches
no user and **cannot be claimed by the very person it belongs to**.

`src/lib/applications/claim.ts` therefore runs on the service role.
Authorization is possession of `public_token` — the unguessable uuid from
migration 0009, only ever handed to the person who submitted the form. This is
the same trust model the result page already runs on.

Do not "fix" this by loosening the RLS policy to allow `profile_id is null` in
`USING`. That would let any authenticated user claim any unclaimed application.

The claim is a single `UPDATE ... WHERE public_token = ? AND profile_id IS NULL`,
so two simultaneous claims cannot both succeed, and an already-claimed token is
refused rather than reassigned.

---

## Email confirmation

**Confirmation is the intended production behaviour.** It is currently switched
off only so the funnel can be tested without fighting the send limit. The code
handles both states with no changes required — `signUp` always passes
`emailRedirectTo`, and the action redirects to `/create-account/check-your-email`
when no session comes back.

The application is claimed at **signup**, not at confirmation, so it is already
waiting for the applicant whenever they confirm.

### `/auth/confirm` handles two link shapes

| Shape | Produced by | Works across devices |
|---|---|---|
| `token_hash` + `type` | template using `{{ .TokenHash }}` | **Yes** |
| `code` | default template (PKCE) | No — same browser only |

PKCE needs the code-verifier cookie written at signup, so it fails when someone
fills in the form on a laptop and opens the email on their phone. That is common
enough to matter. Both are supported, but switch the template before launch.

---

## Before launch

- [ ] **Custom SMTP.** Authentication → Emails → SMTP Settings. The built-in
      sender does **2 messages per hour** and Supabase documents it as being for
      demonstration purposes only. Custom SMTP raises this to 30/hour.
- [ ] **Turn "Confirm email" back on.** Authentication → Sign In / Providers →
      Email. It is currently OFF for testing.
- [ ] **Switch the confirm-signup template** to the cross-device form.
      Authentication → Emails → Confirm signup:
      ```html
      <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard">
        Confirm your email
      </a>
      ```
- [ ] **URL Configuration.** Site URL and the redirect allow-list must contain
      the production domain. Keep `http://localhost:3000` for development.
- [ ] **`NEXT_PUBLIC_SITE_URL`** must be the production URL in the deployed
      environment. `/auth/confirm` prefers it over the request origin so a
      rewritten host cannot redirect an applicant somewhere unintended.
- [ ] **MFA for staff.** Platform spec §22. Password-only is not sufficient for
      internal users and this is still outstanding — see `src/app/sign-in/actions.ts`.
- [ ] **Password policy.** The 8-character floor in
      `create-account/actions.ts` is a minimum, not a policy. Add breach-list
      checking (Supabase supports HIBP under Authentication → Attack Protection).

---

## Where this stops

This work covers the pipeline **up to** the dashboard, not the dashboard itself.
`src/app/(portal)/dashboard/page.tsx` is untouched and remains the scaffold —
Erik is building the checklist UI and status tracker on his own branch.

### What the dashboard can rely on

By the time an applicant lands on `/dashboard`:

- `applications.profile_id` is set, so RLS lets them read their own row.
- `document_requests` is already populated for that application — one row per
  required document for their track, status `requested`. Seeded by
  `claimApplication()`, sourced from `document_type_definitions`.
- `qualification_results` has their engine output from the prequal step.

**The seeding lives in `src/lib/applications/claim.ts` and nowhere else.** If a
second seeding path appears, the unique constraint on
`(application_id, document_type_key)` will stop rows duplicating, but there will
be two sources of truth for what an applicant is asked for. Read from
`document_requests`; do not re-derive the checklist from
`document_type_definitions` at render time, or a specialist's edits to a
request will be invisible.

### Uploads — built

All three items previously listed here as missing exist. The storage object
policies were in `0005` all along (four of them, keyed on the first path
segment of the object name); signed-URL generation is
`src/lib/documents/links.ts`; the `documents` row write is the `recordUpload`
action under `(portal)/dashboard/[applicationId]/documents`.

The file goes **browser → storage directly**, not through a Server Action.
Action bodies cap at 1MB and the bucket accepts 25MB, so the alternative was
streaming bank statements through the Next server or rejecting most real
documents. The action records the row afterwards.

`document_requests.status` is **derived, not written**. Migration `0021`
recomputes it from the documents attached to the request. Nothing in the
application should set that column by hand — the one exception is waiving,
which is a decision about the request rather than a fact about any document.

### Still outstanding

- **Notification email.** Nothing tells the applicant a document was requested,
  and nothing tells a specialist one arrived. Today an upload is silent.
  `RESEND_API_KEY` is a commented placeholder in `.env.example`; there is no
  send path anywhere in the code. Separate from Supabase's auth mail above.
- **E-signature.** `signed_application` is currently an ordinary checklist row
  — print, sign, scan, upload. BUSINESS_CONTEXT §8 notes Robert already pays
  for PandaDoc, which makes it the cheap choice over DocuSign when this is
  built.
