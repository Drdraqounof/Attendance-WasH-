# Logging and troubleshooting

**Status:** Built 2026-10-05. The logger was first used by the fleet map,
which was removed on 2026-10-22. API routes that haven't adopted it yet
still use plain `console.error`, and can switch over time.

## Where logs show up

| Where | What you see |
| --- | --- |
| Terminal running `npm run dev` / `npm start` | Server logs from API routes and server code |
| Hosting log stream (e.g. Vercel → Functions logs) | The same server logs in production |
| Browser devtools console | Client-side logs |

## Format

One line per event:

```
2026-10-05T17:41:02.110Z INFO  [attendance-import] request done {"requestId":"3f9c2a1b","path":"/api/attendance-import","status":200,"ms":912}
```

| Setting (env var) | Values | Default |
| --- | --- | --- |
| `LOG_LEVEL` | `debug` · `info` · `warn` · `error` | `debug` in development, `info` otherwise |
| `LOG_FORMAT` | `json` for one JSON object per line (for log platforms) | Readable lines |

## Request IDs

API routes that use `startRequest()` return an **`x-request-id`** header,
and every server line for that request carries the same `requestId`.
Search the server logs for an ID to see everything that request did.

## Recent problems

The 50 most recent warnings and errors are kept in memory per server
instance, even when `LOG_LEVEL` hides them from the log output. Read
them with `recentProblems()` from `src/lib/log.ts`. They reset on
restart.

## Privacy and safety

- **Secrets are redacted.** Anything shaped like `key=`, `api_key=`,
  `token=`, `secret=` or `password=` is replaced with `***`, in both
  messages and fields.
- **No employee or account data.** Don't log emails, names or attendance
  details. Log IDs, roles and stations instead.

## Using the logger

```ts
import { createLogger } from "@/lib/log";
const log = createLogger("my-area");
log.error("thing failed", { error, id });
```

It works in both server and client code. For API routes, use
`startRequest()` from `src/lib/api-log.ts`, which adds the request ID
and a finish line per request:

```ts
const { log, respond } = startRequest("my-route", request);
return respond({ ok: true }, { fields: { rows: 12 } });
```

Tests are in `src/lib/log.test.ts`.
