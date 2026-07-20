-- Bootstrapping a brand-new organization is a chicken-and-egg problem for
-- RLS: creating the first membership row normally requires already being
-- org_admin (see memberships_write_admin), but there's no membership yet.
-- A narrow SECURITY DEFINER RPC, callable only by authenticated users,
-- creates the organization + first location + the caller's org_admin
-- membership + starter dayparts atomically. This is the ONLY way to create
-- an organization — there is deliberately no general INSERT policy on
-- `organizations`.

create function create_organization_with_admin(org_name text, location_name text)
returns table (organization_id uuid, location_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_location_id uuid;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated';
  end if;

  if length(trim(org_name)) = 0 or length(trim(location_name)) = 0 then
    raise exception 'organization and location names are required';
  end if;

  insert into organizations (name) values (trim(org_name)) returning id into v_org_id;
  insert into locations (organization_id, name) values (v_org_id, trim(location_name))
    returning id into v_location_id;
  insert into memberships (user_id, organization_id, location_id, role)
    values (auth.uid(), v_org_id, null, 'org_admin');

  insert into daypart_configs (organization_id, location_id, code, label, sort_order)
  values
    (v_org_id, v_location_id, 'lunch', 'Lunch', 1),
    (v_org_id, v_location_id, 'dinner', 'Dinner', 2);

  return query select v_org_id, v_location_id;
end;
$$;

revoke execute on function create_organization_with_admin(text, text) from public, anon;
grant execute on function create_organization_with_admin(text, text) to authenticated;
