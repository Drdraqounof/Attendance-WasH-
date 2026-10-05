# Live routing plan: alternate routes and blockers on `/map`

**Status:** Planned 2026-10-05. Not started. Provider: TomTom.
**Branch:** `map-integration`
**Related docs:** [docs/fleet/map.md](docs/fleet/map.md) ·
[docs/fleet/map-integration.md](docs/fleet/map-integration.md)

This is the plan and status tracker for the work. Tick the phase boxes and
re-grade the readiness table as each phase lands. When the build is done,
the finished reference moves to `docs/fleet/live-routing.md` (Phase 5).

## Goal

A supervisor picks a destination on `/map`, for example "Burger King", and
sees:

1. Two or three **alternate routes** from a WCL depot (the Lynn plant by
   default).
2. Which route is **quickest right now**, using live traffic, plus how much
   delay traffic adds to each one.
3. **What is in the way** on each route: jams, closures, roadworks and
   accidents, shown on the map and listed with road name and delay.

## How close we are: readiness grade

This grades what the codebase has today against what the feature needs.

| # | Needed capability | Grade | What exists today |
| --- | --- | --- | --- |
| 1 | Interactive map, layers, selection | **A** | Leaflet / react-leaflet, polylines, markers, `FitBounds`, full screen (`src/app/map/fleet-map.tsx`, `fleet-dashboard.tsx`) |
| 2 | Auth and station scoping | **A** | `requireSession` / `requireApiSession` (`src/lib/session.ts`), `routesForScope` (`src/lib/fleet/scoped-routes.ts`) |
| 3 | Server proxy for a keyed external API | **A-** | `src/app/api/gas-price/route.ts`: session check, timeout, caching, fallback. The new routes copy this pattern. |
| 4 | Timeouts, fallbacks, and tests with a stubbed `fetch` | **B+** | `osrm.ts` timeout and straight-line fallback; `fleet.test.ts` fetch stubs |
| 5 | Route list and detail UI | **B** | Sidebar, detail panel, KPI bars, driver cards. Built for fixed routes, not for comparing options. |
| 6 | Routing engine | **C** | Public OSRM demo server, called from the browser. Car profile only, rate-limited, no truck rules. |
| 7 | Data model for route options and blockers | **C-** | `Route` / `RouteMetrics` describe one route. No option, delay or incident types. |
| 8 | Alternate routes | **F** | Not requested. OSRM supports `alternatives`, but the code doesn't use it. |
| 9 | Live traffic ETA ("quickest now") | **F** | None. Durations are free-flow, or 25 km/h in the fallback. |
| 10 | Blockers (jams, closures, roadworks, incidents) | **F** | None |
| 11 | Destination search (places like "Burger King") | **F** | None. Only the hardcoded `NODES`. |
| 12 | Quota, rate limiting and caching of paid calls | **D** | Only `revalidate` on the gas price. No app-wide rate limiting (a known limitation in the README). |
| 13 | Live vehicle position (route from where the truck is) | **F** | No GPS or telematics. Out of scope: the origin is a depot or a chosen node. |

**Grade key:** **A** works as-is · **B** needs small extensions ·
**C** exists but needs rework · **D** barely started · **F** missing.

**Overall: about 40% ready.** The app around the feature is solid: map,
auth, the proxy pattern, tests and panels (rows 1–5). Everything "live" is
missing (rows 8–11), and TomTom provides that. Row 13, routing in real time
from a moving truck, isn't possible without a telematics feed, and none has
been identified.

## Why TomTom

TomTom was chosen on 2026-10-05 over Mapbox and a free-only stack. One API
key covers all three things the feature needs.

| Need | TomTom API | Notes |
| --- | --- | --- |
| Find "Burger King" | Search API (`poiSearch` / `fuzzySearch`) | Biased to Boston by lat/lon and radius |
| Alternate routes with live traffic | Routing API, Calculate Route | `maxAlternatives`, `traffic=true`, `travelMode=truck`, `sectionType=traffic` (marks jams, roadworks and closures along each route) |
| Blockers near the routes | Traffic Incidents API (`incidentDetails`) | Queried for the routes' combined bounding box |

