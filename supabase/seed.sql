-- ============================================================================
-- DEMO SEED DATA — clearly marked, never run against a real operator's org.
--
-- Creates a "Demo Restaurant Group (Seed Data)" organization with one
-- location, dayparts, labor roles, a labor target, and ~4 weeks of
-- realistic-but-fabricated daily labor entries so the reporting views
-- (Dashboard, Weekly Trend, Period Comparison, Role/Daypart Analysis) have
-- something to show out of the box.
--
-- This script does NOT create an auth user or membership by itself — you
-- won't be able to see this org in the app until you attach your own
-- account to it. After signing up once via /signup (which creates your own
-- separate org), find your user id:
--
--   select id, email from auth.users order by created_at desc limit 5;
--
-- then replace YOUR_USER_ID_HERE below and run just that final insert.
-- ============================================================================

do $$
declare
  v_org_id uuid;
  v_location_id uuid;
  v_lunch_id uuid;
  v_dinner_id uuid;
  v_server_role_id uuid;
  v_cook_role_id uuid;
  v_manager_role_id uuid;
  v_date date;
  v_dow int;
  v_is_weekend boolean;
  v_lunch_sales numeric;
  v_dinner_sales numeric;
begin
  insert into organizations (name) values ('Demo Restaurant Group (Seed Data)')
    returning id into v_org_id;

  insert into locations (organization_id, name, timezone)
    values (v_org_id, 'Demo Location — Main St (Seed Data)', 'America/Chicago')
    returning id into v_location_id;

  insert into daypart_configs (organization_id, location_id, code, label, sort_order)
    values
      (v_org_id, v_location_id, 'lunch', 'Lunch', 1),
      (v_org_id, v_location_id, 'dinner', 'Dinner', 2);

  select id into v_lunch_id from daypart_configs
    where location_id = v_location_id and code = 'lunch';
  select id into v_dinner_id from daypart_configs
    where location_id = v_location_id and code = 'dinner';

  insert into labor_roles (organization_id, name, category, default_hourly_wage)
    values
      (v_org_id, 'Server', 'foh', 14.00),
      (v_org_id, 'Bartender', 'foh', 15.50),
      (v_org_id, 'Host', 'foh', 13.00),
      (v_org_id, 'Line Cook', 'boh', 17.00),
      (v_org_id, 'Prep Cook', 'boh', 15.00),
      (v_org_id, 'Dishwasher', 'boh', 13.50),
      (v_org_id, 'Shift Manager', 'management', 22.00);

  select id into v_server_role_id from labor_roles where organization_id = v_org_id and name = 'Server';
  select id into v_cook_role_id from labor_roles where organization_id = v_org_id and name = 'Line Cook';
  select id into v_manager_role_id from labor_roles where organization_id = v_org_id and name = 'Shift Manager';

  insert into labor_targets (
    organization_id, location_id, effective_date,
    target_total_labor_percent, target_foh_percent, target_boh_percent,
    target_management_percent, include_management_in_productive, target_overtime_percent
  ) values (
    v_org_id, v_location_id, current_date - interval '90 days',
    0.29, 0.12, 0.11, 0.06, true, 0.03
  );

  -- ~4 weeks of daily entries. Weekends run heavier sales and slightly
  -- higher labor % (more staff on for the volume); a couple of days are
  -- nudged to trip the understaffing-risk flag on the Daily Dashboard so
  -- reviewers can see that state without hunting for it.
  for v_date in select generate_series(current_date - interval '27 days', current_date, '1 day')::date loop
    v_dow := extract(dow from v_date);
    v_is_weekend := v_dow in (0, 5, 6); -- Fri/Sat/Sun

    v_lunch_sales := round((900 + random() * 400 + case when v_is_weekend then 300 else 0 end)::numeric, 2);
    v_dinner_sales := round((1800 + random() * 800 + case when v_is_weekend then 900 else 0 end)::numeric, 2);

    insert into labor_entries (
      organization_id, location_id, business_date, daypart_id, status,
      net_sales, guest_count, scheduled_hours, actual_hours,
      scheduled_labor_dollars, regular_labor_dollars, overtime_hours, overtime_dollars,
      foh_labor_dollars, boh_labor_dollars, management_labor_dollars
    ) values (
      v_org_id, v_location_id, v_date, v_lunch_id, 'final',
      v_lunch_sales,
      round(v_lunch_sales / (11 + random() * 3)),
      42, 40 + round(random() * 4),
      270, 250 + round(random() * 20),
      round((random() * 2)::numeric, 1), round((random() * 30)::numeric, 2),
      130 + round(random() * 20), 100 + round(random() * 15), 40
    );

    insert into labor_entries (
      organization_id, location_id, business_date, daypart_id, status,
      net_sales, guest_count, scheduled_hours, actual_hours,
      scheduled_labor_dollars, regular_labor_dollars, overtime_hours, overtime_dollars,
      foh_labor_dollars, boh_labor_dollars, management_labor_dollars
    ) values (
      v_org_id, v_location_id, v_date, v_dinner_id, 'final',
      v_dinner_sales,
      round(v_dinner_sales / (14 + random() * 4)),
      70,
      -- A couple of days run noticeably below scheduled hours despite
      -- strong sales — trips the understaffing-risk flag deliberately.
      case when v_dow = 5 then 58 else 66 + round(random() * 6) end,
      480, 420 + round(random() * 40),
      round((random() * 4)::numeric, 1), round((random() * 60)::numeric, 2),
      210 + round(random() * 30), 170 + round(random() * 25), 65
    );
  end loop;

  -- Optional role-level detail on the most recent day, illustrating the
  -- Role/Daypart Analysis report.
  insert into labor_role_entries (labor_entry_id, labor_role_id, hours, dollars)
  select id, v_server_role_id, 24, 336
  from labor_entries
  where location_id = v_location_id and daypart_id = v_dinner_id
  order by business_date desc limit 1;

  insert into labor_role_entries (labor_entry_id, labor_role_id, hours, dollars)
  select id, v_cook_role_id, 20, 340
  from labor_entries
  where location_id = v_location_id and daypart_id = v_dinner_id
  order by business_date desc limit 1;

  insert into labor_role_entries (labor_entry_id, labor_role_id, hours, dollars)
  select id, v_manager_role_id, 8, 176
  from labor_entries
  where location_id = v_location_id and daypart_id = v_dinner_id
  order by business_date desc limit 1;

  raise notice 'Seeded demo organization % at location %', v_org_id, v_location_id;
end $$;

-- ----------------------------------------------------------------------------
-- Run this yourself after replacing YOUR_USER_ID_HERE with your own
-- auth.users id (see the query in the header comment) to see the demo org
-- in the app as org_admin:
--
-- insert into memberships (user_id, organization_id, location_id, role)
-- select 'YOUR_USER_ID_HERE'::uuid, id, null, 'org_admin'
-- from organizations where name = 'Demo Restaurant Group (Seed Data)';
-- ----------------------------------------------------------------------------
