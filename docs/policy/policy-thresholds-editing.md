# Editable Policy Thresholds & Escalation Schedule

Status: **Implemented (2026-09-08), realigned to the official policy PDF (2026-09-15).** Covers both editable sections on `/settings`: the 5 automated thresholds, and the 7-rule escalation schedule.

## What this is

Both policy-rule sections on `/settings` used to render hardcoded numbers from `src/lib/policy-engine.ts`'s constants (`POLICY_THRESHOLDS`, `ESCALATION_RULES`). Any signed-in user can now edit all of it directly from that page, and changes take effect immediately for the real (DB-backed) parts of the app.

**2026-09-15:** both constants were realigned to `docs/WCL_Attendance_Policy_AttendPoint_Reference.pdf`, the official, effective Wash Cycle Laundry policy — see the point-value and threshold sections below for the current shape. This superseded the original 3-threshold / 4-rule model described in `docs/planning/points-system-brd.md`.

## Part 1 — Automated policy thresholds

## What's editable

| Threshold | Point value | Editable? | Notes |
|---|---|---|---|
| Low | 1 | ✅ | Verbal warning eligible. |
| Elevated | 4 | ✅ | Verbal + written warning eligible. |
| At Risk | 8 | ✅ | Written warning + unpaid suspension eligible. |
| Critical | 12 | ✅ | Written warning, suspension, and termination at management discretion. |
| Termination Threshold | 16 | ✅ | *Defined* as the employee's policy cap, so editing it also bulk-updates every employee's `policyCap` to the new value (see below) — the UI confirms this with the user before saving. Per the policy, 16+ points requires termination; this system only flags the threshold (never registers points above the cap) rather than taking an automated termination action. |

Editing is validated server-side (`src/lib/policy-queries.ts::updatePolicyThreshold`) so the 5 tiers can never cross each other: `0 < low < elevated < at_risk < critical < termination`.

### The termination-threshold ↔ policy cap coupling

