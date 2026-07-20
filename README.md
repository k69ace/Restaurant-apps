# unKAGEd Hospitality — Restaurant Apps

This repo hosts the unKAGEd Hospitality **platform core** (organizations,
locations, users, roles) and the first module built on it: the **Restaurant
Labor Efficiency Calculator**. Future unKAGEd Hospitality products (Catering
Estimator, BEO Builder, etc.) are expected to share this same platform core
rather than re-implement it.

It's a separate application from `k69ace/unkaged-media` (the public
marketing site) — see `AUDIT_LABOR.md` for why.

## Stack

- Next.js 16 (App Router) + TypeScript, strict mode
- Tailwind CSS v4
- Supabase (Postgres + Auth), all multi-tenant access control enforced via
  Postgres Row Level Security — not just hidden in the UI
- Vitest for unit tests

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll land on
`/signup` — the first user for a new operator creates their organization,
first location, and becomes its Org Admin in one step.

## Structure

- `src/app/(login|signup)` — public auth pages.
- `src/app/app/` — the authenticated app shell and every module page:
  `entry` (Daily Entry), `dashboard` (Daily Dashboard), `trend` (Weekly
  Trend), `period` (Period Comparison), `analysis` (Role/Daypart Analysis),
  `settings/*` (targets, dayparts, roles, org config, users, CSV import).
- `src/app/actions/` — server actions (the only way the client mutates
  data); each one re-checks role/permission server-side before writing.
- `src/lib/calculations/labor.ts` — the entire labor-metrics formula set.
  Pure functions, no UI/DB concerns, 100% branch-covered by
  `src/lib/calculations/labor.test.ts`. This is the module's most
  spec-critical file — read it before changing any displayed number.
- `src/lib/validation/laborEntry.ts` — Daily Entry form validation rules.
- `src/lib/csv/` — the shared, injection-safe CSV encode/decode engine used
  by every export button and the CSV importer.
- `src/lib/integrations/labor-import/` — the POS/spreadsheet import
  adapter interface (`types.ts`) and its only implementation today
  (`csv.ts`). A future Toast/Square/Clover/etc. integration implements the
  same interface without touching calculation or UI code.
- `src/lib/ai/laborSummary.ts` — the AI-generated (with deterministic
  rules-based fallback) weekly/period summary.
- `src/lib/auth/` — session lookup (`session.ts`) and server-side
  permission guards (`requireRole.ts`) that call the same SQL functions
  RLS uses, so authorization logic has one source of truth.
- `supabase/migrations/` — the full schema, in the order it was built.
  Read top-to-bottom for the data model; each file's header comment
  explains non-obvious decisions.
- `supabase/seed.sql` — demo data only, clearly marked; see the file for
  how to attach your own login to the seeded demo organization.

## Testing

```bash
npm test              # run once
npm run test:coverage # with coverage — lib/calculations is held to 100%
npm run lint
npx tsc --noEmit
```

## Documentation

- `AUDIT_LABOR.md` — the Part 0 repository audit performed before any code
  was written, including why this module lives in its own repo.
- `TASKS_LABOR.md` — the implementation checklist, kept up to date stage by
  stage.
- `docs/MANAGER_GUIDE.md` — help text for GMs/shift leads using Daily Entry
  and the dashboards day to day.
- `docs/ADMIN_GUIDE.md` — how to configure targets, dayparts, roles, org
  settings, and user access.
- `COMPLETION_REPORT.md` — final report: what shipped, every assumption
  made and why, Known Limitations, and the Future Roadmap.

## Deployment notes

Required environment variables (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — required.
- `SUPABASE_SERVICE_ROLE_KEY` — required for the Settings > Users invite
  flow (`auth.admin.inviteUserByEmail`); never expose to the client.
- `ANTHROPIC_API_KEY` — optional. Enables the AI-generated period summary
  (Claude Haiku 4.5); the app is fully functional without it via the
  rules-based summary fallback.

No other build steps beyond `npm run build`. Apply `supabase/migrations/`
in order against a fresh Supabase project before first deploy (this
project's migrations were applied via the Supabase MCP tools during
development — for a new environment, apply them via the Supabase CLI or
dashboard SQL editor in filename order).
