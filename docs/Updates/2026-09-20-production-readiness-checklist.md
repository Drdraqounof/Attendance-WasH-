# Production Readiness Checklist

**Date:** 2026-09-20
**Purpose:** What's left before AttendPoint can run as a real production system, based on gaps already documented across `docs/`. Nothing here is invented — each item cites the doc it comes from.

---

## 1. Authentication & access control (blocking)

Per-user sessions, HR/Supervisor roles with station scoping, registration and password reset are built (2026-09-25 to 09-28). See [docs/auth/authentication.md](../auth/authentication.md) and [docs/auth/roles-and-stations.md](../auth/roles-and-stations.md). Remaining items:

- [x] Replace the `ap_demo` client-set cookie with a real, server-issued `httpOnly` session cookie (per-user `ap_session`, 2026-09-25)
- [x] Add real credential verification (currently any non-empty email/password, or no credentials at all, signs in)
- [x] Link session → a specific user (`sessions` → `login_credentials`, profile in `user_profiles`, optional `managers` link) — 2026-09-25
- [x] Add a real role system — HR / Supervisor with station scoping, 2026-09-25 ([roles-and-stations.md](../auth/roles-and-stations.md)). Still open: in-app admin UI for assignments; Employee self-service role if wanted
- [~] Add CSRF protection once real sessions exist — basic Origin check on mutating routes done; no token yet
- [ ] **Replace self-selected roles at registration** with an HR approval queue or invite-only HR. Today anyone can register as HR.
- [ ] Connect an email provider for password reset links (`src/lib/account.ts::deliverResetLink`). Links are only printed in dev today.
- [ ] Rate-limit `/api/login`, `/api/register` and `/api/password-reset/request`
- [ ] In-app HR "Users & roles" page (assignments are script-managed beyond sign-up)
- [ ] Align demo-data pages with real stations. Bridged for the demo on 2026-10-04 by `DEMO_STATION_TEAMS` (each station sees made-up mock teams). Still open: move `/dashboard`, `/analytics`, `/map` and person pages to DB queries so supervisors see their real staff.
- [x] Per-user notification targeting — scoped by station, per-user read state (2026-09-25) (previously notifications broadcast to any signed-in user — see `notifications` table note in [docs/database/database.md](../database/database.md))

## 2. Database wiring (blocking)

Schema is migrated and seeded on Neon, but most pages still read mock files — see [docs/database/database.md](../database/database.md).

- [ ] Wire `/dashboard`, `/dashboard/people/[id]`, `/analytics`, `/settings` to real DB queries instead of `src/lib/*-mock.ts`
- [ ] Wire `automation_toggles` — currently the table exists but is never read/written; `/settings`' toggle UI persists to browser `localStorage` only
- [ ] Confirm `DATABASE_URL` / Neon plan is provisioned for production load (current one is a dev/demo connection)
- [ ] Set up DB backups/point-in-time recovery on the production Neon project (this is real employee attendance/PII data — see the read-only sensitivity rule in `CLAUDE.md`)

## 3. Attendance policy completeness

Per [docs/database/database.md](../database/database.md)'s 2026-09-15 note and [docs/policy/leave-and-restorative-followup.md](../policy/leave-and-restorative-followup.md):

- [ ] Build leave-type accrual (Sick / Personal / Vacation / Bereavement)
- [ ] Build the full restorative-process / PIP workflow (written offers, point cancellation)
- [ ] Confirm termination-threshold handling stays a flag/badge, not an automated action, per policy intent

## 4. External integrations (blocked on third parties)

- [ ] **Zoom SMS intake** — blocked on WashCycle's team approving access to Zoom (account/API access); see [docs/Zoom/Zoom.md](../Zoom/Zoom.md) and the checklist in its section 7. Status as of 2026-09-25: awaiting approval.
- [ ] **Zoho Shifts integration** — not started; blocked on the same team approval, this time for Zoho access, see [docs/planning/2026-09-20-attendance-data-integration-management-plan.md](../planning/2026-09-20-attendance-data-integration-management-plan.md). Status as of 2026-09-25: awaiting approval.
- [ ] Decide bulk historical-import path for pre-existing Excel attendance records beyond the current single-file CSV/Excel importer (see section 1 of the same plan doc)

## 5. Security

- [ ] Resolve or formally accept the `xlsx` npm package's known high-severity advisories (prototype pollution, ReDoS) — currently accepted as low-risk because parsing is client-side on a self-uploaded file only; re-evaluate if that assumption changes
- [ ] Run `npm audit` and address other flagged issues before shipping
- [ ] Confirm `.env`/secrets are never committed and that production secrets are managed via the hosting platform's secret store, not `.env` files
- [ ] Add rate limiting / abuse protection to public + mutation API routes (`attendance-import`, etc.) — none exists today

## 6. Operational readiness

- [ ] Confirm hosting/deployment target (Vercel, etc.) and environment variable setup for production
- [ ] Add monitoring/error tracking and uptime alerting — none configured yet
- [ ] Add structured logging for the point-event ledger and notification pipeline for auditability
- [ ] Run `npm test`, `npx tsc --noEmit`, and `npm run build` as a CI gate on every PR (currently manual, per `CLAUDE.md`)

## 7. Data & compliance

- [ ] Confirm data-retention and access policy for employee PII/attendance history before go-live
- [ ] Confirm who is authorized to view/edit sensitive records in production, tied to the role system in section 1
