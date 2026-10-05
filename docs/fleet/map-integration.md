# Map integration — real WCL locations

**Status:** Started 2026-10-04 on branch `map-integration`. One real
location is wired in: the Lynn plant. Everything else on `/map` is still
demo data.

This doc tracks how `/map` (see [map.md](map.md)) moves from the demo
"Boston Fleet Optimizer" data to Wash Cycle Laundry's real facilities,
routes and vehicles.

## What's real today

| Node key | What it is | Address | Coordinates (lat, lng) | Source |
| --- | --- | --- | --- | --- |
| `wcl_lynn` | Wash Cycle Laundry's Boston-area plant (about 25,000 sq ft, opened 2023) | 626 Lynnway, Lynn, MA 01905 | 42.4531, -70.9615 | Address confirmed by the project team; coordinates from the OpenStreetMap building at that address |

The address is also confirmed by
[Item Live (2021-11-09)](https://www.itemlive.com/2021/11/09/new-laundry-business-to-create-jobs-on-the-lynnway/)
and [TRSA (July 2024)](https://www.trsa.org/wp-content/uploads/2024/06/WashCycleJuly24.pdf).
OpenStreetMap files the building under ZIP 01910, and the address in
use says 01905. The building is the same either way, and the map label
doesn't show a ZIP.

## What's still demo

- **Every other node** in `src/lib/fleet/nodes.ts`, including the
  Seaport Hub (`depot_east`), the Cambridge hub and all stops. These are
  Boston neighborhood centroids, not customer sites.
- **All five routes** in `src/lib/fleet/routes.ts`. The stop orders are
  made up.
- **Savings** use a fixed inefficiency factor, not a solver.
- **Drivers and station scoping come from mock data.** Truck routes are
  assigned mock drivers from `DEMO_ROSTER` and flagged "Needs cover" when
  the driver is at-risk or worse. Routes are scoped to the Yard station
  through the demo `DEMO_STATION_TEAMS` map. Both are explained in
  [map.md](map.md).
- **No real vehicles or live positions.**

## What changed when Lynn went in

- **The depot was replaced.** `depot_south` ("South End Depot") was
  replaced by `wcl_lynn`, and its key was renamed so the code says what
  the node is.
- **Truck routes now run from Lynn.** Downtown Loop (r1) and South Shore
  Express (r3) start and end in Lynn. Lynn is about 15 km north-east of
  downtown, so their distance, drive time, fuel and CO₂ are much higher
  than before.
- **The bike route moved.** Inner City Bike Circuit (r4) now starts at
  the Seaport Hub. A bike loop starting in Lynn isn't realistic.
- **The map view didn't change.** With no route selected, `FitBounds` in
  `src/app/map/fleet-map.tsx` already zooms to fit every node, so Lynn is
  in the opening view.
- **Tests:** the routing tests in `fleet.test.ts` now use fixed
  coordinates instead of reading demo nodes, so moving a node can't break
  them. A new test checks that `wcl_lynn` is a depot at the coordinates
  above.

## How to add another real location

1. **Get the street address from WCL.** Don't rely on a web search
   alone.
2. **Geocode it once.** For example:
   `https://nominatim.openstreetmap.org/search?street=<number+street>&city=<city>&state=MA&country=USA&format=json`.
   Prefer a result with `"class": "building"` over a bus stop or street
   point. Check the pin on openstreetmap.org.
3. **Add or replace the node in `src/lib/fleet/nodes.ts`.** Use a
   descriptive key (`wcl_<place>`). Round coordinates to 4 decimals,
   which is about 10 m.
4. **Point routes at it in `src/lib/fleet/routes.ts`.** The "only
   references stops that exist" test catches any key you miss.
5. **Add the location to the "What's real today" table above.**
6. **Run the checks:** `npm test`, `npx tsc --noEmit` and
   `npm run build`.

Coordinates are hardcoded. Nothing geocodes at runtime, so the page
makes no extra calls to Nominatim.

## Next steps toward a real integration

These are blocked on information from WCL, not on code:

- **Real routes and stops:** customer pickup and drop-off sites,
  plus which vehicle serves them. Once they exist, nodes and routes
  should move from `src/lib/fleet/*.ts` into the Neon database
  (`src/db/schema.ts`). That follows the same mock-to-DB path as the
  rest of the app (see [database.md](../database/database.md)).
- **Real station scoping and drivers:** `/map` already filters by
  `session.scope`, but through the demo station→team map and mock
  drivers. Replace these with real driver assignments from the
  `employees` table, and give each route a real station
  ([roles-and-stations.md](../auth/roles-and-stations.md)).
- **Vehicle data:** truck fuel economy and the bike fleet, to replace
  `TRUCK_MPG` and the CO₂ constants in `theme.ts`. Live positions would
  need a telematics feed, and none is identified yet.
- **Live alternate routes and blockers:** built 2026-10-05 with TomTom
  (see [live-routing.md](live-routing.md)). It still routes from a depot,
  not a truck's live position, which needs a telematics feed.
- **Production routing and tiles:** see the "Not production routing"
  gap in [map.md](map.md). The longer Lynn routes send more requests to
  the public OSRM server.
