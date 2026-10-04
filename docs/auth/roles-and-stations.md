# Roles & stations — per-user sessions and scoped access

**Status:** Built 2026-09-25. Migration 0004 is applied to the shared
Neon database (2026-09-28). Accounts get roles through `/register` or
`npm run db:seed-roles` (see "Setup").

## What this is

Each person who signs in now gets their own session instead of the old
shared `ap_demo=1` cookie. Every account is assigned one or more
**roles**, and each role covers either all stations or one specific
**station**. After signing in, the user picks which assignment to work
under. That choice decides what data they see and what they can change.

The goal is containment. Everyone works on the same real records, but
each user reaches only their own station's slice, and their "delete" is
a soft delete. A supervisor's mistake stays inside their station, can be
undone, and is recorded.

## Roles and what they can do

| Capability | HR | Supervisor |
| --- | --- | --- |
| Stations visible | All (or one, if assigned that way) | Only assigned station(s); the one picked at sign-in is active |
| Dashboard, analytics, insights, AI summary/report, person pages | Everyone in scope | Only employees at the active station |
| Another station's person page | — | 404, same as a missing employee |
| Attendance import | Any in-scope employee | Rows for employees at other stations are rejected, row by row |
| Change an employee's status (`/api/warnings`) | Yes | No — manual point adjustments are HR-controlled |
| Edit policy thresholds / escalation rules | Yes | Read-only (these apply org-wide) |
| Notifications | For employees in scope | For employees at their station |
| Mark notifications read | Affects only that user | Affects only that user |
| Void (soft-delete) a point event, and undo it | Any event in scope | Only events they recorded, at their station |
| Map — fleet delivery routes (`/map`, see [map.md](../fleet/map.md)) | Yes | Yes — demo fleet, not scoped by station yet |

"Station" currently means an `employees.team` value. In the shared
database these are **Dock A, Dock B, Pack line, Sort hub and Yard**.
See "Known gaps".

## Sign-in flow

1. `/login` → `POST /api/login` checks the password against
   `login_credentials`, as before (see [authentication.md](authentication.md)).
2. If the account has no valid assignment, sign-in is refused with
   "Your account doesn't have a role yet". Accounts created at
   `/register` always have one (see below).
3. A `sessions` row is created and an httpOnly `ap_session` cookie is set.
   The cookie holds a random token; the database stores only its sha256.
4. **One assignment** → it becomes active automatically and the user goes
   to `/login/language`.
   **More than one** → `/login/workspace` lists *only that user's*
   assignments; picking one calls `POST /api/session/context`.
5. `/login/language` → `/dashboard`. The header shows a role/station
   badge, plus a **Switch** link when the user has more than one
   assignment.
6. Sign out revokes the session row, so a copied cookie stops working.

On every request the active assignment is re-checked against
`user_roles`. Removing someone's assignment takes effect immediately,
even for a session that's already open.

## Files

| File | Purpose |
| --- | --- |
| `src/lib/access.ts` | Pure rules with no DB access: `stationScope`, `inScope`, `filterToScope`, `findAssignment`, `pickDefaultAssignment`, `canVoidEvent`, `isSameOrigin`. Tested in `access.test.ts`. |
| `src/lib/session.ts` | Server-only. `createSession`, `getSession` (memoized per request), `setActiveAssignment`, `revokeCurrentSession`, the page guard `requireSession()`, the API guard `requireApiSession(request, { hrOnly, mutating })`, and `writeAudit()`. |
| `src/lib/scope-sql.ts` | `employeeScopeFilter(scope)`, the SQL `WHERE` fragment used by every scoped query. |
| `src/proxy.ts` | Next 16 proxy. Redirects requests with no session cookie to `/login`. It's an early redirect only; the real checks are in `session.ts`. |
| `src/app/login/workspace/*` | Workspace picker. |
| `src/app/api/session/context/route.ts` | Switch the active workspace (only to one of your own assignments). |
| `src/app/api/point-events/[id]/void/route.ts` | `POST` voids a point event, `DELETE` restores it. |
| `src/app/dashboard/people/[id]/void-event-button.tsx` | Void / Restore button on the track record. |
| `src/db/seed-roles.ts` | `npm run db:seed-roles`, which creates stations and assignments. |

