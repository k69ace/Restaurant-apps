-- Address Supabase security-advisor warnings from 0001/0002:
--   1. Two trigger functions were missing `set search_path`, leaving them
--      vulnerable to search_path hijacking.
--   2. RLS helper functions (SECURITY DEFINER) were callable directly via
--      PostgREST RPC by the `anon` role. They're only meant to be evaluated
--      internally as part of policy checks for signed-in users — revoke
--      direct EXECUTE from `anon`/`public`, keep it for `authenticated`
--      (Postgres requires the querying role to hold EXECUTE on any function
--      referenced inside an RLS policy it evaluates).
--   3. Pure trigger-body functions (never meant to be called directly by
--      any client role) get EXECUTE revoked from all client roles — trigger
--      firing does not require the firing role to hold EXECUTE.

alter function set_updated_at() set search_path = public;
alter function enforce_membership_location_org() set search_path = public;

revoke execute on function has_org_access(uuid) from public, anon;
revoke execute on function has_location_access(uuid) from public, anon;
revoke execute on function is_org_admin(uuid) from public, anon;
revoke execute on function is_org_admin_or_owner(uuid) from public, anon;
revoke execute on function can_edit_location_entries(uuid) from public, anon;
revoke execute on function within_edit_window(uuid, date) from public, anon;

grant execute on function has_org_access(uuid) to authenticated;
grant execute on function has_location_access(uuid) to authenticated;
grant execute on function is_org_admin(uuid) to authenticated;
grant execute on function is_org_admin_or_owner(uuid) to authenticated;
grant execute on function can_edit_location_entries(uuid) to authenticated;
grant execute on function within_edit_window(uuid, date) to authenticated;

revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function handle_new_organization() from public, anon, authenticated;
revoke execute on function log_labor_entry_audit() from public, anon, authenticated;
revoke execute on function set_updated_at() from public, anon, authenticated;
revoke execute on function enforce_membership_location_org() from public, anon, authenticated;