**Quota:** the Freemium plan allows 2,500 non-tile requests a day. Requests
over the quota are **blocked, not billed**, unless prepaid credit is added.
Routing costs about $0.75 per 1,000 requests after that. One "plan a trip"
uses roughly 3 calls (search, route, incidents), plus one route call and one
incidents call per refresh.

**Alternatives considered:**
- **Mapbox:** its `driving-traffic` profile returns up to 2 alternatives,
  with congestion and closure annotations. Place search is a separate
  product, and billing needs a card on file.
- **Free stack:** OSRM alternatives, Photon/Overpass search, and MassDOT
  Roadway Events for closures. It has no live speeds, so "quickest" would
  only reflect speed limits. MassDOT keys need approval.

## Architecture

```
Browser (/map, "Plan a trip")
   │  GET /api/fleet/places?q=burger king
   │  GET /api/fleet/directions?from=wcl_lynn&to=42.36,-71.06&mode=truck
   ▼
Next.js API routes  ── requireApiSession, scope check, cache, quota guard
   │
   ├─► TomTom Search / Routing / Traffic Incidents   (TOMTOM_API_KEY)
   │
   └─► Fallback: OSRM alternatives=true, server-side
         → isLive: false, no blockers, labeled "free-flow estimate"
```

The key stays on the server. The browser never calls TomTom directly.

## Build phases

### [ ] Phase 1: TomTom client (`src/lib/fleet/tomtom.ts`, new, server-only)

Pure parsers are kept separate from the `fetch` wrappers so they can be
unit-tested with fixture JSON. Requests use `AbortSignal.timeout`, as in
`osrm.ts`. Check parameter names against the TomTom docs while building.

- `searchPlaces(query, near)` returns `PlaceResult[]`:
  `id, name, address, lat, lng`.
- `routeOptions(origin, dest, mode)` returns `RouteOption[]`:
  `distanceKm, durationMin, noTrafficMin, trafficDelayMin, geometry,
  trafficSections`.
- `incidentsNear(bbox)` returns `Blocker[]`: `kind` (jam, closure,
  roadworks, accident or other), `description, roadName, delayMin,
  position`.
- `attachBlockers(options, incidents)` attaches each incident to the
  routes it lies on (within about 30 m of the line, using `haversineKm`
  from `osrm.ts`) and flags the fastest option.

### [ ] Phase 2: API routes (copy the `gas-price/route.ts` pattern)

- **`GET /api/fleet/places?q=`:** requires a session and at least 3
  characters. Results are cached for 1 day.
- **`GET /api/fleet/directions?from=<nodeId>&to=<lat>,<lng>&mode=truck|bike`:**
  requires a session. The origin must be a depot or hub on one of the
  viewer's `routesForScope` routes; otherwise it returns 403. Returns
  `{ options, blockers, isLive, fetchedAt }`, cached for about 60 s per
  origin and destination.
- **Fallback:** when there's no key, TomTom errors, or the quota is used
  up, the route returns OSRM alternatives (a new server-side call in
  `osrm.ts`) with `isLive: false`.
- **Quota guard:** a daily counter stops calling TomTom at about 2,000
  calls and switches to the fallback. It logs a warning when that happens.

### [ ] Phase 3: Types (`src/lib/fleet/types.ts`)

Add `PlaceResult`, `RouteOption`, `Blocker` and `DirectionsResponse`. The
existing `Route` types stay unchanged.

### [ ] Phase 4: UI, the "Plan a trip" mode on `/map`

- **`src/app/map/trip-planner.tsx` (new):**
  - An origin select: the viewer's depots and hubs, with the Lynn plant as
    the default.
  - A destination search box, debounced 400 ms and usable from the
    keyboard.
  - A truck/bike toggle.
  - An options list showing each route's ETA, distance, traffic delay,
    blocker count, and a **Fastest now** badge on the quickest one.
  - A blockers list for the selected route.
  - A Refresh button and an "Updated 2:14 PM" label. It auto-refreshes
    every 2 minutes, but only while the panel is open and the tab is
    visible.
- **`fleet-dashboard.tsx`:** a mode switch between "Fleet routes" and
  "Plan a trip".
