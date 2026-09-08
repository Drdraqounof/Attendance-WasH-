# In-app PIP-crossing notifications

**Date added:** 2026-09-08
**Status:** Implemented (in-app only — see "Out of scope" below)

## What this is

The system already *detects* PIP automatically: the moment an
employee's points reach the 16-point cap (via a recorded infraction or
a manager's manual status change), `recordPointEvent`/
`setEmployeeStatus` in `src/lib/policy-queries.ts` insert a `warnings`
row for the `"pip"` threshold, and every view derives `pip_flag`
status from points at read time — there's no separate "place on PIP"
step. What was missing was that **nobody was told** when this
happened. This change adds a persisted, DB-backed notification feed
and makes the header's notification bell (previously mock data) real.

## Detection — one hook point, not duplicated

`notifyIfPipCrossed(employeeId, employeeName, insertedWarnings)` in
`src/lib/policy-queries.ts` inserts one `notifications` row whenever
`"pip"` is among the just-inserted `warnings` rows. It's called from
both:

- `recordPointEvent` — an infraction pushes points to the cap.
- `setEmployeeStatus` — a manager manually sets an employee's status
  to PIP via `StatusChanger`. This was an open question in
  `docs/planning/employee-track-record-plan.md`; the answer is **yes**,
  a manual PIP placement notifies too, through the exact same code
  path as an automated one.

No new detection logic exists anywhere else — both callers already
had the `warnings` insert; this just captures the inserted rows via
`.returning(...)` and checks for `"pip"`.

## Schema

New `notifications` table (see `src/db/schema.ts`, migration
`drizzle/0002_chemical_the_renegades.sql`) — modeled on `warnings`'
shape, append-only, `status`/`readAt` for read-state rather than
deleting rows (same "ledger it, don't erase it" pattern used
throughout `policy-queries.ts`). FKs to `employees`, `warnings.id`,
`policyThresholds.key`.

**Not reused `attendanceAlerts`**: that table is a delete-and-reinsert
snapshot with no read/unread state — a materially different concept
from an append-only notification event log.

## Surfacing

- `src/lib/notifications-queries.ts` — `getNotifications(limit)`,
  `getUnreadNotificationCount()`, `markNotificationRead(id)`,
  `markAllNotificationsRead()`. Deliberately doesn't touch
  `warnings.status` — read-state and the action-plan/analytics warning
  state stay decoupled.
- `src/app/api/notifications/read/route.ts` — `POST { id } | { all: true }`,
  same `hasDemoSession()` gating as every other mutation route.
- `src/components/notification-bell.tsx` — now DB-backed. Badge shows
  `unreadCount` (not total notification count) — the actual
  "stop nagging" behavior. "Mark all as read" action; clicking a
  notification marks it read before navigating.
- `src/components/ops-shell.tsx` — `OpsHeader` is now async, reads
  live notifications instead of the mock `generateAttendanceAlerts()`.
- `src/app/dashboard/pip-notifications-banner.tsx` — a small, prominent
  callout above the (unchanged, still mock-driven) `AttendanceAlerts`
  section, showing recent PIP-specific notifications.

## Out of scope (explicitly, not built here)

- **Email/SMS delivery.** No `employees.email`/manager-assignment
  schema and no email-sending package exist in this repo. A future
  phase needs both, plus a delivery-log table.
- **Per-manager targeting.** No manager↔employee FK or role system
  exists — every route is `hasDemoSession()`-gated only (any signed-in
  user). Notifications are a global broadcast for now.
- **Migrating the dashboard's `AttendanceAlerts` section off mock
  data.** A separate, pre-existing gap; unrelated to this change.

## Verification performed

- `npx tsc --noEmit` and `npx next build` — both pass.
- `npx vitest run` — 53/53 pass (unrelated to this change, confirms no
  regressions).
- `npx drizzle-kit generate` / `npx drizzle-kit migrate` — migration
  generated and applied successfully against the live Neon dev DB.
