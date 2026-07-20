-- Platform core: Organization, Location, User profile, Role/Membership.
-- Nothing equivalent existed anywhere in the codebase (see AUDIT_LABOR.md in
-- k69ace/unkaged-media) — this is the foundation every other unKAGEd
-- Hospitality module (Catering Estimator, BEO Builder, this one, ...) is
-- expected to share going forward, so it lives in its own migration/schema
-- section rather than being folded into the labor-specific tables.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- organizations / locations
-- ---------------------------------------------------------------------------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  timezone text not null default 'America/Chicago',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index locations_organization_id_idx on locations (organization_id);

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users; auth.users itself is Supabase-managed and
-- cannot hold app-specific columns like display_name)
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- memberships: a user's role within an organization, optionally scoped to
-- one location. A null location_id means "all locations in this org" —
-- used for Owner / Org Admin / Read-only-reporting-at-org-level.
-- ---------------------------------------------------------------------------

create type membership_role as enum (
  'org_admin',
  'owner',
  'general_manager',
  'assistant_manager',
  'kitchen_manager',
  'foh_manager',
  'read_only'
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  location_id uuid references locations (id) on delete cascade,
  role membership_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, organization_id, location_id, role)
);

create index memberships_user_id_idx on memberships (user_id);
create index memberships_org_id_idx on memberships (organization_id);

-- location_id, if set, must belong to the same organization_id. Enforced via
-- trigger rather than a cross-table check constraint (Postgres can't express
-- that as a plain CHECK).
create function enforce_membership_location_org()
returns trigger
language plpgsql
as $$
begin
  if new.location_id is not null then
    if not exists (
      select 1 from locations
      where id = new.location_id and organization_id = new.organization_id
    ) then
      raise exception 'location % does not belong to organization %', new.location_id, new.organization_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger memberships_location_org_check
  before insert or update on memberships
  for each row execute function enforce_membership_location_org();

-- ---------------------------------------------------------------------------
-- Helper functions used by RLS policies (SECURITY DEFINER so they can read
-- `memberships` without recursively triggering memberships' own RLS).
-- ---------------------------------------------------------------------------

-- Any role in this org, at the org level or for a specific location.
create function has_org_access(target_org uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from memberships
    where user_id = auth.uid() and organization_id = target_org
  );
$$;

-- Any role granting access to this specific location: an org-wide
-- membership (location_id is null) OR a membership scoped to this location.
create function has_location_access(target_location uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    join locations l on l.id = target_location
    where m.user_id = auth.uid()
      and m.organization_id = l.organization_id
      and (m.location_id is null or m.location_id = target_location)
  );
$$;

-- org_admin only (settings, user/role management, targets, always-allowed edits).
create function is_org_admin(target_org uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from memberships
    where user_id = auth.uid() and organization_id = target_org and role = 'org_admin'
  );
$$;

-- org_admin or owner (both can view cross-location + edit targets).
create function is_org_admin_or_owner(target_org uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from memberships
    where user_id = auth.uid() and organization_id = target_org and role in ('org_admin', 'owner')
  );
$$;

-- Roles allowed to create/edit labor entries at a location (everyone except
-- read_only). org_admin bypasses the per-location scoping entirely.
create function can_edit_location_entries(target_location uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    join locations l on l.id = target_location
    where m.user_id = auth.uid()
      and m.organization_id = l.organization_id
      and (m.location_id is null or m.location_id = target_location)
      and m.role <> 'read_only'
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table organizations enable row level security;
alter table locations enable row level security;
alter table profiles enable row level security;
alter table memberships enable row level security;

create policy organizations_select on organizations
  for select using (has_org_access(id));

create policy organizations_update on organizations
  for update using (is_org_admin(id));

create policy locations_select on locations
  for select using (has_org_access(organization_id));

create policy locations_write_admin on locations
  for insert with check (is_org_admin(organization_id));

create policy locations_update_admin on locations
  for update using (is_org_admin(organization_id));

create policy profiles_select_self_or_org_peer on profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from memberships mine
      join memberships theirs on theirs.organization_id = mine.organization_id
      where mine.user_id = auth.uid() and theirs.user_id = profiles.id
    )
  );

create policy profiles_update_self on profiles
  for update using (id = auth.uid());

create policy memberships_select on memberships
  for select using (has_org_access(organization_id));

create policy memberships_write_admin on memberships
  for insert with check (is_org_admin(organization_id));

create policy memberships_update_admin on memberships
  for update using (is_org_admin(organization_id));

create policy memberships_delete_admin on memberships
  for delete using (is_org_admin(organization_id));
