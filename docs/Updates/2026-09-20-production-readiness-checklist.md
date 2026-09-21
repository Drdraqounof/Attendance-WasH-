# Production Readiness Checklist

**Date:** 2026-09-20
**Purpose:** What's left before AttendPoint can run as a real production system, based on gaps already documented across `docs/`. Nothing here is invented — each item cites the doc it comes from.

---

## 1. Authentication & access control (blocking)

Current state is demo-only — see [docs/auth/authentication.md](../auth/authentication.md).

- [ ] Replace the `ap_demo` client-set cookie with a real, server-issued `httpOnly` session cookie
- [ ] Add real credential verification (currently any non-empty email/password, or no credentials at all, signs in)
- [ ] Add a `managers` identity link from session → a specific manager row (the `managers` table already exists in the schema but nothing queries it by session)
- [ ] Add a real role system (Administrator / Manager / Supervisor / Employee) — every route today only checks "is any cookie present," with no distinction between roles
- [ ] Add CSRF protection once real sessions exist
- [ ] Decide and implement per-manager notification targeting (today notifications broadcast to any signed-in user — see `notifications` table note in [docs/database/database.md](../database/database.md))

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

- [ ] **Zoom SMS intake** — blocked on WashCycle providing Zoom account/API access; see [docs/Zoom/Zoom.md](../Zoom/Zoom.md) and the checklist in its section 7
- [ ] **Zoho Shifts integration** — not started; needs API credentials/permissions confirmed with WashCycle, see [docs/planning/2026-09-20-attendance-data-integration-management-plan.md](../planning/2026-09-20-attendance-data-integration-management-plan.md)
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
