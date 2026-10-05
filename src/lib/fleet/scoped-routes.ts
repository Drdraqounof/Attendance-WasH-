import { ALL_STATIONS, filterToScope, type StationScope } from "@/lib/access";
import { DEMO_ROSTER, mockScope, RISK_LABELS } from "@/lib/dashboard-mock";
import { riskLevelFromPoints, type RiskLevel } from "@/lib/policy-engine";
import { NODES } from "./nodes";
import { ROUTE_DEFINITIONS } from "./routes";
import type { RouteDriver, ScopedRouteDefinition } from "./types";

/** Bands at which a driver's route is flagged as needing cover. */
const AT_RISK_LEVELS: ReadonlySet<RiskLevel> = new Set(["at_risk", "critical", "termination"]);

function driverFor(id: string | null): RouteDriver | null {
  const row = id ? DEMO_ROSTER.find((r) => r.id === id) : undefined;
  if (!row) return null;
  const level = riskLevelFromPoints(row.points);
  return {
    id: row.id,
    name: row.name,
    points: row.points,
    riskLabel: RISK_LABELS[level],
    lastSignal: row.lastSignal,
    lastSignalAgo: row.lastSignalAgo,
    atRisk: AT_RISK_LEVELS.has(level),
  };
}

/**
 * The demo routes this scope may see, each with its driver's attendance
 * standing. Scoped through mockScope like every other mock-backed page,
 * so a Supervisor sees routes only when their station covers the
 * "Delivery Drivers" team (Yard, in DEMO_STATION_TEAMS).
 */
export function routesForScope(scope: StationScope = ALL_STATIONS): ScopedRouteDefinition[] {
  return filterToScope(ROUTE_DEFINITIONS, mockScope(scope), (r) => r.team).map((def) => ({
    ...def,
    driver: driverFor(def.driverId),
  }));
}

/** The real WCL plant — every map viewer may plan trips from it. */
export const PLANT_NODE = "wcl_lynn";

/**
 * Origins live routing (/api/fleet/directions) accepts from this viewer:
 * the Lynn plant for everyone, plus the depots and hubs on their own
 * fleet routes. Every supervisor can plan trips; only the fleet routes
 * themselves are station-scoped.
 */
export function originNodesForScope(scope: StationScope): string[] {
  const ids = new Set([PLANT_NODE, ...routesForScope(scope).flatMap((r) => r.stops)]);
  return Object.keys(NODES).filter((id) => ids.has(id) && NODES[id]!.type !== "stop");
}
