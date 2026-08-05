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
| `/login` | Demo sign-in (any credentials work) |
| `/dashboard` | Shift risk console — click a roster row for details |
| `/dashboard/people/[id]` | Person schedule, points, and ledger |
| `/analytics` | Floor trends, teams, and signal mix |

## Risk bands (demo)

- **Clear** — 0–2 points  
- **Watch** — 3–5 points  
- **At risk** — 6+ points  

## Testing

```bash
npm test
```

Runs the Vitest suite covering the mock data helpers and the attendance scoring utilities (`src/lib/*.test.ts`).

## Notes

- Demo data only — SMS intake is not connected yet.
- More detail: [`docs/plain-english.md`](docs/plain-english.md) and [`docs/system-overview.md`](docs/system-overview.md).
- Full product spec (SMS intake, AI extraction, point rules, alerts, future roadmap): [`docs/Attendance-Plan.md`](docs/Attendance-Plan.md).

## Stack

Next.js · React · TypeScript · Tailwind CSS · Vitest
