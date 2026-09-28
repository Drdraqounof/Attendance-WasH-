# Authentication — per-user sessions with roles & stations

**Status:** Real credential check against a Neon-stored allowlist
(2026-09-21), now with per-user DB-backed sessions, HR/Supervisor roles,
and station scoping (2026-09-25). Roles and stations are documented in
[roles-and-stations.md](roles-and-stations.md). This page covers the
sign-in mechanics.

## What this is

Sign-in verifies an email and password against the `login_credentials`
table. It then creates a **per-user session**: a random token in an
httpOnly `ap_session` cookie, with its sha256 stored in `sessions`.
Every signed-in page and API route resolves that session to a specific
user, their role/station assignments, and the workspace they picked.
The old shared `ap_demo=1` cookie is gone.

## Files

| File | Purpose |
| --- | --- |
| `src/lib/auth-constants.ts` | `SESSION_COOKIE = "ap_session"`. Safe to import from client or server code. |
| `src/lib/password-hash.ts` | `hashPassword()` / `passwordMatches()`. Salted scrypt via `node:crypto`. |
| `src/lib/auth-mock.ts` | `verifyCredentials(email, password)` looks up `login_credentials` and compares the hash. `hasDemoSession()` is kept as a thin compatibility shim (`getSession() !== null`); new code should use the guards in `session.ts`. |
| `src/lib/session.ts` | Session lifecycle and guards. See [roles-and-stations.md](roles-and-stations.md). |
| `src/db/schema.ts` → `loginCredentials` | `email` (PK) + `passwordHash` + `createdAt`. Unchanged; the new role and session tables reference it by email. |
| `src/db/seed-login-credentials.ts` | `npm run db:seed-login` upserts the allowlist from `SEED_LOGIN_EMAILS` / `SEED_LOGIN_PASSWORD` in `.env`. |
| `src/app/api/login/route.ts` | `POST { email, password }`. Verifies the credentials, requires at least one role assignment, creates a session, sets the cookie, and returns `{ next }` (`/login/workspace` or `/login/language`). |
| `src/app/api/logout/route.ts` | `POST`. Revokes the session row and clears the cookie. |
| `src/app/login/login-form.tsx` | Sign-in UI. Navigates to whatever `next` the server returns. |
| `src/app/login/workspace/*` | Role/station picker, for users with more than one assignment. |
| `src/app/login/language/*` | Language step (`attendpoint_lang` cookie). Requires an active workspace. |
| `src/proxy.ts` | Early redirect to `/login` for protected paths when there's no session cookie. |

## How sign-in works

1. `LoginForm` POSTs email + password to `/api/login`.
2. The credentials are checked against `login_credentials`. A wrong
   email, a wrong password, or a DB error all return an error.
3. The user's assignments are loaded from `user_roles`. If there are
   none, the response is a 403 ("no role assigned").
4. A `sessions` row is inserted (24h expiry) and `ap_session` is set
   (`httpOnly`, `SameSite=Lax`, `secure` in production). With exactly
   one assignment, that assignment is made active straight away.
5. The browser does a full navigation to `/login/workspace` (to pick an
   assignment) or `/login/language`, then continues to `/dashboard`.

## Registration (`/register`)

- **Who:** anyone can create an account with their name, email and a
  password. The password must be at least 8 characters with a letter and
  a number (`src/lib/account-rules.ts`).
- **Role:** the person picks their role, **HR** or **Supervisor**. A
  supervisor also picks their station from the `stations` table. The
  choice is saved to `user_roles`, so the account can **sign in
  straight away**.
- **What it creates:** rows in `login_credentials` (scrypt hash),
  `user_profiles` and `user_roles`.
- **Temporary:** there's no approval step yet, so anyone can register
  as HR. Before production, replace this with an approval queue (for
  example, new sign-ups land with no role and HR approves them) or
  restrict HR to invitations.
- **Duplicates:** an email that already has an account gets a 409
  pointing to sign in / reset password.
- **Code:** `src/app/register/*`, `src/app/api/register/route.ts`,
  `src/lib/account.ts::registerAccount`.

## Password reset (`/forgot-password` → `/reset-password`)

1. The user enters their email. `POST /api/password-reset/request`
   always returns the same answer, so it can't be used to discover
   accounts.
2. If the account exists, a one-time token is created. Only its sha256
   is stored, in `password_reset_tokens`. The token expires after
   **1 hour** and works **once**.
3. **Delivery:** there's no email provider yet.
   - **Development:** the link is printed in the dev server terminal
     (`[password-reset] Reset link for …`).
   - **Production:** nothing is sent. Wire a provider into
     `src/lib/account.ts::deliverResetLink` before go-live.
   - **Origin:** links use `APP_URL` if set, otherwise the request's
     origin.
4. `/reset-password?token=…` shows the new-password form, or "link has
   expired". The page sets `referrer: no-referrer`, so the token isn't
   leaked to other sites.
5. `POST /api/password-reset/confirm` claims the token, sets the new
   hash, burns any other outstanding links for that account, and
   **revokes all of its sessions**. The user is then sent to
   `/login?reset=1`.

## How route gating works

- **Pages:** `const session = await requireSession()`. This redirects to
  `/login` when signed out, and to `/login/workspace` when no workspace
  has been picked. The result includes `session.scope`, which pages pass
  into every query.
- **API routes:**

  ```ts
  const session = await requireApiSession(request, { hrOnly, mutating });
  if (session instanceof NextResponse) return session;
  ```

  - It returns 401 when signed out.
  - It returns 403 when no workspace is picked, when `hrOnly` is set and
    the user isn't HR, or when a `mutating` request fails the same-origin
    check.

**Public (no gating):** `/`, `/capabilities`, `/how-it-works`, `/login`, `/register`, `/forgot-password`, `/reset-password`.

## Configuration

- Only `DATABASE_URL` is needed.
- Accounts: `npm run db:seed-login`. Roles and stations:
  `npm run db:seed-roles` (see
  [roles-and-stations.md](roles-and-stations.md#setup-run-these-yourself-they-write-to-the-database)).

## Known limitations

- **Shared temp password.** Seeded accounts share one temporary
  password. Move to per-user passwords (sign-up/reset flow) before this
  gates anything long-term.
- **Allowlist and roles are script-managed.** There's no in-app admin UI
  yet.
- **Basic CSRF only.** Mutating routes check `Origin` against `Host`,
  plus `SameSite=Lax`. There's no CSRF token.
- **No rate limiting** on `/api/login`, `/api/register` or
  `/api/password-reset/request`. Add it before production.
- **Reset emails aren't sent yet.** Links are printed in dev only; see
  "Password reset" above.
- **Self-selected roles.** Registration grants the chosen role
  immediately, including HR, and emails aren't verified. This is
  temporary until an approval system exists; see "Registration" above.
- **Expired or revoked session rows are never cleaned up.** Add a
  periodic delete if the table grows.
- ~~One shared session value for every user~~ — replaced 2026-09-25 by
  per-user sessions.
- ~~No role system~~ — HR/Supervisor roles with station scoping,
  2026-09-25.
- ~~Client-set cookie, not `httpOnly`~~ — fixed 2026-09-21.
- ~~Shared org allowlist lived in `.env`~~ — replaced 2026-09-21 with
  `login_credentials`.
