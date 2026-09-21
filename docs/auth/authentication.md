# Authentication — DB-backed email/password session

**Status:** Real credential check against a Neon-stored allowlist (2026-09-21).
Still no real identity provider, per-manager user table, or role system —
see "Known limitations" below.

## What this is

Every "signed-in" page and API route in the app gates on a single boolean:
whether the `ap_demo` cookie is present and equal to `"1"`. That cookie is
now only ever set server-side, after `/api/login` verifies the submitted
email + password against the `login_credentials` table in Neon
(`src/db/schema.ts`). There is still no per-user identity or session
token — everyone who signs in with an allowed email gets the same shared
session value, so managers are still not distinguished from one another
once signed in (see "Known limitations").

## Files

| File | Purpose |
| --- | --- |
| `src/lib/auth-constants.ts` | Defines `DEMO_COOKIE = "ap_demo"` — the one shared constant, safe to import from client or server code. |
| `src/lib/password-hash.ts` | `hashPassword()` / `passwordMatches()` — salted scrypt hashing (`node:crypto`, no external dependency). Kept free of any Next.js import so the seed script (plain Node/tsx) can use it too. |
| `src/lib/auth-mock.ts` | Exposes `hasDemoSession()` (server-only async cookie check) and `verifyCredentials(email, password)`, which looks up `login_credentials` by (lowercased) email and compares the password hash via `passwordMatches()`. Returns `false` for an unknown email or wrong password; only throws on an actual DB failure. |
| `src/db/schema.ts` → `loginCredentials` | `email` (primary key) + `passwordHash` (`"<salt-hex>:<hash-hex>"`) + `createdAt`. Deliberately separate from `managers` — this only stores what's needed to gate sign-in, not a full HR profile. |
| `src/db/seed-login-credentials.ts` | `npm run db:seed-login` — upserts the current org allowlist (email list + one shared temp password, both hardcoded in the script today) into `login_credentials`. Idempotent; re-run after rotating the password. |
| `src/app/api/login/route.ts` | `POST { email, password }` — calls `verifyCredentials`; on success, sets the `ap_demo` cookie via a server `Set-Cookie` header (`httpOnly`, `SameSite=Lax`, `secure` in production, 24h expiry). On failure, returns 401 with an error message. |
| `src/app/api/logout/route.ts` | `POST` — clears the cookie via `Set-Cookie` (`maxAge: 0`). Needed because an `httpOnly` cookie can't be cleared from client JS. |
| `src/app/login/page.tsx` + `src/app/login/login-form.tsx` | The sign-in UI. A client component that `fetch()`s `/api/login` and shows its error message on failure. No client-side cookie access. |
| `src/app/login/language/page.tsx` + `language-picker.tsx` | Post-login step that sets the `attendpoint_lang` cookie before landing on `/dashboard` — separate from auth, see `src/lib/i18n.ts`. |
| `src/app/dashboard/sign-out-button.tsx` | Calls `/api/logout`, then redirects to `/`. |

## How sign-in works

1. `LoginForm` submits email + password to `POST /api/login`.
2. The route looks up the email in `login_credentials` and compares the
   password against the stored salted scrypt hash. Wrong email, wrong
   password, or a DB error all return an error; nothing is ever silently
   accepted.
3. On success, the server issues `Set-Cookie: ap_demo=1; HttpOnly; ...`
   (24-hour expiry). The cookie is no longer readable or forgeable from
   devtools/JS.
4. The page does a full navigation (`window.location.assign`, not a
   client-side router push) to `/login/language`, so the cookie is
   guaranteed to be present on the very next server request.
5. `/login/language` sets `attendpoint_lang` and forwards to `/dashboard`.

## Configuration

Requires `DATABASE_URL` in `.env` (same Neon connection as the rest of the
app — see `docs/database/database.md`). No separate env vars are needed
for login itself; the allowlist lives in the `login_credentials` table,
seeded/updated via:

```bash
npm run db:seed-login
```

Edit the email list and temp password at the top of
`src/db/seed-login-credentials.ts`, then re-run — it's an idempotent
upsert keyed on email.

**Passwords in Vercel/production**: this table is in Neon, not `.env`, so
there's nothing additional to configure in Vercel's environment variables
beyond the `DATABASE_URL` it already needs.

## How route gating works

Every protected Server Component page and API route repeats the same
pattern — there's no shared middleware:

```ts
const signedIn = await hasDemoSession();
if (!signedIn) redirect("/login"); // pages
// or, in API routes:
if (!signedIn) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
```

Gated today: `/dashboard`, `/dashboard/people/[id]`, `/analytics`,
`/insights`, `/insights/report`, `/settings`, `/profile`, and the API
routes `attendance-import`, `escalation-rules`, `policy-thresholds`,
`warnings`, `notifications/read`, `insights/report`,
`insights/summary/refine`. Public (no gating): `/`, `/capabilities`,
`/how-it-works`, `/login`.

## Known limitations

- **No identity.** There's no `managers`-table link from the session
  to a specific manager row — the `managers` table exists in the DB
  schema (`docs/database/database.md`) but nothing ever queries it by
  session, and `login_credentials` is a separate table from `managers`
  (see "Files" above). Every signed-in visitor sees the same data and
  can perform the same actions (editing thresholds, marking
  notifications read, etc.) — see the note on `notifications` in
  `docs/database/database.md` for a concrete consequence of this.
  Credential checking is now real, but it's still one shared session
  value for every allowed email, not a per-manager one.
- **No role system.** "Admin" and "manager" aren't distinguished
  anywhere — every gated route/API just checks `hasDemoSession()`.
- **Shared temp password.** Every seeded email currently gets the same
  password (set in `seed-login-credentials.ts`) for initial rollout —
  rotate it (and move to per-user passwords, e.g. a real sign-up/reset
  flow) before this gates anything with real consequences long-term.
- **Allowlist is script-managed, not admin-UI-managed.** Adding/removing
  a login email means editing `seed-login-credentials.ts` and re-running
  it — there's no in-app way to manage the allowlist yet.
- **No CSRF protection.** `/api/login` and `/api/logout` aren't CSRF
  hardened yet — low risk today since login/logout are the only things
  they do, but revisit if either route's scope grows.
- ~~Client-set cookie, not `httpOnly`~~ — fixed 2026-09-21: the cookie
  is now set via a server `Set-Cookie` header from `/api/login`, with
  `httpOnly` and `secure` (in production) flags.
- ~~Shared org allowlist lived in `.env`~~ — replaced 2026-09-21 with a
  DB-backed `login_credentials` table, so Vercel needs no extra env vars
  for login beyond `DATABASE_URL`.
