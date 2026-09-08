# Editable Automated Policy Thresholds

Status: **Implemented (2026-09-08).**

## What this is

The "Automated policy thresholds" section on `/settings` used to render the three thresholds (verbal warning, required manager meeting, PIP) as hardcoded numbers from `src/lib/policy-engine.ts`'s `POLICY_THRESHOLDS` constant. Any signed-in user can now edit two of them directly from that page, and the change takes effect immediately for the real (DB-backed) parts of the app.

## What's editable, and what isn't

| Threshold | Editable? | Why |
|---|---|---|
| Verbal Warning | ✅ | Free to retune. |
| Required Manager Meeting | ✅ | Free to retune. |
| Performance Improvement Plan (PIP) | ❌ | Defined as the employee's policy cap (`employees.policyCap`, currently 16 for everyone) — not an independent value. Editing it would require deciding how it relates to per-employee point caps, which is out of scope here. |

Editing is validated server-side (`src/lib/policy-queries.ts::updatePolicyThreshold`) so the three tiers can never cross each other or the cap: `0 < verbal_warning < manager_meeting < PIP (16)`.

## How it works

- **Schema**: no migration needed — `policy_thresholds` (`key`, `point_value`, `label`, `active`) already existed from Phase 1 of `docs/points-system-brd.md`. The descriptive "action" text (what happens when a threshold fires) isn't a DB column; it's merged in from a small static lookup in `policy-queries.ts` keyed by threshold `key`, so edits don't require a schema change just to keep that copy showing.
- **Read**: `getPolicyThresholds()` in `src/lib/policy-queries.ts` — reads the three rows, ordered by point value, falling back to the static `POLICY_THRESHOLDS` constant if the table is ever empty.
- **Write**: `updatePolicyThreshold(key, pointValue)` — validates the key is one of the two editable ones and the ordering rule above, then updates the row.
- **API**: `src/app/api/policy-thresholds/route.ts` — `GET` (current thresholds) and `PATCH { key, pointValue }` (apply an edit), gated by `hasDemoSession()` like every other action in the app today (no manager/admin role system exists yet).
- **UI**: `src/app/settings/threshold-editor.tsx`, a client component rendering a number input + Save button for each editable threshold, PIP shown read-only with a note explaining why.

### Where edits actually take effect

`src/lib/policy-engine.ts`'s pure functions (`riskLevelFromPoints`, `thresholdsCrossed`, `applyPointEvent`) were generalized to accept an optional `thresholds` array, defaulting to the static `POLICY_THRESHOLDS` so every existing call site keeps working unchanged. The DB-backed call sites now fetch live thresholds and pass them through:

- `policy-queries.ts::recordPointEvent` — new infractions fire warnings at the *current* threshold values.
- `policy-queries.ts::getEmployeePolicySnapshot` — the Track record section's live status (`/dashboard/people/[id]`) bands against current thresholds.
- `insights-queries.ts::employeesAtRisk` / `reliabilityRanking` — `/insights` re-bands against current thresholds, including the "watch floor" used to decide who even appears in the at-risk list.

### Where edits do *not* take effect (known limitation)

The legacy mock-driven pages (`/dashboard`'s roster/alerts, `/analytics`, the person profile page's *displayed* points and risk label) still call `riskLevelFromPoints`/`thresholdsCrossed` with no override, so they keep using the static `POLICY_THRESHOLDS` defaults regardless of what's been edited in Settings. This is the same mock-vs-DB divergence already documented in `docs/employee-track-record-plan.md` — not resolved here, just not made worse.

## Verification performed

- `npx vitest run` — 47/47 passing, including new tests in `policy-engine.test.ts` covering `riskLevelFromPoints`/`thresholdsCrossed`/`applyPointEvent` against a custom (non-default) thresholds array, plus a regression guard confirming default behavior is unchanged.
- `npx tsc --noEmit` / `npx next build` — clean; new `/api/policy-thresholds` route builds alongside the existing routes.
- Live Neon verification (via a temporary script, since removed): raised `verbal_warning` from 2→3 and confirmed an employee at exactly 2 points correctly dropped out of `/insights`' "Employees at risk" list; restored the value afterward; confirmed the ordering validation rejects an invalid edit (`manager_meeting` set below `verbal_warning`) with a clear error message.
