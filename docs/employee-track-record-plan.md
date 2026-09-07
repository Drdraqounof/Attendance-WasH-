# Employee Track Record & Status-Change Plan

Status: **Implemented (2026-09-07).** All four parts below are built and verified against the live Neon database.

## 1. Problem Statement

The dashboard still shows a legacy 0–100 "reliability score" in three places, even though the rest of the app has standardized on the real 16-point policy engine (`src/lib/policy-engine.ts`):

| Location | Current code | What it shows |
|---|---|---|
| Attendance Alerts widget | `src/app/dashboard/attendance-alerts.tsx` — `{alert.attendanceScore}/100` | e.g. "0/100" for Marcus Hale (16 points, on a PIP) |
| Employee of the Month card | `src/app/dashboard/page.tsx` — `{nominee.score}/100` | e.g. "100/100" for Luis Ortega (0 points) |
| Person profile "toward policy cap" bar | `src/app/dashboard/people/[id]/page.tsx` | Shows the raw `{towardCap} / {person.policyCap}` fraction but no risk-band label next to it |

All three derive from `attendanceScoreFromPoints()` in `src/lib/attendance-utils.ts`, which converts points into a synthetic 0–100 percentage (`100 - round(points/cap*100)`). That formula predates the 16-point escalation model and reads oddly now — "0/100" for someone on a PIP looks like a broken score, not a policy state.

**Also missing today:**
- No way to see an employee's full history — every point event and every time they crossed a threshold (verbal warning / manager meeting / PIP) — in one place.
- No way for a manager to manually clear an employee off a PIP back to "Clear" status.

### Relevant existing state (confirmed by exploration)
- `/dashboard` and `/dashboard/people/[id]` are **100% mock-data-driven** (`src/lib/people-mock.ts`, `dashboard-mock.ts`, `alerts-mock.ts`) — no DB access anywhere in that chain.
- The real Neon DB (`employees`, `pointEvents`, `warnings`, `policyThresholds` tables — see `docs/database.md`) already has matching rows for the same 11 demo employee IDs (`e01`..`e11`), seeded by `src/db/seed.ts` from the same mock source data. DB-backed reads/writes for a specific employee ID are already possible with zero new migrations.
- **No API routes exist anywhere in the app** (`src/app/api/` is empty). Phase 2 of `docs/points-system-brd.md` already earmarked `src/app/api/point-events/route.ts` and `src/app/api/warnings/route.ts` for exactly this kind of work — this plan builds those rather than inventing new paths.
- **No role/permission system exists anywhere.** Auth is a single `hasDemoSession()` boolean cookie check (`src/lib/auth-mock.ts`), used identically on every page. There is no manager/admin/employee distinction.

## 2. Score-Display Fix (no DB dependency, ships first)

Since the mock data already carries the correct 16-point `points`/`policyCap`, and `riskLevelFromPoints`/`RISK_LABELS` are already re-exported from the real `policy-engine.ts` (via `src/lib/dashboard-mock.ts`, from the prior legacy-pages migration), this part is a **display-only change** — no backend work needed:

- **`attendance-alerts.tsx`**: replace `{alert.attendanceScore}/100` with something like `{alert.points} pts · {RISK_LABELS[riskLevelFromPoints(alert.points)]}`. Requires adding a `points` field to the `AttendanceAlert` type in `src/lib/alerts-mock.ts` (it currently only carries the derived `attendanceScore`, not the raw points).
- **Employee of the Month card** (`dashboard/page.tsx`): replace `{nominee.score}/100` the same way, using `nominee.person.points`/`policyCap`. `attendanceNominees()`/`employeeOfTheMonth()` in `people-mock.ts` keep sorting by lowest points (unchanged) — they just stop exposing a 0–100 `score` for display.
- **Person profile cap bar**: it already shows `{towardCap} / {person.policyCap}` — add the same risk-band badge already used elsewhere on that page (the existing "On PIP" badge pattern) next to it, so all three spots read consistently: a point count plus a plain-language status (Clear / Watch / At Risk / On PIP).

## 3. Track Record Section (new, DB-backed)

A new section on the existing person profile page (`/dashboard/people/[id]`) — not a separate page — showing the employee's full history.

**New query** — `getEmployeeHistory(employeeId)` in `src/lib/policy-queries.ts`, following `src/lib/insights-queries.ts`'s conventions (typed row exports, `and`/`eq`/`desc` composition, no ORM magic beyond what's already used):
- Reads all `pointEvents` for the employee (date, delta, reason, source, ruleCode), newest first.
- Reads all `warnings` for the employee, joined to `policyThresholds` for the label, newest first.
- Merges both into one chronological timeline, e.g.:
  ```ts
  type HistoryEntry =
    | { kind: "point_event"; date: string; delta: number; reason: string; source: string }
    | { kind: "threshold_crossed"; date: string; label: string; status: "open" | "acknowledged" | "resolved" };
  ```

