import type {
  Incident,
  IncidentKind,
  PlaceResult,
  RouteOption,
  TrafficSection,
} from "@/lib/fleet/types";

/**
 * Server-only TomTom client for live routing on /map: place search,
 * traffic-aware alternate routes, and live incidents (accidents,
 * closures, jams…). The key never reaches the browser — callers are the
 * /api/fleet/* routes. Parsers are pure and exported for tests. See
 * LIVE_ROUTING_PLAN.md.
 */

export const TOMTOM_TIMEOUT_MS = 8000;

/** Stop calling TomTom at this many requests per UTC day (free tier: 2,500). */
export const DAILY_CALL_BUDGET = 2000;

/**
 * An incident is on a route when most of it lies within this distance of
 * the route line. Tight enough to skip cross streets and the opposite
 * carriageway of a divided highway, which sit ~20–40 m away.
 */
const ON_ROUTE_METERS = 15;
/** Share of an incident's sampled points that must be on the route. */
const ON_ROUTE_SHARE = 0.6;
/** Max heading difference (degrees) for an incident to count as same-direction. */
const MAX_HEADING_DIFF = 60;

/** TomTom rejects incident bboxes over 10,000 km²; stay well under. */
const MAX_INCIDENT_BBOX_KM2 = 5000;

/** Boston-area bias for place search. */
export const SEARCH_CENTER: [number, number] = [42.3601, -71.0589];
const SEARCH_RADIUS_M = 40000;

/** The key lives in .env as TOM_TOM_API_KEY (TOMTOM_API_KEY also accepted). */
export function tomtomKey(): string | null {
  return process.env.TOM_TOM_API_KEY || process.env.TOMTOM_API_KEY || null;
}

// -- Quota guard ---------------------------------------------------------------

const quota = { day: "", count: 0 };

/**
 * Counts one TomTom call against today's budget. Returns false (and the
 * caller falls back) once the budget is spent. Per server instance — a
 * safety net, not exact accounting.
 */
export function consumeQuota(now: Date = new Date()): boolean {
  const day = now.toISOString().slice(0, 10);
  if (quota.day !== day) {
    quota.day = day;
    quota.count = 0;
  }
  if (quota.count >= DAILY_CALL_BUDGET) {
    if (quota.count === DAILY_CALL_BUDGET) {
      console.warn(`[tomtom] daily budget of ${DAILY_CALL_BUDGET} calls reached — using fallbacks`);
      quota.count++;
    }
    return false;
  }
  quota.count++;
  return true;
}

/** Test hook. */
export function resetQuota(): void {
  quota.day = "";
  quota.count = 0;
}

