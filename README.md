# Attendance-WasH- (AttendPoint)

Demo app for managers: turn attendance SMS into live risk scores so you can see who’s clear, who to watch, and who needs a call.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

| Route | What it is |
| ----- | ---------- |
| `/` | Marketing home |
| `/capabilities` | Public capabilities page — live policy-engine point matrix and risk bands |
| `/how-it-works` | Public walkthrough of the signal → risk → action flow, plus FAQ |
| `/login` | Demo sign-in (any credentials work) — see [`docs/auth/authentication.md`](docs/auth/authentication.md) |
| `/dashboard` | Shift risk console — click a roster row for details |
| `/dashboard/people/[id]` | Person schedule, points, and points ledger ("Track record") |
| `/analytics` | Floor trends, risk mix, teams, and signal mix |
| `/insights` | AI-grounded attendance insights: at-risk employees, patterns, executive summary |
| `/insights/report` | Exportable insights report builder |
| `/settings` | Automation toggles, policy thresholds, and escalation schedule (admin-editable) |
| `/profile` | Signed-in manager's profile and notification preferences |

## Risk bands

Rolling 12-month points, per the WCL attendance policy (editable from `/settings`):

- **Clear** — 0 points
- **Low** — 1–3 points
- **Elevated** — 4–7 points
- **At risk** — 8–11 points
- **Critical** — 12–15 points
- **Termination threshold** — 16+ points

## Testing

```bash
npm test          # Vitest suite (policy engine, mock helpers, scoring utilities)
npx tsc --noEmit   # type-check
npm run lint       # ESLint
npm run build      # production build
```

## Database

Schema + seed data exist on Neon Postgres (Drizzle ORM), but most pages still read from `src/lib/*-mock.ts` rather than the database — see [`docs/database/database.md`](docs/database/database.md) for the current mock-vs-DB split and `npm run db:*` commands.

## Notes

- Demo data only — SMS intake is not connected yet.
- Auth is a demo-only cookie session (no real identity provider or roles yet) — see [`docs/auth/authentication.md`](docs/auth/authentication.md).
- More detail: [`docs/overview/plain-english.md`](docs/overview/plain-english.md) and [`docs/overview/system-overview.md`](docs/overview/system-overview.md).
- Full product spec (SMS intake, AI extraction, point rules, alerts, future roadmap): [`docs/planning/Attendance-Plan.md`](docs/planning/Attendance-Plan.md).
- Current stakeholder feedback status (what's done vs. a real gap vs. needs a decision): [`docs/planning/2026-09-16-stakeholder-feedback-response.md`](docs/planning/2026-09-16-stakeholder-feedback-response.md).

## Stack

Next.js · React · TypeScript · Tailwind CSS · Drizzle ORM (Neon Postgres) · OpenAI · Vitest
