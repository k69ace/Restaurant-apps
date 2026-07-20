-- Labor Efficiency Calculator schema: org settings, labor roles, dayparts,
-- targets, daily entries, role-level detail, and an audit log.
--
-- Assumption (documented in AUDIT_LABOR.md / README): "edit lock window" is
-- implemented as a configurable number of hours after a business date's
-- midnight (org_settings.edit_lock_hours_after_business_date, default 48 —
-- i.e. roughly "end of the following business day"), not a literal
-- calendar-day cutoff, since business dates don't carry a timezone-safe
-- "end of day" on their own.

-- ---------------------------------------------------------------------------
-- org_settings: one row per organization, org-wide configuration.
-- ---------------------------------------------------------------------------

create table org_settings (
  organization_id uuid primary key references organizations (id) on delete cascade,
  edit_lock_hours_after_business_date integer not null default 48,
  approval_required boolean not null default false,
  guests_per_labor_hour_high_threshold numeric(6, 2) not null default 3.5,
  scheduled_vs_actual_variance_threshold_percent numeric(5, 2) not null default 10.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every org gets a settings row with defaults at creation time.
create function handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.org_settings (organization_id) values (new.id);
  return new;
end;
$$;

create trigger on_organization_created
  after insert on organizations
  for each row execute function handle_new_organization();

create function within_edit_window(target_location uuid, entry_date date)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select now() < (
    entry_date::timestamptz
    + make_interval(hours => (
        select coalesce(os.edit_lock_hours_after_business_date, 48)
        from org_settings os
        join locations l on l.organization_id = os.organization_id
        where l.id = target_location
      ))
  );
$$;

-- ---------------------------------------------------------------------------
-- labor_roles: job roles used for role-level labor detail (Server, Cook, ...)
-- ---------------------------------------------------------------------------

create type labor_role_category as enum ('foh', 'boh', 'management');

create table labor_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  category labor_role_category not null,
  default_hourly_wage numeric(8, 2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create index labor_roles_org_id_idx on labor_roles (organization_id);

-- ---------------------------------------------------------------------------
-- daypart_configs: configurable per location (or org-wide default when
-- location_id is null, used to seed new locations).
-- ---------------------------------------------------------------------------

create table daypart_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  location_id uuid references locations (id) on delete cascade,
  code text not null,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, location_id, code)
);

create index daypart_configs_org_id_idx on daypart_configs (organization_id);
create index daypart_configs_location_id_idx on daypart_configs (location_id);

-- ---------------------------------------------------------------------------
-- labor_targets: effective-dated targets, location_id null = org default.
-- ---------------------------------------------------------------------------

create table labor_targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  location_id uuid references locations (id) on delete cascade,
  effective_date date not null,
  target_total_labor_percent numeric(5, 2) not null,
  target_foh_percent numeric(5, 2),
  target_boh_percent numeric(5, 2),
  target_management_percent numeric(5, 2),
  include_management_in_productive boolean not null default true,
  target_overtime_percent numeric(5, 2),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (organization_id, location_id, effective_date)
);

create index labor_targets_org_id_idx on labor_targets (organization_id);
create index labor_targets_location_id_idx on labor_targets (location_id);

-- ---------------------------------------------------------------------------
-- labor_entries: the core daily/daypart record.
-- ---------------------------------------------------------------------------

create type labor_entry_status as enum ('draft', 'final', 'locked');

create table labor_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  location_id uuid not null references locations (id) on delete cascade,
  business_date date not null,
  daypart_id uuid not null references daypart_configs (id),

  net_sales numeric(10, 2) not null default 0,
  gross_sales numeric(10, 2),
  discounts_comps numeric(10, 2),
  guest_count integer,
  transaction_count integer,

  scheduled_hours numeric(8, 2) not null default 0,
  actual_hours numeric(8, 2) not null default 0,
  regular_labor_dollars numeric(10, 2) not null default 0,
  overtime_hours numeric(8, 2) not null default 0,
  overtime_dollars numeric(10, 2) not null default 0,
  foh_labor_dollars numeric(10, 2) not null default 0,
  boh_labor_dollars numeric(10, 2) not null default 0,
  management_labor_dollars numeric(10, 2) not null default 0,
  catering_event_labor_dollars numeric(10, 2),

  notes text,
  weather_or_event_note text,
  status labor_entry_status not null default 'draft',

  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (location_id, business_date, daypart_id),

  constraint labor_entries_non_negative check (
    net_sales >= 0 and coalesce(gross_sales, 0) >= 0 and coalesce(discounts_comps, 0) >= 0
    and coalesce(guest_count, 0) >= 0 and coalesce(transaction_count, 0) >= 0
    and scheduled_hours >= 0 and actual_hours >= 0
    and regular_labor_dollars >= 0 and overtime_hours >= 0 and overtime_dollars >= 0
    and foh_labor_dollars >= 0 and boh_labor_dollars >= 0 and management_labor_dollars >= 0
    and coalesce(catering_event_labor_dollars, 0) >= 0
  )
);

create index labor_entries_org_id_idx on labor_entries (organization_id);
create index labor_entries_location_date_idx on labor_entries (location_id, business_date);

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger labor_entries_set_updated_at
  before update on labor_entries
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- labor_role_entries: optional role-level line-item detail.
-- ---------------------------------------------------------------------------