**UI**: a "Track record" section below the existing Points ledger section on the profile page, reusing the existing ledger `<ul>`/`<li>` visual pattern already in that file. Each threshold-crossing entry shows its current status.

**Important caveat to flag in-page (and here):** since `/dashboard/people/[id]` is otherwise mock-driven, this section would be the *first* place on that page reading from the real DB. The employee's *displayed* points (from mock data) and their *track record* (from the DB) are two different data sources until a fuller migration happens — they can disagree for a given demo employee. This plan does not attempt to reconcile that; it's called out as an open question below.

## 4. Status-Change Action (new, DB-backed, first real write path)

"Change status from PIP to Clear" = **reset points to 0**, logged as an auditable action — not a silent DB edit — and any open warnings resolved. Same pattern as the still-unbuilt anniversary reset described in `docs/points-system-brd.md` Phase 5.

- **New function** — `resetEmployeeStatus(employeeId, note?)` in `src/lib/policy-queries.ts`:
  1. Insert a `pointEvents` row: `delta = -currentPoints`, `reason = note ?? "Manually cleared by manager"`, `source = "Supervisor"`.
  2. Set `employees.points = 0`.
  3. Update any `warnings` rows for that employee with `status` in (`open`, `acknowledged`) to `status = "resolved"`.
- **New API route** — `src/app/api/warnings/route.ts` (`POST`, body `{ employeeId }`), calling `resetEmployeeStatus`. Gated by `hasDemoSession()` (401 if not signed in) — this is the **first real mutation-capable API route** in the app, and the path Phase 2 of the BRD already planned for "list/update warning & action-plan status."
- **UI**: a "Clear PIP status" button in the new Track record section, shown when the employee's *DB* points are at/above the PIP threshold (16), calling the new route and refreshing the page afterward.

## 5. Open Questions (not blocking, flagged for later)

| # | Question |
|---|---|
| 1 | The dashboard/profile's displayed points stay mock-sourced while history/reset are DB-sourced. Is a fuller `/dashboard` → DB migration (so both agree) an explicit next phase, and if so, when? |
| 2 | Should `resetEmployeeStatus` be restricted to a genuine manager/admin role once one exists? Today, any signed-in demo user can call it — same as every other action in the app. |
| 3 | Should resets always zero points fully, or should there be a partial-reduction option (e.g. "reduce by N points") for cases short of a full reset? |

## Implementation Notes

- Section 2 (score display) also fixed the identical `{nominee.score}/100` pattern on `/analytics`, since it's the exact same bug via the shared `attendanceNominees()` function — not explicitly called out in the original ask, but left broken it would have been the one remaining "/100" spot in the app.
- `src/lib/alerts-mock.ts`'s `AttendanceAlert` type kept the old `attendanceScore` field (unused in the UI now) because `src/db/seed.ts` still persists it into the `attendance_alerts.attendance_score` DB column — removing it would have required a schema/seed change out of scope here.
- `getEmployeeHistory`/`getEmployeePolicySnapshot`/`resetEmployeeStatus` all live in `src/lib/policy-queries.ts`, following `insights-queries.ts`'s conventions as planned.
- Confirmed live against Neon: `resetEmployeeStatus("e01", ...)` zeroed points (16 → 0), inserted a `-16` ledger entry, and the new history query picked it up immediately. `resolvedWarningCount` was `0` in that test because `src/db/seed.ts` inserts historical `pointEvents` directly rather than through `recordPointEvent()`, so no `warnings` rows exist yet for any seeded employee — the "Clear PIP status" button and `warnings`-resolution logic are correct, but won't have anything to resolve until Phase 2 (`recordPointEvent()` wired to a real intake path) is built.
- The person profile page (`/dashboard/people/[id]`) is now a **hybrid** page: schedule, incident-history narrative, and the demo points ledger are still mock-driven; the new "Track record" section and "Clear PIP status" action read/write the real Neon DB for the same employee ID. The page explicitly labels the new section "Live data" and notes the two sources can disagree, per the open question below.
- DB reads on this page are wrapped in a try/catch that degrades to an inline error message instead of crashing the whole page, since (unlike `/insights`) this page previously had zero DB dependency and shouldn't become fully unavailable if `DATABASE_URL` is misconfigured (see the still-open Vercel `DATABASE_URL` gap from earlier).

## Verification Performed

- `npx vitest run` — 43/43 passing.
- `npx tsc --noEmit` — clean.
- `npx next build` — clean; new `/api/warnings` route builds as a dynamic route alongside the existing pages.
- Live Neon verification (via a temporary script, since removed): confirmed `getEmployeePolicySnapshot`, `getEmployeeHistory`, and `resetEmployeeStatus` all work end-to-end against the seeded `e01` (Marcus Hale) row. The database was reseeded afterward (`npm run db:seed`) to restore the original demo state.

Note: the "Open Questions" table in §5 above is unchanged from the draft — none of those three questions are resolved by this implementation.
