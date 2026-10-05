/** Shapes for the /map fleet-routes page. See docs/fleet/map.md. */

export type NodeType = "depot" | "stop" | "hub";

export type MapNode = {
  lat: number;
  lng: number;
  label: string;
  type: NodeType;
};

export type RouteType = "truck" | "bike";

export type RouteSavings = {
  time: number;
  fuel: number;
  co2: number;
};

export type RouteDefinition = {
  id: string;
  name: string;
  type: RouteType;
  stops: string[];
  active: boolean;
  /** Mock team that runs the route; scoped like DEMO_ROSTER rows. */
  team: string;
  /** DEMO_ROSTER id of the assigned driver, if any. */
  driverId: string | null;
};

/** The assigned driver's attendance standing, from the mock roster. */
export type RouteDriver = {
  id: string;
  name: string;
  points: number;
  riskLabel: string;
  lastSignal: string;
  lastSignalAgo: string;
  /** At-risk band or worse (8+ points) — the route may need cover. */
  atRisk: boolean;
};

/** A route definition the viewer may see, with its driver resolved. */
export type ScopedRouteDefinition = RouteDefinition & { driver: RouteDriver | null };

export type RouteMetrics = {
  /** km */
  distance: number;
  /** minutes */
  duration: number;
  /** USD */
  fuelCost: number;
  /** kg */
  co2: number;
  savings: RouteSavings;
  /** [lat, lng] pairs — street-following when OSRM is reachable. */
  geometry: [number, number][];
  isFallbackGeometry: boolean;
};

export type Route = ScopedRouteDefinition & RouteMetrics;

export type GasPriceResponse = {
  pricePerGallon: number;
  period: string | null;
  isFallback: boolean;
};

// -- Live routing (TomTom) — see LIVE_ROUTING_PLAN.md -------------------------

/** A destination found by place search ("Burger King"). */
export type PlaceResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export type PlacesResponse = {
  places: PlaceResult[];
  /** False when live search is unavailable (no key, quota, error). */
  isLive: boolean;
};

export type IncidentKind =
  | "accident"
  | "closure"
  | "roadworks"
  | "jam"
  | "lane_closed"
  | "hazard"
  | "weather"
  | "broken_down"
  | "other";

/** A live traffic incident — a "blocker" when it sits on a route option. */
export type Incident = {
  id: string;
  kind: IncidentKind;
  description: string;
  /** e.g. "Centre St, from Cabot St to Commonwealth Ave" */
  road: string;
  /** Extra seconds of delay, when TomTom reports it. */
  delaySec: number | null;
  /** 0 unknown · 1 minor · 2 moderate · 3 major · 4 undefined (closures). */
  magnitude: number;
  /** Marker position, [lat, lng]. */
  position: [number, number];
  /** Affected stretch of road, [lat, lng] pairs. */
  path: [number, number][];
};

export type IncidentsResponse = {
  incidents: Incident[];
  isLive: boolean;
  fetchedAt: string;
};

/** A slow stretch reported along one route option. */
export type TrafficSection = {
  kind: "jam" | "roadworks" | "closure" | "other";
  delaySec: number;
  speedKmh: number | null;
  /** [lat, lng] pairs for the slowed stretch. */
  path: [number, number][];
};

/** One way to get from the origin to the destination. */
export type RouteOption = {
  id: string;
  distanceKm: number;
  /** Live-traffic ETA when `isLive`, otherwise free-flow. */
  durationMin: number;
  /** Free-flow time, for comparison. */
  noTrafficMin: number;
  trafficDelayMin: number;
  geometry: [number, number][];
  trafficSections: TrafficSection[];
  /** Live incidents lying on this option's path. */
  blockers: Incident[];
  isFastest: boolean;
};

export type DirectionsResponse = {
  options: RouteOption[];
  isLive: boolean;
  fetchedAt: string;
};