create table labor_role_entries (
  id uuid primary key default gen_random_uuid(),
  labor_entry_id uuid not null references labor_entries (id) on delete cascade,
  labor_role_id uuid not null references labor_roles (id),
  hours numeric(8, 2) not null default 0,
  dollars numeric(10, 2) not null default 0,
  unique (labor_entry_id, labor_role_id),
  constraint labor_role_entries_non_negative check (hours >= 0 and dollars >= 0)
);

create index labor_role_entries_entry_id_idx on labor_role_entries (labor_entry_id);

-- ---------------------------------------------------------------------------
-- audit_log: append-only record of every create/update/lock/delete on a
-- labor_entries row. Kept generic (entity_type/entity_id) so other modules
-- can reuse the same table instead of each inventing their own.
-- ---------------------------------------------------------------------------

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  changed_by uuid references auth.users (id),
  changed_at timestamptz not null default now(),
  diff jsonb
);

create index audit_log_entity_idx on audit_log (entity_type, entity_id);
create index audit_log_org_id_idx on audit_log (organization_id);

create function log_labor_entry_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := 'create';
  elsif tg_op = 'DELETE' then
    v_action := 'delete';
  elsif tg_op = 'UPDATE' and new.status = 'locked' and old.status <> 'locked' then
    v_action := 'lock';
  else
    v_action := 'update';
  end if;

  insert into audit_log (organization_id, entity_type, entity_id, action, changed_by, diff)
  values (
    coalesce(new.organization_id, old.organization_id),
    'labor_entry',
    coalesce(new.id, old.id),
    v_action,
    auth.uid(),
    jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
  );

  return coalesce(new, old);
end;
$$;

create trigger labor_entries_audit
  after insert or update or delete on labor_entries
  for each row execute function log_labor_entry_audit();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table org_settings enable row level security;
alter table labor_roles enable row level security;
alter table daypart_configs enable row level security;
alter table labor_targets enable row level security;
alter table labor_entries enable row level security;
alter table labor_role_entries enable row level security;
alter table audit_log enable row level security;

create policy org_settings_select on org_settings
  for select using (has_org_access(organization_id));

create policy org_settings_update_admin on org_settings
  for update using (is_org_admin(organization_id));

create policy labor_roles_select on labor_roles
  for select using (has_org_access(organization_id));

create policy labor_roles_write_admin on labor_roles
  for insert with check (is_org_admin(organization_id));

create policy labor_roles_update_admin on labor_roles
  for update using (is_org_admin(organization_id));

create policy daypart_configs_select on daypart_configs
  for select using (has_org_access(organization_id));

create policy daypart_configs_write_admin on daypart_configs
  for insert with check (is_org_admin(organization_id));

create policy daypart_configs_update_admin on daypart_configs
  for update using (is_org_admin(organization_id));

create policy labor_targets_select on labor_targets
  for select using (has_org_access(organization_id));

create policy labor_targets_write on labor_targets
  for insert with check (is_org_admin_or_owner(organization_id));

create policy labor_targets_update on labor_targets
  for update using (is_org_admin_or_owner(organization_id));

create policy labor_entries_select on labor_entries
  for select using (has_location_access(location_id));

create policy labor_entries_insert on labor_entries
  for insert with check (
    is_org_admin(organization_id)
    or (can_edit_location_entries(location_id) and within_edit_window(location_id, business_date))
  );

create policy labor_entries_update on labor_entries
  for update using (
    is_org_admin(organization_id)
    or (
      can_edit_location_entries(location_id)
      and status <> 'locked'
      and within_edit_window(location_id, business_date)
    )
  );

create policy labor_entries_delete_admin on labor_entries
  for delete using (is_org_admin(organization_id));

create policy labor_role_entries_select on labor_role_entries
  for select using (
    exists (
      select 1 from labor_entries e
      where e.id = labor_role_entries.labor_entry_id and has_location_access(e.location_id)
    )
  );

create policy labor_role_entries_write on labor_role_entries
  for insert with check (
    exists (
      select 1 from labor_entries e
      where e.id = labor_role_entries.labor_entry_id
        and (
          is_org_admin(e.organization_id)
          or (can_edit_location_entries(e.location_id) and within_edit_window(e.location_id, e.business_date))
        )
    )
  );

create policy labor_role_entries_update on labor_role_entries
  for update using (
    exists (
      select 1 from labor_entries e
      where e.id = labor_role_entries.labor_entry_id
        and (
          is_org_admin(e.organization_id)
          or (
            can_edit_location_entries(e.location_id)
            and e.status <> 'locked'
            and within_edit_window(e.location_id, e.business_date)
          )
        )
    )
  );

create policy labor_role_entries_delete on labor_role_entries
  for delete using (
    exists (
      select 1 from labor_entries e
      where e.id = labor_role_entries.labor_entry_id and is_org_admin(e.organization_id)
    )
  );

create policy audit_log_select on audit_log
  for select using (has_org_access(organization_id));

-- No insert/update/delete policies for audit_log: rows are only ever
-- written by the SECURITY DEFINER trigger function above, never directly
-- by application code, so no role needs (or gets) direct write access.
