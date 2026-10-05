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
