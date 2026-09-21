# Authentication — allowlisted email/password session

**Status:** Real credential check against a shared org allowlist (2026-09-21).
Still no real identity provider, per-manager user table, or role system —
see "Known limitations" below.

## What this is

Every "signed-in" page and API route in the app gates on a single boolean:
whether the `ap_demo` cookie is present and equal to `"1"`. That cookie is
now only ever set server-side, after `/api/login` verifies the submitted
email against `AUTH_ALLOWED_EMAILS` and the password against
`AUTH_PASSWORD` (both in `.env`, git-ignored). There is still no per-user
identity or session token — everyone who signs in with an allowed email
gets the same shared session value, so managers are still not
distinguished from one another once signed in (see "Known limitations").

## Files

| File | Purpose |
| --- | --- |
| `src/lib/auth-constants.ts` | Defines `DEMO_COOKIE = "ap_demo"` — the one shared constant, safe to import from client or server code. |
| `src/lib/auth-mock.ts` | Exposes `hasDemoSession()` (server-only async cookie check) and `verifyCredentials(email, password)`, which checks the submitted email against `AUTH_ALLOWED_EMAILS` (comma-separated, case-insensitive) and the password against `AUTH_PASSWORD` via a constant-time (`crypto.timingSafeEqual`) compare. Throws if either env var is unset, so a missing config fails closed. |
| `src/app/api/login/route.ts` | `POST { email, password }` — calls `verifyCredentials`; on success, sets the `ap_demo` cookie via a server `Set-Cookie` header (`httpOnly`, `SameSite=Lax`, `secure` in production, 24h expiry). On failure, returns 401 with an error message. |
| `src/app/api/logout/route.ts` | `POST` — clears the cookie via `Set-Cookie` (`maxAge: 0`). Needed because an `httpOnly` cookie can't be cleared from client JS. |
| `src/app/login/page.tsx` + `src/app/login/login-form.tsx` | The sign-in UI. A client component that `fetch()`s `/api/login` and shows its error message on failure. No client-side cookie access. |
| `src/app/login/language/page.tsx` + `language-picker.tsx` | Post-login step that sets the `attendpoint_lang` cookie before landing on `/dashboard` — separate from auth, see `src/lib/i18n.ts`. |
| `src/app/dashboard/sign-out-button.tsx` | Calls `/api/logout`, then redirects to `/`. |

## How sign-in works

1. `LoginForm` submits email + password to `POST /api/login`.
2. The route checks the email against the `AUTH_ALLOWED_EMAILS` allowlist
   and the password against `AUTH_PASSWORD` (both server-side env vars —
   never sent to the client). Wrong email, wrong password, or missing env
   config all return an error; nothing is ever silently accepted.
3. On success, the server issues `Set-Cookie: ap_demo=1; HttpOnly; ...`
   (24-hour expiry). The cookie is no longer readable or forgeable from
   devtools/JS.
4. The page does a full navigation (`window.location.assign`, not a
   client-side router push) to `/login/language`, so the cookie is
   guaranteed to be present on the very next server request.
5. `/login/language` sets `attendpoint_lang` and forwards to `/dashboard`.

## Configuration

`.env` must set:

```
AUTH_ALLOWED_EMAILS=<comma-separated list of allowed manager emails>
AUTH_PASSWORD=<shared temp password — rotate before production>
```

`.env` is git-ignored — the actual allowlist and password live there only,
never in committed docs or source.

`AUTH_PASSWORD` is currently one shared password for every allowed email,
not per-user — see "Known limitations."

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
  session. Every signed-in visitor sees the same data and can perform
  the same actions (editing thresholds, marking notifications read,
  etc.) — see the note on `notifications` in `docs/database/database.md`
  for a concrete consequence of this. Credential checking is now real,
  but it's still one shared session value for every allowed email, not
  a per-manager one.
- **No role system.** "Admin" and "manager" aren't distinguished
  anywhere — every gated route/API just checks `hasDemoSession()`.
- **Shared temp password.** `AUTH_PASSWORD` is one password for every
  allowed email, set as a temporary value for initial rollout — rotate
  it (and consider per-user passwords) before this gates anything with
  real consequences long-term.
- **No CSRF protection.** `/api/login` and `/api/logout` aren't CSRF
  hardened yet — low risk today since login/logout are the only things
  they do, but revisit if either route's scope grows.
- ~~Client-set cookie, not `httpOnly`~~ — fixed 2026-09-21: the cookie
  is now set via a server `Set-Cookie` header from `/api/login`, with
  `httpOnly` and `secure` (in production) flags.
