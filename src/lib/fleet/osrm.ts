import type { RouteType } from "@/lib/fleet/types";

/**
 * Street-following route geometry from the public OSRM demo server
 * (router.project-osrm.org — rate-limited, not for production). Falls
 * back to straight lines between stops if it's unreachable.
 */

const OSRM_PROFILE: Record<RouteType, string> = {
  truck: "driving",
  bike: "cycling",
};

/** After this, give up on OSRM and use the straight-line fallback. */
export const OSRM_TIMEOUT_MS = 8000;

export type OsrmResult = {
  distanceKm: number;
  durationMin: number;
  /** [lat, lng] */
  geometry: [number, number][];
  isFallback: boolean;
};

export function haversineKm(
  [lat1, lng1]: [number, number],
  [lat2, lng2]: [number, number],
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function straightLineFallback(coords: [number, number][]): OsrmResult {
  let distanceKm = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    distanceKm += haversineKm(coords[i], coords[i + 1]);
  }
  return {
    distanceKm,
    durationMin: (distanceKm / 25) * 60, // assume 25 km/h average as a rough fallback
    geometry: coords,
    isFallback: true,
  };
}

export async function fetchRouteGeometry(
  type: RouteType,
  coords: [number, number][],
): Promise<OsrmResult> {
  if (coords.length < 2) {
    return { distanceKm: 0, durationMin: 0, geometry: coords, isFallback: true };
  }

  const profile = OSRM_PROFILE[type];
  const coordPath = coords.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coordPath}?overview=full&geometries=geojson`;

  try {
    // A hung request would otherwise keep the whole map on "Loading routes…".
    const res = await fetch(url, { signal: AbortSignal.timeout(OSRM_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) throw new Error("OSRM returned no route");

    const geometry: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng],
    );

    return {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      geometry,
      isFallback: false,
    };
  } catch {
    return straightLineFallback(coords);
  }
}
