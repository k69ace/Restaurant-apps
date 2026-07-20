# Audit: Restaurant Labor Efficiency Calculator (this repository)

## Relationship to the Part 0 audit

The mandatory Part 0 repository audit was performed in `k69ace/unkaged-media`
(the public marketing site) at the start of this engagement — see that
repo's `AUDIT_LABOR.md`. Its finding: `unkaged-media` is exclusively a
static marketing site with no database, auth, or backend of any kind; the
only "Labor Efficiency Calculator" artifact there is marketing copy and a
decorative, non-functional illustration. There was no existing shared
platform core (Organization/Location/User/Role) anywhere in scope.

Given that, and after confirming direction with the user, this module was
built in a **new, separate repository** (`k69ace/restaurant-apps`) rather
than inside the marketing site — real operational data (wages, labor
figures) and real authentication belong in their own codebase and
deployment, not layered onto a public brochure site. This file picks up
where that audit left off.

## What exists in this repo as of this session

**Classification: Functionally complete, unpolished in places.** The full
core workflow — sign up → daily entry → dashboard → weekly/period reporting
→ CSV export/import → settings → AI/rules-based summary — is implemented,
tested, and builds cleanly. It has not been polished with a full manual QA
pass across every device size, and one class of verification (live browser
testing against the deployed Supabase backend) could not be completed in
this session — see Known Limitations in `COMPLETION_REPORT.md`.

- **Platform core** (didn't exist before this session): `organizations`,
  `locations`, `profiles`, `memberships` with a 7-role enum, all RLS-backed.
- **Labor module schema**: `org_settings`, `labor_roles`, `daypart_configs`,
  `labor_targets`, `labor_entries`, `labor_role_entries`, `audit_log`
  (append-only, trigger-written only).
- **Calculation module**: every formula in the spec, 100% branch-covered.
- **Auth**: Supabase email/password; signup bootstraps a new org atomically.
- **Daily Entry**: mobile-first, autosave, live computed percentages.
- **Dashboards/reporting**: Daily Dashboard, Weekly Trend, Period
  Comparison, Role/Daypart Analysis — all with CSV export.
- **CSV import**: documented column template, per-row validation.
- **Settings**: targets, dayparts, roles, org config, user invites.
- **AI summary**: Claude Haiku 4.5 with a deterministic rules-based
  fallback, cached per period.

## Technology stack

Next.js 16 (App Router) + TypeScript + Tailwind v4 + Supabase (Postgres +
Auth, RLS-enforced) + Vitest. See `README.md` for the full structure.

## Auth/permission model

Built from scratch this session (none existed anywhere in scope). Seven
roles (`org_admin`, `owner`, `general_manager`, `assistant_manager`,
`kitchen_manager`, `foh_manager`, `read_only`), enforced at the database
layer via RLS SECURITY DEFINER helper functions, reused by the app layer's
server-action guards (`lib/auth/requireRole.ts`) via RPC so there is one
source of truth for "who can do what."

## Existing tests

None existed before this session (none of this code existed). 102 unit
tests were added covering the calculation module (60), validation (8), CSV
engine + import adapter (27), and the AI summary's rules-based fallback (7).
No integration/e2e test suite exists yet — see Known Limitations.

## Known gaps, security concerns, and assumptions

See `COMPLETION_REPORT.md` for the full, itemized list (every assumption
made during the build, Known Limitations, and Future Roadmap). The
highlights:

- Live browser end-to-end testing against the deployed Supabase backend
  could not be completed in this sandboxed session (network egress policy
  blocks direct access to `supabase.co`) — caught and fixed one real bug
  this way (a pre-hydration native-form-submit race that could leak a
  password into a URL) before hitting that wall; everything past that point
  is verified via type-checking, linting, unit tests, and production
  builds, not a live click-through.
- Two genuine Next.js 16 breaking changes were found and fixed by checking
  the framework's own bundled docs and the build's own warnings, rather
  than trusting training-data conventions (`eslint-config-next`'s flat
  config shape; `middleware.ts` → `proxy.ts`).
