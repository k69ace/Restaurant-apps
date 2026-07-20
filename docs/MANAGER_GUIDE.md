# Manager Guide — Labor Efficiency Calculator

For GMs, Assistant Managers, Kitchen Managers, FOH Managers entering and
reviewing daily labor.

## Daily Entry — entering a shift's numbers

1. Go to **Daily Entry**. Pick your location (if you work more than one)
   and the business date at the top.
2. Pick the daypart tab (Lunch, Dinner, or whatever your location uses).
3. Enter the required fields (marked with `*`): net sales, scheduled hours,
   actual hours, regular labor $, FOH $, BOH $, management $. Overtime
   hours/$ default to 0 if there wasn't any.
4. Your entry **saves automatically** a couple of seconds after you stop
   typing, and again whenever you tap out of a field. Watch the status line
   at the top of the form — it'll say "Saving…" then "Saved." You don't
   need to press a save button for a draft.
5. Optional fields (gross sales, discounts/comps, guest count, transaction
   count, scheduled labor $, catering/event labor $, notes, weather/event
   note) are under **More detail** — worth filling in guest count when you
   have it, since several metrics depend on it.
6. When the day's numbers are final, tap **Mark final**. You can still edit
   a final entry until the edit window closes (your Org Admin sets this,
   typically end of the following business day) — after that, only an Org
   Admin can change it.
7. If your connection drops mid-entry, your typed values are safe — they're
   kept in the browser and picked back up when the page reloads, and
   resubmitted once you're back online.

**A guest count of 0 with nonzero sales gets a warning, not a block** —
useful for catching a typo, but it won't stop you from saving if that's
genuinely correct (e.g. sales entered but guest count not tracked that day).

## Daily Dashboard

Shows the day's KPIs (Total Labor %, Sales per Labor Hour, Guests per Labor
Hour, OT % of Labor) compared against your location's target (if one is
set) and the trailing 4-week average for that day-of-week. Colors only
appear once a target exists — no target means "—", not a false green/red.

A **"Possible understaffing"** badge on a daypart is a flag for you to look
into, not a verdict — it means labor ran meaningfully below target *and*
either guests-per-labor-hour was unusually high or hours were cut well
below schedule while sales held up. Worth a look, not an alarm.

Use **Print manager report** for a clean, single-page printout — it always
prints on a light background regardless of the app's dark theme.

## Weekly Trend / Period Comparison / Role & Daypart Analysis

- **Weekly Trend**: pick a date range, see Total Labor % vs. target, a Sales
  per Labor Hour trend, and a FOH/BOH/Management stacked bar by day.
- **Period Comparison**: compare two date ranges side by side (this week vs.
  last week, this month vs. last month, etc.), with a plain-language
  summary at the top — labeled **AI-generated** or just **Summary**
  depending on whether AI is configured, always flagged as "suggested, not
  certain."
- **Role/Daypart Analysis**: labor $ and hours broken down by daypart and by
  role, for a date range.

Every table has an **Export CSV** button that downloads exactly what's on
screen.

## Who can do what

- **Read-only Reporting** access can view everything above but can't save
  entries.
- Everyone else with location access can enter/edit within the edit window.
- Only an **Org Admin** can lock/unlock an entry outside that window, or
  change Settings.

If a page says you don't have permission, that's enforced by the app's
actual data layer, not just hidden — ask your Org Admin to check your role
under Settings > Users.