- **`fleet-map.tsx`:** an optional trip layer:
  - the selected route drawn solid
  - alternates drawn thin and grey (click to select one)
  - blocker markers with tooltips
  - a destination pin
  - the map zoomed to fit the trip
- **Who can use it:** the same viewers as the map, meaning HR and
  supervisors whose station covers Delivery Drivers (Yard). Other stations
  already see the empty state.

### [ ] Phase 5: Documentation (updated with each phase, not only at the end)

- **This file:** tick the phase boxes and re-grade the table.
- **Code comments:** doc comments on `tomtom.ts`, both API routes and
  `trip-planner.tsx`, in the same style as `osrm.ts` and
  `gas-price/route.ts`.
- **`docs/fleet/live-routing.md` (new):** the finished reference covering
  behavior, endpoints, quota, fallback, the final grade and known gaps.
- **Updates elsewhere:**
  - [docs/fleet/map.md](docs/fleet/map.md): modes and the files table.
  - [README.md](README.md): `TOMTOM_API_KEY` in the env table.
  - [docs/fleet/map-integration.md](docs/fleet/map-integration.md): next
    steps.

## Tests (Vitest)

- **Parsers:** fixture JSON turns into the right `PlaceResult[]`,
  `RouteOption[]` and `Blocker[]`. Covers the fastest flag, delay math and
  how traffic sections are mapped.
- **`attachBlockers`:** an incident on route B is attached to B only.
- **Fallback:**
  - with no key, or when `fetch` fails, the route returns OSRM
    alternatives with `isLive: false`
  - the quota guard switches to the fallback once tripped
- **Access:** an unknown origin, or one outside the viewer's scope, is
  rejected.

## Verification

1. Run `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build`.
2. **With `TOMTOM_API_KEY` set:**
   - Run `npm run dev`, sign in as HR, open `/map`, choose **Plan a trip**
     and search "Burger King".
   - Expect 2–3 routes, each with a live ETA and traffic delay, and one
     marked "Fastest now".
   - Expect blocker markers on the map and a matching list.
   - Refresh and confirm the "Updated" time changes.
3. **Without the key:** the same flow shows OSRM alternatives labeled
   "free-flow estimate", with no blockers.
4. **As a Dock A supervisor:** `/map` shows the empty state. Calling
   `/api/fleet/directions` with an origin outside their scope returns 403.

## Setup

1. Create a free account at developer.tomtom.com and copy the API key.
2. Add `TOMTOM_API_KEY=<key>` to your local `.env` and to the hosting
   environment. **Add it yourself:** `.env*` files are read-only for
   automated changes in this repo (see CLAUDE.md).
3. Without a key, the feature still works in fallback mode, without live
   traffic or blockers.

## Known gaps and risks

- **No vehicle GPS.** Routes start at a depot, not at the truck's position.
  True real-time routing needs a telematics feed.
- **Bike mode has no traffic.** TomTom's bicycle routing doesn't use live
  traffic, and blockers matter less for bikes.
- **Display terms.** Check TomTom's terms for showing their routes and
  incidents over OpenStreetMap tiles. Switching to TomTom map tiles is an
  option.
- **Quota.** 2,500 requests a day suits a demo or pilot. Heavy use needs
  Pay As You Grow credit, and the app has no rate limiting yet.
- **Nothing is stored.** Trips aren't saved. Planning a trip is a
  per-viewer view, like the existing route toggles.
- **The routes themselves are still demo data.** Fleet routes and stops
  remain mock data (see
  [docs/fleet/map-integration.md](docs/fleet/map-integration.md)). Only
  "Plan a trip" would use live data.

## Sources

- [TomTom Routing API: Calculate Route](https://developer.tomtom.com/routing-api/documentation/routing/calculate-route)
- [TomTom route planning parameters](https://docs.tomtom.com/maps-sdk-js/guides/services/routing/parameters)
- [TomTom API pricing](https://docs.tomtom.com/pricing/price-announcement)
- [Mapbox Directions API](https://docs.mapbox.com/api/navigation/directions/)
- [MassDOT highway data for developers](https://www.mass.gov/info-details/highway-data-for-developers)
