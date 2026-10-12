# Logging and troubleshooting

**Status:** Built 2026-10-05 for the map stack: TomTom live routing,
incidents, OSRM and the gas price. Other API routes still use plain
`console.error` and can adopt the same logger over time.

## Where logs show up

| Where | What you see |
| --- | --- |
| Terminal running `npm run dev` / `npm start` | Server logs: API routes, TomTom, OSRM fallback, gas price |
| Hosting log stream (e.g. Vercel → Functions logs) | The same server logs in production |
| Browser devtools console on `/map` | Client logs: `[map/live]`, `[map/routes]`, `[osrm]` |
| `GET /api/fleet/status` (HR only) | Key setup, TomTom budget, per-endpoint health, recent problems |

## Format

One line per event:

```
2026-10-05T17:40:55.483Z WARN  [tomtom] search call failed (http) {"query":"burger king","status":401,"ms":27,"detail":"HTTP 401: You are missing valid authentication credentials"}
2026-10-05T17:41:02.110Z INFO  [fleet/directions] request done {"requestId":"3f9c2a1b","path":"/api/fleet/directions","status":200,"ms":912,"from":"wcl_lynn","mode":"truck","options":3,"fastestMin":35,"areaIncidents":40,"blockers":[0,0,1],"incidentsOk":true}
```

| Setting (env var) | Values | Default |
| --- | --- | --- |
| `LOG_LEVEL` | `debug` · `info` · `warn` · `error` | `debug` in development, `info` otherwise |
| `LOG_FORMAT` | `json` for one JSON object per line (for log platforms) | Readable lines |

`debug` adds one line per successful TomTom call, with its timing and
how much of the day's budget is used.

## Request IDs

Every `/api/fleet/*` response has an **`x-request-id`** header, and every
server line for that request carries the same `requestId`. When the map
misbehaves:

1. In the browser console, find the `[map/live] … returned 500` line and
   note its `requestId`.
2. Search the server logs for that ID to see the whole story: what was
   asked, what TomTom answered, and why it fell back.

## What gets logged

| Scope | Logs |
| --- | --- |
| `tomtom` | Each call's endpoint, status, timing and TomTom's own error text. Timeouts, network errors and the daily budget running out are labeled separately. |
| `fleet/places`, `fleet/directions`, `fleet/incidents` | A finish line per request (status, timing, result counts), why it fell back, rejected requests (bad input, out-of-scope origin) and missing sign-in |
| `osrm` | Fallback routing results, and straight-line fallbacks with the cause |
| `gas-price` | EIA failures |
| `fleet/status` | Requests to the status endpoint |
| `map/live` (browser) | Failed requests with status, server message and request ID. Each fallback reason is logged once, not every 2-minute refresh. |
| `map/routes` (browser) | Gas price falling back to $3.50 |

**Fallback reasons** are short codes. They appear in API responses as
`fallbackReason`, in logs, and in the status endpoint:

| Reason | Meaning |
| --- | --- |
| `no_key` | `TOM_TOM_API_KEY` isn't set in this environment |
| `http 401` / `http 403` | The key is wrong, revoked, or the TomTom product isn't enabled for it |
| `http 429` | TomTom's own rate or quota limit |
| `http 5xx` | TomTom is having problems |
| `timeout` | No answer within 8 s |
| `network` | Couldn't reach TomTom (DNS, firewall, offline) |
| `budget` | The app's daily cap (2,000 calls) is used up. Resets at UTC midnight. |
| `parse` | TomTom returned something that isn't JSON |

## Status endpoint

`GET /api/fleet/status` is for HR only. Open it in the browser while
signed in as HR.

```json
{
  "env": { "tomtomKey": true, "eiaKey": false, "logLevel": "info" },
  "tomtom": {
    "keyConfigured": true,
    "quota": { "day": "2026-10-05", "used": 143, "budget": 2000, "exhausted": false },
    "endpoints": {
      "routing": { "calls": 40, "failures": 1, "lastOkAt": "…", "lastMs": 280,
                   "lastFailure": { "at": "…", "reason": "No response within 8000 ms", "status": null } }
    }
  },
  "recentProblems": [ { "time": "…", "level": "warn", "scope": "tomtom", "message": "…" } ]
}
```

It shows whether keys are set but never their values. Everything in it
is per server instance and resets on restart. The 50 most recent
warnings and errors are kept, even when `LOG_LEVEL` hides them from the
log output.

## Troubleshooting

| Symptom on `/map` | Look for | Fix |
| --- | --- | --- |
| "Live search unavailable" or "Live incidents unavailable" | `TOM_TOM_API_KEY is not set` | Add the key to `.env` (locally) or the hosting environment, then restart |
| Same, with the key set | `[tomtom] … failed (http) {"status":401…}` or `403` | Check the key at developer.tomtom.com, including that Search, Routing and Traffic are enabled for it |
| "Live traffic unavailable. Showing free-flow estimates" | `[fleet/directions] TomTom routing failed — using OSRM` and its `reason` | See the reasons table above |
| Everything falls back late in the day | `Daily call budget reached` | Wait for UTC midnight, or raise `DAILY_CALL_BUDGET` in `tomtom.ts` and add TomTom credit |
| Straight lines instead of roads | `[osrm] route geometry failed` (browser) | The public OSRM server is down or rate-limiting. It recovers on its own. |
| Routes show but no blockers | `TomTom incidents failed — routes shown without blockers` | Usually temporary. Check `reason`. |
| Supervisor gets a 403 when planning a trip | `[fleet/directions] request rejected {"status":403,"from":…,"allowed":[…]}` | The origin isn't in their allowed list (see [live-routing.md](../fleet/live-routing.md)) |
| Map won't load at all | Browser console errors, then `npm run build` output | Check you're on the `map-integration` branch and restart the dev server |

## Privacy and safety

- **Secrets are redacted.** Anything shaped like `key=`, `api_key=`,
  `token=`, `secret=` or `password=` is replaced with `***`, in both
  messages and fields. TomTom URLs, which contain the key, are never
  logged.
- **No employee or account data.** Logs carry role and station only (on
  403s), never emails.
- **Search queries are logged** with TomTom calls, for example
  `"query":"burger king"`. Someone could type a street address, so treat
  production logs as internal.

## Using the logger elsewhere

```ts
import { createLogger } from "@/lib/log";
const log = createLogger("my-area");
log.error("thing failed", { error, id });
```

It works in both server and client code. For API routes, also see
`startRequest()` in `src/lib/fleet/api-log.ts`, which adds the request ID
and a finish line per request. Tests are in `src/lib/log.test.ts` and in
the "failure diagnostics" block of `src/lib/fleet/tomtom.test.ts`.
