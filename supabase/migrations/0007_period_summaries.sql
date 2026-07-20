-- Cache for weekly/period plain-language summaries (AI-generated or the
-- deterministic rules-based fallback), so repeated views of the same period
-- don't re-trigger an AI call. One row per (org, location, date range).

create table period_summaries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  location_id uuid not null references locations (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  source text not null check (source in ('ai', 'rules')),
  summary_text text not null,
  flagged_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, location_id, period_start, period_end)
);

create index period_summaries_lookup_idx
  on period_summaries (organization_id, location_id, period_start, period_end);

alter table period_summaries enable row level security;

create policy period_summaries_select on period_summaries
  for select using (has_org_access(organization_id));

-- Written only by server actions (service context), which already enforce
-- has_location_access before generating a summary — no direct client
-- insert/update policy needed beyond select.
create policy period_summaries_insert on period_summaries
  for insert with check (has_location_access(location_id));
