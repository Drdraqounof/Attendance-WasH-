# Map — fleet delivery routes

**Status:** Built 2026-09-27 from the "Boston Fleet Optimizer"
prototype. Since 2026-10-04 the main depot is WCL's real Lynn plant.
Routes and other stops are still **demo data**, and the page doesn't
track live vehicles. For what's real, and how to add more real
locations, see [map-integration.md](map-integration.md).

## What this is

`/map` shows truck and bike delivery routes across Boston on an
interactive map. For each route it shows:

- distance and drive time
- fuel cost and CO₂ (trucks only)
- estimated savings compared with an unoptimized stop order

**Layout:** the map spans the full page width and fills most of the
viewport. The route list and route details sit side by side underneath
(stacked on phones).

**Full screen:** the button in the map's top-right corner uses the
browser Fullscreen API. Where that isn't available (for example iPhone
Safari), it falls back to a fixed overlay that fills the window. The
overlay's DOM node is moved to `<body>` while it is open, because the
page's fade-up animation and `<main>`'s stacking context would otherwise
trap it inside the page under the header. Press
Esc or the button again to exit. While full screen, the selected route's
name, distance and time and the truck/bike legend float over the map. A
`ResizeObserver` makes Leaflet re-measure whenever the panel resizes,
so tiles don't grey out.

Viewers can filter by trucks or bikes, turn routes on and off, and
select a route to see its stop sequence. Filters and toggles only change
that viewer's screen. Nothing is saved, and no one else's view changes.

**Access:** any signed-in user with an active workspace, meaning
Supervisors and HR. The page is gated by `requireSession()` like every
other page (see [roles-and-stations.md](../auth/roles-and-stations.md)).

**Station scoping:** every route belongs to the mock "Delivery Drivers"
team, and `routesForScope(session.scope)` filters routes the same way
the other mock pages filter `DEMO_ROSTER` (through `mockScope`). HR, and
Supervisors whose station covers Delivery Drivers (Yard, in
`DEMO_STATION_TEAMS`), see every route. Other Supervisors get a "No
delivery routes at this station" empty state.

**Drivers and cover flags:** truck routes have mock drivers from
`DEMO_ROSTER` (Downtown Loop and South Shore Express: Devon Briggs, e03;
Cambridge — Charlestown Run: Aisha Rahman, e08). Bike routes have no
driver. The route list shows each driver's name. The detail panel shows
their points, risk band and last signal, and links to their person
page. When a driver is at the **at-risk band or higher** (8+ points, from
`riskLevelFromPoints` in the policy engine), the route gets a **Needs
cover** badge. A banner at the top counts active routes that need cover.
Devon (8 points, "Out sick") triggers it in the demo.

**Live routing:** a **Plan a trip** tab compares up to 3 live routes
from a depot to any searched place, flags the fastest by current traffic,
and lists blockers (accidents, closures, roadworks, jams). A **Live
incidents** layer, in both modes, shows real-time accidents and other
incidents. Full details: [live-routing.md](live-routing.md).

## Files

| File | Purpose |
| --- | --- |
| `src/app/map/page.tsx` | Server page: session gate and `OpsShell` chrome. |
| `src/app/map/fleet-dashboard.tsx` | Client layout: map (with the `useMapFullscreen` hook), then the route list and detail panel. |
| `src/app/map/fleet-map.tsx` | Leaflet map, loaded client-only via `next/dynamic` because Leaflet needs `window`. Includes `FitBounds` (zooms to the selected route, or to every node when none is selected) and `ResizeWatcher`. |
| `src/app/map/use-routes.ts` | Loads the gas price, routes every stop list through OSRM, and computes the metrics. |
| `src/app/map/route-sidebar.tsx`, `route-detail-panel.tsx`, `kpi-bar.tsx`, `stat-cell.tsx` | Panels. |
| `src/lib/fleet/` | Types, cost/CO₂ math (`theme.ts`), OSRM client with a straight-line fallback (`osrm.ts`), `scoped-routes.ts` (`routesForScope`: station filter and driver lookup), and map data (`nodes.ts`: the real `wcl_lynn` depot plus demo nodes; `routes.ts`: demo routes). Tested in `fleet.test.ts`. |
| `src/app/api/gas-price/route.ts` | `GET` returns the EIA New England gas price. Signed-in users only. |

## External services

| Service | Used for | If unavailable |
| --- | --- | --- |
| OpenStreetMap tiles (`tile.openstreetmap.org`) | Map background | The map area stays blank; routes still draw. |
| Public OSRM (`router.project-osrm.org`) | Street-following geometry, distance and duration | Straight lines between stops, with duration estimated at 25 km/h. Marked "≈ estimate" in the UI. Each request times out after 8 s. |
| EIA API (`api.eia.gov`) | Weekly New England gas price, used for truck fuel cost | Fixed $3.50/gal, marked "≈ estimate". Times out after 5 s. |
| TomTom (`api.tomtom.com`) | "Plan a trip" (place search, live alternate routes, blockers) and the live incidents/accidents layer. Server-side only, via `/api/fleet/*` | Trips use OSRM free-flow alternatives with no blockers; incidents layer says "unavailable". See [live-routing.md](live-routing.md). |

**Configuration:** set `EIA_API_KEY` in `.env` (and in the hosting
environment) to get live gas prices. A free key is available from EIA.
Without it, the page uses the fallback price.

## Known gaps

- **Mostly demo data.** The main depot (`wcl_lynn`) is WCL's real
  Boston-area plant at 626 Lynnway, Lynn, MA (coordinates from
  OpenStreetMap). All other nodes, the Seaport Hub and all routes are
  hardcoded Boston examples. They aren't tied to WCL's real vehicles,
  drivers or stations. Driver assignments and station scoping come from
  mock data (see "Station scoping" above).
- **Lynn adds distance.** Lynn is about 15 km north-east of downtown, so
  the truck routes that start there (Downtown Loop, South Shore Express)
  include that drive. Their distance, fuel and CO₂ figures are higher
  than the old in-city demo depot gave. The Inner City Bike Circuit starts
  at the Seaport Hub instead, so it stays inside the city.
- **"Savings" are illustrative.** They come from a fixed inefficiency
  factor (35% for trucks, 30% for bikes), not from a real route
  optimizer or solver.
- **Not production routing.** The public OSRM demo server and OSM's
  tile servers have fair-use limits. Use a hosted or paid provider
  before real use.
- **English-only.** The page text isn't in `src/lib/i18n.ts` yet. Only
  the nav label ("Map" / "Mapa") is translated.
- **Bike routes use car routing.** The public OSRM demo server only
  runs the car profile and ignores `cycling` in the URL, so bike
  geometry, distance and time are car-based. A self-hosted or paid
  OSRM with a bicycle profile would fix this.
- **Hidden routes stay selected.** If the selected route is filtered out
  or toggled off, the map zooms out to show everything, but the
  full-screen label and detail panel still show that route.
- **All stop markers always show**, including stops that only belong to
  hidden routes.
- **Marker icons rebuild on every hover.** `nodeIcon()` creates new
  icons each render and hover state lives in the dashboard, so every
  hover redraws all markers. Caching icons would fix it.
- **Mouse-only route selection.** Route lines can't be selected from
  the keyboard, and clicking empty map doesn't clear the selection.
