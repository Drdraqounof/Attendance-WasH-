# Live routing: alternate routes, live incidents and accidents

**Status:** Built 2026-10-05 on branch `map-integration`. Checked against
live TomTom data (Lynn → Burger King, Downtown, Cambridge, Allston). Not
yet checked in a browser while signed in. Plan and history:
[LIVE_ROUTING_PLAN.md](../../LIVE_ROUTING_PLAN.md).

## What it does

`/map` has two modes and a live layer.

- **Fleet routes:** the demo delivery routes (see [map.md](map.md)).
- **Plan a trip:**
  1. Pick an origin depot (the Lynn plant by default) and **truck** or
     **bike**.
  2. Search a place or address, for example "Burger King".
  3. The map shows up to 3 routes:
     - the selected route is solid teal, alternates are thin grey (click
       one to select it), and slow stretches are orange
     - one route is badged **Fastest now**, based on live traffic
     - each route shows ETA, distance, traffic delay and its blocker count
  4. **What's in the way** lists the selected route's blockers:
     accidents, closures, roadworks, jams, broken-down vehicles and
     hazards. Each shows road and delay, followed by TomTom's slow
     stretches.
  5. Routes refresh every 2 minutes while the tab is visible, or on
     **Refresh**. The "Updated" time shows how fresh they are.
- **Live incidents layer** (on by default, works in both modes): every
  live incident around the fleet's area, drawn as a colored badge.
  - **Accidents** are red and drawn largest and on top. A counter above
    the map shows "N accidents · M live incidents · updated 2:14 PM".
  - The layer refreshes every 2 minutes.
  - When you plan a trip, the selected route's blockers stay on the map
    even with the layer turned off.

**Real-time accidents:** TomTom reports accidents as their own category,
updated about every minute. Our 2-minute refresh means one shows within
about 3 minutes of TomTom having it. At midday on 2026-10-05 the Boston
area had about 75 live incidents (closures and jams) and no accidents.
Accidents are uncommon at any given moment, so a count of zero is normal.

**Access:** the same viewers as the map: HR, and supervisors whose station
covers Delivery Drivers (Yard). The API routes enforce this:
- a viewer with no fleet routes gets 403
- trips can start only from depots or hubs on the viewer's own routes
  (`originNodesForScope`)

## How it works

```
Browser (/map)
  use-live.ts ── GET /api/fleet/places?q=           (400 ms debounce, 3+ chars)
              ── GET /api/fleet/directions?from=&to=&mode=   (every 2 min)
              ── GET /api/fleet/incidents?bbox=     (every 2 min)
                       │  requireApiSession + scope check
                       ▼
               src/lib/fleet/tomtom.ts  ── TomTom Search / Routing / Traffic Incidents
                       │  on missing key, error or spent budget
                       ▼
               src/lib/fleet/osrm.ts fetchAlternatives  (free-flow, no blockers)
```

**How blockers are matched:**
- `directions` fetches incidents for the routes' combined area, and
  `attachBlockers` assigns each incident to the routes it runs **along**.
- To count, at least 60% of an incident's sampled points must be within
  15 m of the route line, **heading the same way** (within 60°).
- This skips cross streets and the opposite carriageway of divided
  highways, which TomTom reports as separate incidents. Without the
  direction check, a route TomTom rated at zero delay picked up 5
  opposite-direction jams.

**Fastest:** the option with the lowest live ETA (TomTom
`travelTimeInSeconds`, which includes traffic). It isn't always the
shortest route.

## Files

| File | Purpose |
| --- | --- |
| `src/lib/fleet/tomtom.ts` | Server-only TomTom client: `searchPlaces`, `routeOptions`, `incidentsInBbox`, pure parsers, `attachBlockers`, and the daily quota guard |
| `src/lib/fleet/osrm.ts` | `fetchAlternatives`: the OSRM fallback (up to 3 free-flow routes, then a straight line) |
| `src/lib/fleet/scoped-routes.ts` | `originNodesForScope`: the origins a viewer may use |
| `src/app/api/fleet/places/route.ts` | Place search |
| `src/app/api/fleet/directions/route.ts` | Route options plus blockers, with fallback |
| `src/app/api/fleet/incidents/route.ts` | Incidents in a bounding box (maximum 5,000 km²) |
| `src/app/map/use-live.ts` | Client hooks: `useIncidents`, `usePlaceSearch`, `useTrip`, and the visible-tab interval |
| `src/app/map/trip-planner.tsx` | `TripControls` and `TripDetail` panels |
| `src/app/map/fleet-map.tsx` | Trip layer, slow-stretch lines, incident badges, destination pin |
| `src/app/map/fleet-dashboard.tsx` | Mode tabs, live-incidents toggle and counter |
| `src/lib/fleet/theme.ts` | `INCIDENT_STYLE`, `INCIDENT_PRIORITY`, `LIVE_REFRESH_MS` |
| `src/lib/fleet/tomtom.test.ts` | Parsers, blocker matching (including opposite-direction and cross-street cases), quota, access, fallback |

## Configuration and quota

- **Key:** `TOM_TOM_API_KEY` in `.env` and in hosting.
  `TOMTOM_API_KEY` is also accepted.
- **Without a key:** search shows "Live search unavailable", trips use
  OSRM with a "Live traffic unavailable" note, and the incidents layer
  says it's unavailable.
- **Free tier:** 2,500 non-tile requests a day. Requests over that are
  blocked, not billed.
- **Daily budget:** `DAILY_CALL_BUDGET` = 2,000 calls per server
  instance per UTC day. After that, everything falls back and one warning
  is logged.
- **What uses quota:**
  - a search uses 1 call (cached 1 day)
  - a trip uses 2 calls (route and incidents), and each refresh uses 2
    more
  - the incidents layer uses 1 call per refresh
  - responses are cached about 60 s
- **Rough daily budget:** with one viewer keeping a trip open, about 90
  calls an hour, or roughly 20 viewer-hours a day.

## Known gaps

- **No vehicle GPS.** Trips start at a depot, not at a truck's position.
- **Bike mode has no traffic.** TomTom bicycle routing has no live
  traffic, so it shows no delay or blockers.
- **The quota counter is per server instance**, and cached responses
  still count against it. It's a safety net, not billing-accurate.
- **TomTom display terms** for drawing their data over OpenStreetMap
  tiles still need checking before production.
- **Incidents cover a fixed area.** The layer covers the fleet's area
  (plus the destination in trip mode), not wherever the map is panned.
- **English only, and nothing is saved.** Trips are per-viewer state, like
  the route toggles.
