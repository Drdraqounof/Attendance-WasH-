# Attendance-WasH- (AttendPoint)

Manager dashboard for Wash Cycle Laundry: turns attendance signals into 16-point escalating risk scores against the WCL attendance policy, so managers can see who's clear, who to watch, and who needs a call.

Each user signs in with their own account and works as **HR** (all stations) or a **Supervisor** (their station only). What they see and can change is scoped to that role and station.

## Quick start

```bash
npm install
npm run db:migrate     # first run, or after pulling new migrations
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in, or create an account at `/register`.

### Environment (`.env`, git-ignored)

| Variable | Needed for |
| --- | --- |
| `DATABASE_URL` | **Required.** Neon Postgres connection. |
| `OPENAI_API_KEY` | AI summaries on `/insights`. Without it, the page falls back to rule-based text. |
| `EIA_API_KEY` | Live gas price on `/map`. Without it, $3.50/gal is used. |
| `APP_URL` | Base URL for password reset links. Defaults to the request origin. |
| `SEED_LOGIN_EMAILS`, `SEED_LOGIN_PASSWORD` | `npm run db:seed-login` (create sign-ins). |
| `SEED_ROLE_ASSIGNMENTS` | `npm run db:seed-roles` (assign roles/stations; JSON, format in `src/db/seed-roles.ts`). |

### Accounts

- **Self-service:** `/register` asks for name, email, password, and role. Supervisors also pick a station. The account can sign in straight away.
- **Scripted:**

  ```bash
  npm run db:seed-login   # create or update sign-ins
  npm run db:seed-roles   # stations + role assignments
  ```

- **Forgot password:** `/forgot-password` issues a one-time link, valid for 1 hour. No email provider is connected yet, so **in development the link is printed in the `npm run dev` terminal.**

## Pages

| Route | What it is | Who |
| ----- | ---------- | --- |
| `/` | Marketing home | Public |
| `/capabilities` | Live policy-engine point matrix and risk bands | Public |
| `/how-it-works` | Signal → risk → action walkthrough, plus FAQ | Public |
| `/login` | Sign in, with links to register and reset your password | Public |
| `/register` | Create an account (role and station chosen at sign-up, for now) | Public |
| `/forgot-password`, `/reset-password` | Request and use a one-time reset link | Public |
| `/login/workspace` | Pick a role/station, when you have more than one | Signed in |
| `/dashboard` | Shift risk console; click a roster row for details | HR, Supervisor |
| `/dashboard/people/[id]` | Schedule, points and track record; HR can change status, and point events can be voided/restored | HR, Supervisor (own station) |
| `/analytics` | Floor trends, risk mix, teams and signal mix | HR, Supervisor |
| `/insights` | AI-grounded insights: at-risk employees, patterns, executive summary | HR, Supervisor |
| `/insights/report` | Exportable insights report builder (PDF) | HR, Supervisor |
| `/map` | Fleet delivery routes on a Boston map, with a full-screen mode (demo routes) | HR, Supervisor |
| `/settings` | Automation toggles, policy thresholds, escalation schedule | Edit: HR · View: Supervisor |
| `/profile` | Your account, role assignments and notification preferences | Signed in |

Full permission matrix: [`docs/auth/roles-and-stations.md`](docs/auth/roles-and-stations.md).

## Risk bands

Rolling 12-month points, per the WCL attendance policy (editable by HR from `/settings`):

- **Clear** — 0 points
- **Low** — 1–3 points
- **Elevated** — 4–7 points
- **At risk** — 8–11 points
- **Critical** — 12–15 points
- **Termination threshold** — 16+ points

## Testing

```bash
npm test           # Vitest (policy engine, access rules, account rules, fleet math, mock helpers)
npx tsc --noEmit   # type-check
npm run lint       # ESLint
npm run build      # production build
```

## Database

Neon Postgres via Drizzle ORM. Migrations live in `drizzle/`; apply them with `npm run db:migrate`.

Accounts, sessions, roles/stations, notifications, warnings, the point ledger and the audit log are all in the database. However, **`/dashboard`, `/analytics` and most of the person page still read demo data** from `src/lib/*-mock.ts`. See [`docs/database/database.md`](docs/database/database.md) for the split.

## Known limitations

- **Anyone can register as HR.** Self-selected roles stand in for an HR approval step that doesn't exist yet. Fix this before production.
- **Demo data vs. real stations.** Demo-data pages use different team names from the real stations (Dock A, Dock B, Pack line, Sort hub, Yard), so a Supervisor sees them empty.
- **No email delivery.** Password reset links aren't emailed yet.
- **No rate limiting** on sign-in, register or reset.
- **SMS intake isn't connected.** Zoom/Zoho integrations are blocked on WashCycle approval.

The full list is in [`docs/Updates/2026-09-20-production-readiness-checklist.md`](docs/Updates/2026-09-20-production-readiness-checklist.md).

## Docs

- Overview: [`docs/overview/plain-english.md`](docs/overview/plain-english.md) · [`docs/overview/system-overview.md`](docs/overview/system-overview.md)
- Sign-in, registration, password reset: [`docs/auth/authentication.md`](docs/auth/authentication.md)
- Roles, stations, scoping, audit: [`docs/auth/roles-and-stations.md`](docs/auth/roles-and-stations.md)
- Map: [`docs/fleet/map.md`](docs/fleet/map.md)
- Product spec: [`docs/planning/Attendance-Plan.md`](docs/planning/Attendance-Plan.md) · Stakeholder feedback status: [`docs/planning/2026-09-16-stakeholder-feedback-response.md`](docs/planning/2026-09-16-stakeholder-feedback-response.md)

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS · Drizzle ORM (Neon Postgres) · Leaflet · OpenAI · Vitest