## New tables (migration `drizzle/0004_roles_and_stations.sql`)

| Table | Holds |
| --- | --- |
| `stations` | One row per station. `name` equals an `employees.team` value. |
| `user_roles` | (email, role, station_id). `station_id` null = all stations, allowed for HR only. |
| `user_profiles` | Display name, and an optional link to a `managers` row. |
| `sessions` | Hashed token, user, active role/station, expiry, revocation. |
| `notification_reads` | Per-user read state for notifications. |
| `audit_log` | Append-only record of who did what, under which role/station, with before/after values. |

Nullable columns added to existing tables: `point_events.created_by`,
`point_events.voided_at`, `point_events.voided_by`, and
`warnings.created_by`. Existing rows keep null in these; no data is
changed.

**What's audited:** status changes, threshold edits, escalation rule
edits, attendance imports, and point-event void/restore.

**What voiding does:** the event stays in the track record, shown struck
through, but stops counting in rolling points, insights, and the
employee's running total. Restore reverses it. Warnings or notifications
the event already triggered are left as they are; HR resolves them with
a status change if needed.

## How accounts get roles

- **`/register`**: the person picks **HR** or **Supervisor** (and a
  station for Supervisor), and it's saved to `user_roles` immediately.
  **Temporary:** there's no approval step yet, so anyone can make
  themselves HR. Replace this with an approval queue, or make HR
  invite-only, before production.
- **`npm run db:seed-roles`**: scripted assignments. This is the only
  way to give one person several roles or stations.

## Setup (run these yourself; they write to the database)

```bash
npm run db:migrate          # applies 0004 (roles/stations) and 0005 (password reset)
npm run db:seed-login       # if the accounts don't exist yet
npm run db:seed-roles       # stations + assignments
```

`db:seed-roles` reads `SEED_ROLE_ASSIGNMENTS` from `.env` as JSON:

```bash
SEED_ROLE_ASSIGNMENTS='[
  {"email":"hr@example.com","name":"Dana (HR)","role":"hr"},
  {"email":"sup@example.com","name":"Sam Lee","role":"supervisor","stations":["Dock A","Pack line"]}
]'
```

How the seed behaves:
- It replaces the listed users' assignments. To revoke a station, remove
  it from the list and re-run.
- The same email can appear more than once, to hold both HR and
  Supervisor.
- Every email must already exist in `login_credentials`.
- Station names must match exactly. The script lists the known ones
  and aborts before writing if one doesn't match.
- The variables can be passed inline to avoid editing `.env`:
  `SEED_ROLE_ASSIGNMENTS='[...]' npm run db:seed-roles`.

**Existing sessions:** everyone gets signed out once. Old `ap_demo`
cookies are no longer accepted.

## Known gaps

- **Self-selected roles at sign-up** (see "How accounts get roles").
  This is the most important gap before production.
- **No admin UI for assignments.** Beyond sign-up, they're managed
  through `db:seed-roles`. An HR-only "Users & roles" page is the
  natural next step.
- **Stations are derived from `team`.** Teams mix job type and shift,
  for example "Team Leads" vs. "First Shift". When real stations or
  sites exist, add a proper `employees.station_id` (a schema change on
  HR records, so it needs sign-off) and point `stationScope` at it.
- **Mock-backed pages don't match real stations.** `/dashboard`,
  `/analytics`, and most of `/dashboard/people/[id]` still read
  `DEMO_ROSTER`. Its team names ("Delivery Drivers", "Team Leads", …)
  differ from the database stations (Dock A, …), so for a Supervisor
  these pages are empty and every person page returns 404. HR is
  unaffected. The fix is to move those pages to DB queries, and in the
  meantime to check person-page scope against the DB team
  (`getEmployeeTeam`).
- **Void only affects points.** Voiding doesn't re-evaluate warnings
  that were already opened.
- **English-only chrome.** The new UI text (workspace picker, badge,
  profile cards, void button, account pages) isn't in
  `src/lib/i18n.ts` yet.
- **CSRF protection is basic.** It's an Origin-header check plus
  `SameSite=Lax`, with no token.
