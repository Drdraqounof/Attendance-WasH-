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
};

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

export type Route = RouteDefinition & RouteMetrics;

export type GasPriceResponse = {
  pricePerGallon: number;
  period: string | null;
  isFallback: boolean;
};
