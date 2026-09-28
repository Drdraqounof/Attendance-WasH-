/**
 * Pure role/station access rules — no DB or Next.js imports, so this
 * is safe to use from mock helpers, server code and tests alike. The
 * DB-backed session lives in src/lib/session.ts. See
 * docs/auth/roles-and-stations.md for the permission matrix.
 */

export type UserRole = "hr" | "supervisor";

export const ROLE_LABELS: Record<UserRole, string> = {
  hr: "HR",
  supervisor: "Supervisor",
};

/** One role a user has been assigned. `station: null` = all stations (HR only). */
export type RoleAssignment = {
  role: UserRole;
  station: { id: number; name: string } | null;
};

/** The signed-in user plus the assignment they picked at /login/workspace. */
export type SessionContext = {
  email: string;
  displayName: string;
  assignments: RoleAssignment[];
  /** Null until a workspace has been picked. */
  active: RoleAssignment | null;
};

/**
 * What data the active assignment can see. `teams` values are
 * `employees.team` strings — stations map 1:1 onto teams for now.
 */
export type StationScope = { all: true } | { all: false; teams: string[] };

export const ALL_STATIONS: StationScope = { all: true };

export function stationScope(active: RoleAssignment | null): StationScope {
  if (!active) return { all: false, teams: [] };
  if (active.role === "hr" && active.station === null) return ALL_STATIONS;
  return { all: false, teams: active.station ? [active.station.name] : [] };
}

export function inScope(scope: StationScope, team: string): boolean {
  return scope.all || scope.teams.includes(team);
}

/** Filters any rows that carry an (untranslated) team name down to a scope. */
export function filterToScope<T>(
  rows: T[],
  scope: StationScope,
  teamOf: (row: T) => string,
): T[] {
  if (scope.all) return rows;
  return rows.filter((row) => scope.teams.includes(teamOf(row)));
}

/** A supervisor must always be tied to a station; only HR may span all of them. */
export function isValidAssignment(a: RoleAssignment): boolean {
  return a.role === "hr" || a.station !== null;
}

export function sameAssignment(a: RoleAssignment, b: RoleAssignment): boolean {
  return a.role === b.role && (a.station?.id ?? null) === (b.station?.id ?? null);
}

/**
 * Finds the requested (role, stationId) among the user's own
 * assignments — the only way a workspace can be chosen, so nobody can
 * pick a role or station they weren't given.
 */
export function findAssignment(
  assignments: RoleAssignment[],
  role: UserRole,
  stationId: number | null,
): RoleAssignment | null {
  return (
    assignments.find(
      (a) =>
        isValidAssignment(a) &&
        a.role === role &&
        (a.station?.id ?? null) === stationId,
    ) ?? null
  );
}

/** Auto-selects the workspace when there's exactly one valid choice. */
export function pickDefaultAssignment(
  assignments: RoleAssignment[],
): RoleAssignment | null {
  const valid = assignments.filter(isValidAssignment);
  return valid.length === 1 ? valid[0] : null;
}

export function isHr(active: RoleAssignment | null): boolean {
  return active?.role === "hr";
}

/**
 * Voiding (soft-deleting) a point event: HR can void any in-scope
 * event; a supervisor only events they recorded themselves, within
 * their station — so one supervisor's cleanup can't erase another's work.
 */
export function canVoidEvent(
  ctx: Pick<SessionContext, "email" | "active">,
  event: { createdBy: string | null; team: string },
): boolean {
  const scope = stationScope(ctx.active);
  if (!inScope(scope, event.team)) return false;
  if (isHr(ctx.active)) return true;
  return event.createdBy !== null && event.createdBy === ctx.email;
}

export function describeAssignment(a: RoleAssignment): string {
  return `${ROLE_LABELS[a.role]} · ${a.station ? a.station.name : "All stations"}`;
}

/**
 * Basic CSRF check for mutating routes: the browser's Origin header
 * must match the request host. Requests without an Origin (same-origin
 * navigations in some browsers, server-to-server) fall back to
 * SameSite=Lax cookie protection.
 */
export function isSameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin) return true;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
