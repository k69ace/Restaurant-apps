-- Daily Entry autosave upserts a row (insert-or-update) rather than doing a
-- separate "is this the first save?" round trip, so the app layer can't
-- reliably distinguish insert vs. update to set created_by only once. Set
-- both actor columns server-side instead: created_by on first insert only,
-- updated_by on every insert/update, always from auth.uid() — never
-- trusted from client input.

create function set_labor_entry_actors()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  end if;
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger labor_entries_set_actors
  before insert or update on labor_entries
  for each row execute function set_labor_entry_actors();

revoke execute on function set_labor_entry_actors() from public, anon, authenticated;
