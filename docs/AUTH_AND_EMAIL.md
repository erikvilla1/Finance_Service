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

### Notification email — built

`src/lib/email/send.ts` sends through Resend (`RESEND_API_KEY`), with a
development safety catch (`EMAIL_REDIRECT_TO`) that reroutes every message to
one address. `src/lib/email/notifications.ts` holds the four messages worth
sending: the application is ready to sign, a document came back with a reason,
everything asked for has been accepted, and one staff alert for anything that
needs a person.

Addresses, as the client named them (Notion, 09.27): replies and questions go
to `help@flscapitaladvisors.com` (the default reply-to; `EMAIL_REPLY_TO`
overrides), staff alerts go to `admin@flscapitaladvisors.com`
(`STAFF_NOTIFICATION_EMAIL` overrides). The sender stays Resend's onboarding
address until a domain is verified; see `.env.example`.

Applicant mail never carries the reference code. It is the file's name inside
the admin and in staff mail, and means nothing to the person receiving it.

### E-signature — built

`signed_application` is produced by signing, not uploading:
`/dashboard/[applicationId]/sign` draws the funding application from what the
database holds, the signer types their name, draws a mark, enters the SSN and
tax ID, and agrees to the FCRA and ESIGN consents (`src/lib/funding-application/sign.ts`).
The signed PDF becomes a `documents` row with `source = 'e_signature'` and
appears on the specialist's checklist like any other document.

The SSN and tax ID are drawn into the PDF and not kept — no column, no log.
`fields.ts` marks them `source: "signer"` and the merge payload excludes them
structurally. The full number is collected on the signed document, exactly
as the client asked, and never stored.

### Still outstanding

- **Sending domain.** Until `flscapitaladvisors.com` (or a subdomain) is
  verified in Resend, mail leaves from Resend's onboarding address and only
  reaches the account owner. Verify the domain, set `EMAIL_FROM`, remove
  `EMAIL_REDIRECT_TO`.
- **A logged chase.** "Chase documents" on the admin file is a prefilled
  `mailto:` (`src/components/admin/nudge-link.tsx`), so nothing records when a
  file was last chased. The app-sent version wants a `crm_notes` row.
