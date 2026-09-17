# Authentication — demo cookie session

**Status:** Demo only. No real identity provider, user table, or role system exists yet.

## What this is

Every "signed-in" page and API route in the app gates on a single boolean:
whether the `ap_demo` cookie is present and equal to `"1"`. There is no
password check, no session token, no user record, and no per-manager
identity — anyone who has the cookie is treated as the same anonymous
"signed-in manager."

## Files

| File | Purpose |
| --- | --- |
| `src/lib/auth-constants.ts` | Defines `DEMO_COOKIE = "ap_demo"` — the one shared constant, safe to import from client or server code. |
| `src/lib/auth-mock.ts` | Re-exports `DEMO_COOKIE` and exposes `hasDemoSession()`, a server-only async check (`cookies().get(DEMO_COOKIE)?.value === "1"`) for use in Server Components and Route Handlers. |
| `src/app/login/page.tsx` + `src/app/login/login-form.tsx` | The sign-in UI. A client component; sets the cookie directly with `document.cookie`. |
| `src/app/login/language/page.tsx` + `language-picker.tsx` | Post-login step that sets the `attendpoint_lang` cookie before landing on `/dashboard` — separate from auth, see `src/lib/i18n.ts`. |
| `src/app/dashboard/sign-out-button.tsx` | Clears the cookie (`max-age=0`) and redirects to `/`. |

## How sign-in works

1. `LoginForm` accepts either any non-empty email/password pair, or a
   "Continue without credentials" button — both paths are identical.
   **No credentials are ever validated.**
2. On submit, the client sets the cookie itself:
   `document.cookie = "ap_demo=1; path=/; max-age=86400; SameSite=Lax"`
   (24-hour expiry).
3. The page does a full navigation (`window.location.assign`, not a
   client-side router push) to `/login/language`, so the cookie is
   guaranteed to be present on the very next server request.
4. `/login/language` sets `attendpoint_lang` and forwards to `/dashboard`.

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
  for a concrete consequence of this.
- **No role system.** "Admin" and "manager" aren't distinguished
  anywhere — every gated route/API just checks `hasDemoSession()`.
- **Client-set cookie, not `httpOnly`.** The cookie is set from
  client-side JS (not a server `Set-Cookie` header), so it's readable
  and forgeable via devtools. Acceptable for a demo; would need to move
  to a server-issued, `httpOnly` session cookie (and real credential
  verification) before this could gate anything real.
- **No CSRF protection.** Since there's no real session and no
  state-changing action requires a distinct secret beyond the cookie,
  this hasn't been addressed — flag it if real auth is ever added.
