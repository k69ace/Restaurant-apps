# Admin Guide — Labor Efficiency Calculator

For Org Admins and Owners configuring the module.

## Getting your organization set up

The first person from your operation signs up at `/signup`, which creates
your Organization, first Location, and makes that person **Org Admin**. Two
starter dayparts (Lunch, Dinner) are created automatically — rename, remove,
or add more under **Settings > Dayparts**.

## Settings > Dayparts

Dayparts are per-location. Each has a **label** (what managers see, e.g.
"Brunch") and a **code** (a short internal identifier used by CSV import —
keep it stable once managers are using it, since changing a code doesn't
migrate historical entries to it). Deactivating a daypart hides it from
Daily Entry going forward without deleting its historical data.

## Settings > Roles (Org Admin only)

Job roles (Server, Line Cook, Shift Manager, ...) used for the optional
role-level detail on Daily Entry and the Role/Daypart Analysis report. Each
role has a category (FOH / BOH / Management) and an optional default hourly
wage (informational only today — not yet wired into any calculation).

## Settings > Targets (Org Admin or Owner)

Targets are **effective-dated**: the most recent target on or before a
given business date is the one used for that date's dashboards and reports.
Set a new one whenever your target changes rather than editing history.

- **Total Labor %** is the only required figure; FOH/BOH/Management/OT
  targets are optional and used for the corresponding KPI comparisons where
  set.
- **Include management $ in Productive Labor %** — checked (default) means
  Productive % equals Total %. Unchecked means Productive % excludes
  management $, useful if you track management labor as a fixed cost
  separate from "productive" floor labor.

If you don't set a target, dashboards and reports show "no target set"
rather than guessing — they never imply good/bad without one.

## Settings > Org settings (Org Admin only)

- **Edit lock window**: how many hours after a business date's start
  managers can still edit an entry. Default 48 (roughly "through the end of
  the following business day"). Org Admins can always edit, regardless of
  this window.
- **Require a GM to lock a day before it counts in rollups**: currently a
  stored preference — the underlying lock mechanism (Org Admin can always
  set an entry to `locked`, which then becomes read-only to non-admins) is
  live; a dedicated "lock this week" button tied to this flag is on the
  Future Roadmap.
- **Understaffing-flag thresholds**: the guests-per-labor-hour level
  considered "high workload," and the scheduled-vs-actual hours variance
  percentage considered "meaningful." Defaults (3.5 guests/hour, 10%) are
  documented starting points — tune them to your concept.

## Settings > Users (Org Admin only)

Invite a teammate by email, role, and location (or "All locations" for an
org-wide role like Owner or Org Admin). This sends a real Supabase Auth
invite email; the invitee sets their own password on first login. Roles:

| Role | Typical scope |
|---|---|
| Org Admin | Full control, all locations, can always edit/lock, manages Settings and Users |
| Owner | Cross-location visibility, can edit targets, can't manage Users |
| General Manager / Assistant Manager / Kitchen Manager / FOH Manager | Location-scoped entry + full dashboards/reports for their location(s) |
| Read-only Reporting | View dashboards/reports, no edit access |

## Settings > Import CSV

For bringing in historical data or a POS/spreadsheet export. The exact
column template is shown on the page. Required columns: `business_date`,
`daypart_code` (must match a code from Settings > Dayparts), `net_sales`,
`scheduled_hours`, `actual_hours`, `regular_labor_dollars`,
`overtime_hours`, `overtime_dollars`, `foh_labor_dollars`,
`boh_labor_dollars`, `management_labor_dollars`. Optional columns:
`gross_sales`, `discounts_comps`, `guest_count`, `transaction_count`,
`scheduled_labor_dollars`, `catering_event_labor_dollars`.

Every row is validated before import; malformed rows (bad dates,
non-numeric or negative values, an unrecognized daypart code) are reported
individually with their row number — the rest of the file still imports.
Imported rows land as **drafts** for review on Daily Entry, never
auto-finalized.

There is no live POS integration in this build — CSV is the only import
path today. See the Future Roadmap in `COMPLETION_REPORT.md` for the
planned integration seam.