async function tomtomGet(url: string, revalidate: number): Promise<unknown> {
  if (!consumeQuota()) throw new Error("TomTom daily budget reached");
  const res = await fetch(url, {
    next: { revalidate },
    signal: AbortSignal.timeout(TOMTOM_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`TomTom ${res.status}`);
  return res.json();
}

// -- Place search ----------------------------------------------------------------

type TomTomSearchResult = {
  id?: string;
  poi?: { name?: string };
  address?: { freeformAddress?: string };
  position?: { lat?: number; lon?: number };
};

export function parsePlaces(data: unknown): PlaceResult[] {
  const results = (data as { results?: TomTomSearchResult[] })?.results ?? [];
  return results.flatMap((r) => {
    const lat = r.position?.lat;
    const lng = r.position?.lon;
    if (typeof lat !== "number" || typeof lng !== "number") return [];
    const address = r.address?.freeformAddress ?? "";
    return [
      {
        id: r.id ?? `${lat},${lng}`,
        name: r.poi?.name ? titleCase(r.poi.name) : address,
        address,
        lat,
        lng,
      },
    ];
  });
}

/** TomTom returns some brand names in caps ("BURGER KING"). */
function titleCase(name: string): string {
  if (name !== name.toUpperCase()) return name;
  return name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function searchPlaces(query: string, key: string): Promise<PlaceResult[]> {
  const [lat, lng] = SEARCH_CENTER;
  const url =
    `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json` +
    `?key=${key}&lat=${lat}&lon=${lng}&radius=${SEARCH_RADIUS_M}&limit=8&countrySet=US`;
  return parsePlaces(await tomtomGet(url, 86400));
}

// -- Live incidents ----------------------------------------------------------------

/** TomTom `iconCategory` → our incident kinds. */
const ICON_KIND: Record<number, IncidentKind> = {
  1: "accident",
  2: "weather",
  3: "hazard",
  4: "weather",
  5: "weather",
  6: "jam",
  7: "lane_closed",
  8: "closure",
  9: "roadworks",
  10: "weather",
  11: "weather",
  14: "broken_down",
};

type TomTomIncident = {
  geometry?: { type?: string; coordinates?: unknown };
  properties?: {
    id?: string;
    iconCategory?: number;
    magnitudeOfDelay?: number;
    events?: { description?: string }[];
    from?: string;
    to?: string;
    delay?: number | null;
    roadNumbers?: string[];
  };
};

function toLatLngPath(geometry: TomTomIncident["geometry"]): [number, number][] {
  const coords = geometry?.coordinates;
  if (geometry?.type === "Point" && Array.isArray(coords)) {
    const [lng, lat] = coords as [number, number];
    return [[lat, lng]];
  }
  if (geometry?.type === "LineString" && Array.isArray(coords)) {
    return (coords as [number, number][]).map(([lng, lat]) => [lat, lng]);
  }
  return [];
}

export function parseIncidents(data: unknown): Incident[] {
  const incidents = (data as { incidents?: TomTomIncident[] })?.incidents ?? [];
  return incidents.flatMap((inc, i) => {
    const path = toLatLngPath(inc.geometry);
    if (path.length === 0) return [];
    const p = inc.properties ?? {};
    const descriptions = (p.events ?? []).map((e) => e.description).filter(Boolean);
    const roadNames = [p.roadNumbers?.join("/"), p.from && p.to ? `${p.from} → ${p.to}` : p.from]
      .filter(Boolean)
      .join(" · ");
    return [
      {
        id: p.id ?? `incident-${i}`,
        kind: ICON_KIND[p.iconCategory ?? 0] ?? "other",
        description: descriptions.join(", ") || "Traffic incident",
        road: roadNames,
        delaySec: typeof p.delay === "number" ? p.delay : null,
        magnitude: p.magnitudeOfDelay ?? 0,
        position: path[Math.floor(path.length / 2)]!,
        path,
      },
    ];
  });
}

/** [west, south, east, north] */
export type BBox = [number, number, number, number];

export function bboxAreaKm2([w, s, e, n]: BBox): number {
  const midLat = ((s + n) / 2) * (Math.PI / 180);
  return (e - w) * 111.32 * Math.cos(midLat) * (n - s) * 110.57;
}

const INCIDENT_FIELDS =
  "{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay," +
  "events{description,code,iconCategory},from,to,delay,roadNumbers}}}";

export async function incidentsInBbox(bbox: BBox, key: string): Promise<Incident[]> {
  if (bboxAreaKm2(bbox) > MAX_INCIDENT_BBOX_KM2) throw new Error("Incident area too large");
  const url =
    `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${key}` +
    `&bbox=${bbox.map((v) => v.toFixed(5)).join(",")}` +
    `&fields=${encodeURIComponent(INCIDENT_FIELDS)}&language=en-US&timeValidityFilter=present`;
  return parseIncidents(await tomtomGet(url, 60));
}

// -- Routing ---------------------------------------------------------------------

const SECTION_KIND: Record<string, TrafficSection["kind"]> = {
  JAM: "jam",
  ROAD_WORK: "roadworks",
  ROAD_CLOSURE: "closure",
};

type TomTomRoute = {
  summary?: {
    lengthInMeters?: number;
    travelTimeInSeconds?: number;
    trafficDelayInSeconds?: number;
    noTrafficTravelTimeInSeconds?: number;
  };
  legs?: { points?: { latitude: number; longitude: number }[] }[];
  sections?: {
    sectionType?: string;
    startPointIndex?: number;
    endPointIndex?: number;
    simpleCategory?: string;
    delayInSeconds?: number;
    effectiveSpeedInKmh?: number;
  }[];
};

/** Parses Calculate Route into options. Blockers are attached later. */
export function parseRoutes(data: unknown): RouteOption[] {
  const routes = (data as { routes?: TomTomRoute[] })?.routes ?? [];
  const options = routes.flatMap((r, i): RouteOption[] => {
    const geometry: [number, number][] = (r.legs ?? []).flatMap((leg) =>
      (leg.points ?? []).map((p): [number, number] => [p.latitude, p.longitude]),
    );
    if (geometry.length < 2) return [];
    const s = r.summary ?? {};
    const travel = s.travelTimeInSeconds ?? 0;
    return [
      {
        id: `opt-${i + 1}`,
        distanceKm: (s.lengthInMeters ?? 0) / 1000,
        durationMin: travel / 60,
        noTrafficMin: (s.noTrafficTravelTimeInSeconds ?? travel) / 60,
        trafficDelayMin: (s.trafficDelayInSeconds ?? 0) / 60,
        geometry,
        trafficSections: (r.sections ?? [])
          .filter((sec) => sec.sectionType === "TRAFFIC")
          .map((sec) => ({
            kind: SECTION_KIND[sec.simpleCategory ?? ""] ?? "other",
            delaySec: sec.delayInSeconds ?? 0,
            speedKmh: sec.effectiveSpeedInKmh ?? null,
            path: geometry.slice(sec.startPointIndex ?? 0, (sec.endPointIndex ?? 0) + 1),
          })),
        blockers: [],
        isFastest: false,
      },
    ];
  });
  return markFastest(options);
}

export function markFastest(options: RouteOption[]): RouteOption[] {
  if (options.length === 0) return options;
  const fastest = options.reduce((a, b) => (b.durationMin < a.durationMin ? b : a));
  return options.map((o) => ({ ...o, isFastest: o === fastest }));
}

export async function routeOptions(
  origin: [number, number],
  dest: [number, number],
  mode: "truck" | "bike",
  key: string,
): Promise<RouteOption[]> {
  const path = `${origin[0]},${origin[1]}:${dest[0]},${dest[1]}`;
  const params =
    mode === "truck"
      ? "travelMode=truck&traffic=true&maxAlternatives=2&sectionType=traffic&computeTravelTimeFor=all"
      : "travelMode=bicycle&traffic=false&maxAlternatives=2";
  const url = `https://api.tomtom.com/routing/1/calculateRoute/${path}/json?key=${key}&${params}`;
  return parseRoutes(await tomtomGet(url, 60));
}

// -- Blockers: incidents that lie on a route ---------------------------------------

/** Metres between a point and a segment, using a local flat projection. */
function pointSegmentMeters(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  const kx = 111320 * Math.cos((p[0] * Math.PI) / 180);
  const ky = 110540;
  const ax = (a[1] - p[1]) * kx;
  const ay = (a[0] - p[0]) * ky;
  const bx = (b[1] - p[1]) * kx;
  const by = (b[0] - p[0]) * ky;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

export function bboxOf(points: [number, number][], padDeg = 0): BBox {
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [lat, lng] of points) {
    w = Math.min(w, lng);
    e = Math.max(e, lng);
    s = Math.min(s, lat);
    n = Math.max(n, lat);
  }
  return [w - padDeg, s - padDeg, e + padDeg, n + padDeg];
}

/** Compass bearing a→b in degrees (flat approximation, fine at street scale). */
function bearing(a: [number, number], b: [number, number]): number {
  const dx = (b[1] - a[1]) * Math.cos((a[0] * Math.PI) / 180);
  const dy = b[0] - a[0];
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

function sameDirection(a: number, b: number): boolean {
  const diff = Math.abs(((a - b + 540) % 360) - 180);
  return diff <= MAX_HEADING_DIFF;
}

function isOnRoute(incident: Incident, geometry: [number, number][], box: BBox): boolean {
  // Sample long incident paths to at most ~20 points.
  const step = Math.max(1, Math.floor(incident.path.length / 20));
  const sampled = incident.path.filter((_, i) => i % step === 0);
  let near = 0;
  sampled.forEach((p, k) => {
    if (p[1] < box[0] || p[1] > box[2] || p[0] < box[1] || p[0] > box[3]) return;
    // Incident lines run in the direction of traffic; a point incident has no heading.
    const next = sampled[k + 1] ?? null;
    const prev = sampled[k - 1] ?? null;
    const heading =
      next ? bearing(p, next) : prev ? bearing(prev, p) : null;
    for (let j = 0; j < geometry.length - 1; j++) {
      const a = geometry[j]!;
      const b = geometry[j + 1]!;
      if (pointSegmentMeters(p, a, b) > ON_ROUTE_METERS) continue;
      if (heading === null || (a[0] === b[0] && a[1] === b[1]) || sameDirection(heading, bearing(a, b))) {
        near++;
        return;
      }
    }
  });
  return near > 0 && near / sampled.length >= ON_ROUTE_SHARE;
}

/** Copies each option with the incidents that lie on its path as `blockers`. */
export function attachBlockers(options: RouteOption[], incidents: Incident[]): RouteOption[] {
  return options.map((option) => {
    const box = bboxOf(option.geometry, 0.001);
    return { ...option, blockers: incidents.filter((inc) => isOnRoute(inc, option.geometry, box)) };
  });
}
