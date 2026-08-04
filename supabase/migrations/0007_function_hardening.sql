-- =============================================================================
-- 0007 — FUNCTION HARDENING
--
-- Closes the warnings raised by the Supabase security advisor after 0005.
--
-- Two distinct issues:
--   1. Mutable search_path on two functions — a caller could shadow an
--      unqualified name and change what the function resolves to.
--   2. SECURITY DEFINER functions reachable over the REST API as /rpc/<name>.
--      Trigger and default-value helpers have no business being callable
--      directly by a browser.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Pin search_path
-- -----------------------------------------------------------------------------

alter function public.set_updated_at()
  set search_path = public, pg_temp;

alter function public.generate_application_reference()
  set search_path = public, pg_temp;

-- -----------------------------------------------------------------------------
-- 2. Remove REST exposure where it is not needed
--
-- Trigger functions are invoked by the trigger mechanism with the privileges of
-- the table owner, so revoking EXECUTE from client roles does not affect them —
-- it only removes the /rpc/ endpoint.
-- -----------------------------------------------------------------------------

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prevent_role_escalation() from public, anon, authenticated;

-- Nothing calls this — policies use is_staff()/is_admin() directly. Kept for
-- future use but not exposed.
revoke execute on function public.current_user_role() from public, anon, authenticated;

-- Used as the DEFAULT for applications.reference_code, so the inserting role
-- must retain EXECUTE. Anonymous users never insert applications directly
-- (that path goes through a server action on the service role), so anon does
-- not need it.
revoke execute on function public.generate_application_reference() from public, anon;
grant execute on function public.generate_application_reference() to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Functions that remain callable, deliberately
--
-- is_staff() and is_admin() are referenced inside RLS policy expressions, which
-- are evaluated with the privileges of the calling role. Revoking EXECUTE would
-- break every policy that uses them.
--
-- Leaving them exposed is acceptable: both are zero-argument and report only on
-- the caller's own role. An anonymous caller gets false; a signed-in caller
-- learns something they already know. There is no other user's data to leak.
-- -----------------------------------------------------------------------------

comment on function public.is_staff() is
  'Callable via REST by design — required by RLS policies. Reports only on the calling user.';

comment on function public.is_admin() is
  'Callable via REST by design — required by RLS policies. Reports only on the calling user.';
