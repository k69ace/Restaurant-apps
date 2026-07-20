-- The task brief requires a "Scheduled-vs-Actual Variance (hours AND
-- dollars)" metric, but its own LaborEntry field list only provides
-- scheduledHours (no scheduled labor $ figure to diff against actual $).
-- Documented assumption (see AUDIT_LABOR.md / lib/calculations/labor.ts):
-- add this as an optional field rather than leaving the dollar half of an
-- explicitly required metric unimplementable. Nullable — entries created
-- before a schedule's dollar budget was known simply omit it, and the
-- calculation module returns null (not a fabricated number) for that case.

alter table labor_entries
  add column scheduled_labor_dollars numeric(10, 2);

alter table labor_entries
  add constraint labor_entries_scheduled_labor_dollars_non_negative
  check (coalesce(scheduled_labor_dollars, 0) >= 0);
