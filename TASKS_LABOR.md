# Implementation Checklist — Restaurant Labor Efficiency Calculator

Kept up to date stage by stage, per the execution plan: audit → data model
→ calculations + tests → entry workflow → dashboards → exports → AI summary
→ polish/docs.

- [x] Part 0 audit (`k69ace/unkaged-media/AUDIT_LABOR.md`, and this repo's
      `AUDIT_LABOR.md`)
- [x] App scaffold (Next.js 16 + TS + Tailwind v4 + Vitest)
- [x] Platform-core schema: organizations, locations, profiles, memberships
      (+ RLS)
- [x] Labor schema: org_settings, labor_roles, daypart_configs,
      labor_targets, labor_entries, labor_role_entries, audit_log (+ RLS)
- [x] Calculation module (`lib/calculations/labor.ts`), 100% branch coverage
- [x] Auth: signup/login, org bootstrap RPC, server-side RBAC guards
- [x] Daily Entry workflow: mobile-first form, autosave, live computed %,
      validation, edit-lock window, org-admin lock override
- [x] Daily Dashboard: KPI cards vs. target + trailing avg, daypart table,
      understaffing-risk flag, print view
- [x] Weekly Trend: day-by-day table + line/stacked-bar charts
- [x] Period Comparison: two adjustable ranges, variance, raw-entry export
- [x] Role/Daypart Analysis: grouped aggregation
- [x] CSV export (injection-safe) on every table
- [x] CSV import: documented column template, adapter interface,
      per-row validation, commit-as-draft flow
- [x] Settings: targets, dayparts, roles, org config (edit-lock window,
      approval flag, understaffing thresholds), user invites
- [x] AI-generated summary (Claude Haiku 4.5) with deterministic
      rules-based fallback, cached per period
- [x] Seed/demo data (`supabase/seed.sql`), clearly marked
- [x] Module README, Manager Guide, Admin Guide
- [x] `.env.example` updated for every new variable
- [x] Completion report (Known Limitations, Future Roadmap, assumption log)

## Deferred (documented in Future Roadmap, not started)

- [ ] Approval/lock workflow UI beyond the org_settings flag (the flag and
      DB-level lock enforcement exist; a dedicated "lock this week" UI
      action does not)
- [ ] Daily/Weekly Manager Report as a generated PDF file (today: browser
      print-to-PDF via the Dashboard's print view, which meets the "light
      background, dark text, single page" requirement without a separate
      PDF pipeline)
- [ ] Automated integration/e2e test suite (unit tests only this session;
      see Known Limitations in `COMPLETION_REPORT.md` for why live
      browser E2E could not be completed here)
- [ ] Live POS/payroll integrations (explicitly out of scope for MVP per
      the brief — the adapter interface is ready for one)