The termination threshold isn't an independent number — it's the point total at which an employee is clamped and flagged (`applyPointEvent`'s `cap` parameter, `riskLevelFromPoints`'s `points >= cap` check). Both already read `employees.policyCap` per employee rather than a hardcoded constant, so editing it just needs to keep that column in sync: `updatePolicyThreshold("termination", pointValue)` updates the `policy_thresholds` row **and** runs `db.update(employees).set({ policyCap: pointValue })` for every employee (there's no per-employee override to preserve — all employees share one cap today, seeded via `POLICY_CAP` in `src/db/seed.ts`). No other code needed to change for this to work correctly, since `applyPointEvent`/`riskLevelFromPoints` were already parameterized by the employee's real cap.

## How it works

- **Schema**: no migration needed — `policy_thresholds` (`key`, `point_value`, `label`, `active`) already existed from Phase 1 of `docs/planning/points-system-brd.md`. The descriptive "action" text (what happens when a threshold fires) isn't a DB column; it's merged in from a small static lookup in `policy-queries.ts` keyed by threshold `key`, so edits don't require a schema change just to keep that copy showing.
- **Read**: `getPolicyThresholds()` in `src/lib/policy-queries.ts` — reads the 5 rows, ordered by point value, falling back to the static `POLICY_THRESHOLDS` constant if the table is ever empty.
- **Write**: `updatePolicyThreshold(key, pointValue)` — validates the key is one of the 5 editable ones and the ordering rule above, then updates the row.
- **API**: `src/app/api/policy-thresholds/route.ts` — `GET` (current thresholds) and `PATCH { key, pointValue }` (apply an edit), gated by `hasDemoSession()` like every other action in the app today (no manager/admin role system exists yet).
- **UI**: `src/app/settings/threshold-editor.tsx`, a client component rendering a number input + Save button for each editable threshold, with an extra note on the termination threshold explaining the policy-cap coupling.

### Where edits actually take effect

`src/lib/policy-engine.ts`'s pure functions (`riskLevelFromPoints`, `thresholdsCrossed`, `applyPointEvent`) were generalized to accept an optional `thresholds` array, defaulting to the static `POLICY_THRESHOLDS` so every existing call site keeps working unchanged. The DB-backed call sites now fetch live thresholds and pass them through:

- `policy-queries.ts::recordPointEvent` — new infractions fire warnings at the *current* threshold values.
- `policy-queries.ts::getEmployeePolicySnapshot` — the Track record section's live status (`/dashboard/people/[id]`) bands against current thresholds.
- `insights-queries.ts::employeesAtRisk` / `reliabilityRanking` — `/insights` re-bands against current thresholds, including the "watch floor" used to decide who even appears in the at-risk list.

### Where edits do *not* take effect (known limitation)

The legacy mock-driven pages (`/dashboard`'s roster/alerts, `/analytics`, the person profile page's *displayed* points and risk label) still call `riskLevelFromPoints`/`thresholdsCrossed` with no override, so they keep using the static `POLICY_THRESHOLDS` defaults regardless of what's been edited in Settings. This is the same mock-vs-DB divergence already documented in `docs/planning/employee-track-record-plan.md` — not resolved here, just not made worse.

## Part 2 — Escalation schedule

The "Attendance escalation schedule" section (how many points each infraction is worth — the policy PDF §4 duration × notice-status matrix, plus the flat non-attendance-written-warning rule: late 15min–1hr +1/+2, late 1–3hr +2/+4, absent/late 3hr+ +4/+8 [with/without notice], written warning for a non-attendance issue +4) is editable the same way.

- **Schema**: no migration needed — `point_rules.points`/`.code` already existed from Phase 1, now seeded with the 7 escalation rows. Unlike thresholds, `point_rules.label` is a real DB column, so no static-text merge is needed for display.
- **Read**: `getEscalationRules()` in `src/lib/policy-queries.ts` — reads the 7 rows with a non-null `code`, ordered by points, falling back to the static `ESCALATION_RULES` if the table is ever empty.
- **Write**: `updateEscalationRule(code, points)` — validates that each duration band's without-notice value stays at or above its with-notice value, and that the three duration bands escalate (15min–1hr ≤ 1–3hr ≤ 3hr+, per notice status).
- **API**: `src/app/api/escalation-rules/route.ts` — `GET`/`PATCH { code, points }`, same `hasDemoSession()` gating as everything else.
- **UI**: `src/app/settings/escalation-editor.tsx` — a number input + Save per rule.
- **Where it takes effect**: `policy-engine.ts::pointsForRule`/`applyPointEvent` were generalized the same way as the thresholds (optional `rules`/`escalationRules` override, defaulting to `ESCALATION_RULES`). `policy-queries.ts::recordPointEvent` fetches live rules and passes them through, so the very next infraction recorded through it uses the edited point value for its delta.
- Same known limitation as Part 1: legacy mock-driven pages/pointLedger data are unaffected by edits here.

## Verification performed (2026-09-08, original 3-threshold/4-rule model)

- `npx vitest run` — 49/49 passing, including tests in `policy-engine.test.ts` covering `riskLevelFromPoints`/`thresholdsCrossed`/`applyPointEvent`/`pointsForRule` against custom (non-default) thresholds and escalation rules, plus regression guards confirming default behavior is unchanged.
- `npx tsc --noEmit` / `npx next build` — clean; `/api/policy-thresholds` and `/api/escalation-rules` both build alongside the existing routes.
- Live Neon verification (via temporary scripts, since removed):
  - Raised `verbal_warning` from 2→3 and confirmed an employee at exactly 2 points correctly dropped out of `/insights`' "Employees at risk" list; restored the value afterward.
  - Confirmed the ordering validation rejects an invalid edit (`manager_meeting` set below `verbal_warning`) with a clear error message.
  - Raised `pip` from 16→20 and confirmed every employee's `policyCap` bulk-updated to 20, and Marcus Hale (seeded at 16 points, previously `pip_flag`) correctly re-banded to `at_risk` since he was no longer at the (now higher) cap. Restored to 16 afterward and confirmed he flipped back to `pip_flag`.
  - Raised `severe_late_absence` from 4→6 and confirmed a `recordPointEvent` call using that rule code added exactly 6 points (not 4) to a test employee's total; confirmed the escalation-tier ordering validation rejects an invalid edit. Database reseeded afterward to restore original demo state.

## Verification performed (2026-09-15, realignment to the official policy PDF)

- `npx vitest run` — 61/61 passing, including the rewritten `policy-engine.test.ts` covering the 7-rule matrix, the 5-band `riskLevelFromPoints`, and the same custom-thresholds/custom-rules regression pattern as before.
- `npx tsc --noEmit` — clean across the whole app; the widened `RiskLevel`/`EscalationRuleCode`/`PolicyThresholdKey` unions surfaced every consumer that needed updating (dashboard/analytics/insights pages, i18n label dictionaries, mock data, CSV import).
- `npx next build` — clean production build, all 19 routes compile.
