@AGENTS.md

## Project orientation

AttendPoint (attendance-WasH-) — Next.js manager dashboard turning attendance
signals into 16-point escalating risk scores against the Wash Cycle Laundry
attendance policy.

- **Docs live in `docs/`**, organized by topic (`overview/`, `database/`,
  `auth/`, `policy/`, `ai/`, `planning/`). Check there before re-deriving
  how something works — most subsystems have a doc, and each one names
  known gaps/limitations explicitly rather than hiding them.
- **`src/lib/policy-engine.ts` is the pure-logic source of truth** for
  points, thresholds, and risk banding — see
  [`docs/database/database.md`](docs/database/database.md).
- **Mock vs. DB split**: a real Neon Postgres schema exists
  (`src/db/schema.ts`), but most pages still read from `src/lib/*-mock.ts`.
  Don't assume a page is DB-backed just because the table exists — check
  the relevant doc first.
- **Auth is demo-only** (`ap_demo` cookie, no real identity/roles) — see
  [`docs/auth/authentication.md`](docs/auth/authentication.md) before
  building anything that assumes a real user/session model.
- Run `npm test`, `npx tsc --noEmit`, and `npm run build` after code
  changes — all three are fast and catch most regressions in this repo.
- **Sensitive information is read-only.** Employee PII, attendance/HR
  records, `.env*` files, credentials, and any other secrets or personal
  data may be read for context but must never be edited, deleted, or
  written to — treat them as inputs only. This applies even when a task
  would otherwise call for modifying that data (e.g. seeding, fixtures,
  cleanup); flag it to the user instead of writing to it directly.
