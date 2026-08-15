# Schema snapshot — 2026-08-14

What the live database looked like at a known-good moment, recorded before an
unsupervised working session.

**This is not a backup.** It restores nothing. What it does is let you answer
"what changed?" tomorrow without relying on anyone's memory — regenerate it,
diff against this file, and any line that appears or disappears is a schema
change. A schema change with no migration file is drift, which is the thing that
has gone wrong twice.

At the time of writing: **23 tables, 328 columns, 52 policies, 14 functions,
23 triggers, 30 migrations applied**, latest `20260814064643` (`0030`).

**Next free migration number: 0031.**

## Regenerating it

Supabase dashboard → SQL Editor:

```sql
select string_agg(line, E'\n' order by sort_key, line)
from (
  select 1 as sort_key,
         table_name || '.' || column_name || ' :: ' || data_type ||
         case when is_nullable = 'NO' then ' NOT NULL' else '' end as line
    from information_schema.columns where table_schema = 'public'
  union all
  select 2, 'POLICY ' || tablename || ' :: ' || policyname || ' :: ' || cmd
    from pg_policies where schemaname = 'public'
  union all
  select 3, 'FUNCTION ' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
  union all
  select 4, 'TRIGGER ' || c.relname || ' :: ' || t.tgname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and not t.tgisinternal
) rows;
```

And to check the repo against the database:

```bash
ls supabase/migrations/          # what the repo thinks exists
npx supabase migration list      # what the database has run
```

---

## Snapshot

```
POLICY application_answers :: users read own answers :: SELECT
POLICY application_answers :: users update own answers :: UPDATE
POLICY application_answers :: users write own answers :: INSERT
POLICY application_owners :: users read own guarantor records :: SELECT
POLICY application_owners :: users update own guarantor records :: UPDATE
POLICY application_owners :: users write own guarantor records :: INSERT
POLICY application_questions :: active questions are publicly readable :: SELECT
POLICY application_questions :: admins manage questions :: ALL
POLICY application_status_history :: staff read status history :: SELECT
POLICY applications :: users create own applications :: INSERT
POLICY applications :: users read own applications :: SELECT
POLICY applications :: users update own editable applications :: UPDATE
POLICY audit_logs :: admins read audit logs :: SELECT
POLICY business_assets :: users read own assets :: SELECT
POLICY business_assets :: users update own assets :: UPDATE
POLICY business_assets :: users write own assets :: INSERT
POLICY businesses :: users insert own businesses :: INSERT
POLICY businesses :: users read own businesses :: SELECT
POLICY businesses :: users update own businesses :: UPDATE
POLICY consents :: users read own consents :: SELECT
POLICY consents :: users record own consents :: INSERT
POLICY contact_submissions :: staff read contact submissions :: SELECT
POLICY contact_submissions :: staff update contact submissions :: UPDATE
POLICY crm_notes :: authors edit own notes :: UPDATE
POLICY crm_notes :: staff read notes :: SELECT
POLICY crm_notes :: staff write notes :: INSERT
POLICY crm_tasks :: staff manage tasks :: ALL
POLICY document_requests :: staff manage document requests :: ALL
POLICY document_requests :: users read own document requests :: SELECT
POLICY document_type_definitions :: admins manage document definitions :: ALL
POLICY document_type_definitions :: document definitions are publicly readable :: SELECT
POLICY documents :: staff update documents :: UPDATE
POLICY documents :: users read own documents :: SELECT
POLICY documents :: users upload own documents :: INSERT
POLICY existing_debts :: users delete own debts :: DELETE
POLICY existing_debts :: users read own debts :: SELECT
POLICY existing_debts :: users update own debts :: UPDATE
POLICY existing_debts :: users write own debts :: INSERT
POLICY financing_products :: admins manage products :: ALL
POLICY financing_products :: published products are publicly readable :: SELECT
POLICY product_categories :: admins manage categories :: ALL
POLICY product_categories :: categories are publicly readable when active :: SELECT
POLICY profiles :: admins manage profiles :: ALL
POLICY profiles :: users read own profile :: SELECT
POLICY profiles :: users update own profile :: UPDATE
POLICY qualification_results :: users read own qualification results :: SELECT
POLICY qualification_rulesets :: admins manage qualification rulesets :: ALL
POLICY qualification_rulesets :: staff read qualification rulesets :: SELECT
POLICY question_options :: admins manage question options :: ALL
POLICY question_options :: question options are publicly readable :: SELECT
POLICY question_rules :: active question rules are publicly readable :: SELECT
POLICY question_rules :: admins manage question rules :: ALL

FUNCTION current_user_role()
FUNCTION customer_may_edit(status application_status)
FUNCTION derive_credit_band()
FUNCTION generate_application_reference()
FUNCTION guard_customer_application_fields()
FUNCTION handle_new_user()
FUNCTION is_admin()
FUNCTION is_staff()
FUNCTION prevent_role_escalation()
FUNCTION record_status_change()
FUNCTION refresh_document_request_status(request_id uuid)
FUNCTION set_updated_at()
FUNCTION sync_document_request_status()
FUNCTION withdraw_document(document_id uuid)

TRIGGER application_answers :: set_updated_at
TRIGGER application_owners :: set_updated_at
TRIGGER application_questions :: set_updated_at
TRIGGER applications :: guard_customer_application_fields
TRIGGER applications :: keep_credit_band_in_sync
TRIGGER applications :: set_updated_at
TRIGGER applications :: track_status_changes
TRIGGER business_assets :: set_updated_at
TRIGGER businesses :: set_updated_at
TRIGGER contact_submissions :: set_contact_submissions_updated_at
TRIGGER crm_notes :: set_updated_at
TRIGGER crm_tasks :: set_updated_at
TRIGGER document_requests :: set_updated_at
TRIGGER document_type_definitions :: set_updated_at
TRIGGER documents :: set_updated_at
TRIGGER documents :: sync_document_request_status
TRIGGER existing_debts :: set_updated_at
TRIGGER financing_products :: set_updated_at
TRIGGER product_categories :: set_updated_at
TRIGGER profiles :: guard_role_changes
TRIGGER profiles :: set_updated_at
TRIGGER qualification_rulesets :: set_updated_at
TRIGGER question_rules :: set_updated_at
```

## The four that protect data, and why they matter

If any of these disappear, something is wrong regardless of what else changed.

- `applications :: guard_customer_application_fields` — keeps status, owner,
  assignee and the signature release out of a customer's reach. RLS grants a
  row, never a column, so without this an applicant can march their own file
  through the pipeline.
- `profiles :: guard_role_changes` — stops anyone making themselves an admin.
- `documents :: sync_document_request_status` — the checklist is derived from
  this. Drop it and every request freezes at whatever it last said.
- `customer_may_edit(status)` — the window in which an applicant may edit their
  own file. Referenced by nine policies; changing it changes all of them.
