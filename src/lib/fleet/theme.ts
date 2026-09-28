import type { RouteType } from "@/lib/fleet/types";

/**
 * Colors + cost/emissions constants for the /map page. Route colors
 * are the app's theme tokens (see src/app/globals.css) as raw hex,
 * since Leaflet paths are styled outside Tailwind.
 */

export const ROUTE_COLOR: Record<RouteType, string> = {
  truck: "#0f766e", // --accent-deep
  bike: "#b45309", // --danger-soft
};

export const KPI_COLOR = {
  time: "#0d9488", // --accent
  fuel: "#0f766e", // --accent-deep
  co2: "#1a2b36", // --slate
};

export const KPI_MAX = {
  time: 120, // minutes
  fuel: 80, // USD
  co2: 50, // kg
};

// Used to derive fuel cost + emissions from real routed distance.
export const TRUCK_MPG = 14; // typical delivery van, miles per gallon
export const TRUCK_CO2_PER_KM = 0.77; // kg CO2/km (typical delivery van)
export const KM_TO_MILES = 0.621371;

// Used only if the live EIA gas price API is unreachable or unconfigured.
export const FALLBACK_GAS_PRICE_PER_GALLON = 3.5;

export function truckFuelCost(distanceKm: number, pricePerGallon: number): number {
  const gallonsUsed = (distanceKm * KM_TO_MILES) / TRUCK_MPG;
  return gallonsUsed * pricePerGallon;
}

// How much longer/costlier an unoptimized (naive, un-sequenced) version of
// the same stop list would be — used only for the "vs. unoptimized"
// figures. Real optimization would come from a routing/VRP solver; this
// constant keeps the comparison consistent instead of random numbers.
const INEFFICIENCY_FACTOR: Record<RouteType, number> = {
  truck: 0.35,
  bike: 0.3,
};

export function inefficiencyFactor(type: RouteType): number {
  return INEFFICIENCY_FACTOR[type];
}
