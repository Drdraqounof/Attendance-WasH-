// Risk banding is the same 16-point policy engine used by /insights —
// see src/lib/policy-engine.ts. Re-exported here so existing imports of
// `RiskLevel`/`riskLevelFromPoints` from this file keep working.
export { riskLevelFromPoints, type RiskLevel } from "@/lib/policy-engine";
import { ALL_STATIONS, filterToScope, type StationScope } from "@/lib/access";
import { localizeRoster, type Lang } from "@/lib/i18n";
import { riskLevelFromPoints, type RiskLevel } from "@/lib/policy-engine";

export type RosterEmployee = {
  id: string;
  name: string;
  role: string;
  team: string;
  points: number;
  lastSignal: string;
  lastSignalAgo: string;
  suggestedAction: string;
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  termination: "Termination threshold",
  critical: "Critical",
  at_risk: "At risk",
  elevated: "Elevated",
  low: "Low",
  clear: "Clear",
};

/**
 * The org's team structure. Freeform text in the `team` column (not
 * an enum) — this is the reference list managers pick from when
 * assigning/reassigning an employee's team, and what DEMO_ROSTER below
 * is built from.
 */
export const TEAMS = [
  "Laundry Team Members – First Shift",
  "Laundry Team Members – Second Shift",
  "Delivery Drivers",
  "Team Leads",
  "Maintenance Technicians",
  "Production Supervisors",
] as const;

/**
 * Demo-only bridge between the real stations (`stations.name` in the DB,
 * which is what a Supervisor's scope holds) and the mock TEAMS above.
 * Without it, a Supervisor's scope never matches a DEMO_ROSTER row and
 * every mock-backed page is empty for them. Delete this once those pages
 * read from the DB — see docs/auth/roles-and-stations.md.
 */
export const DEMO_STATION_TEAMS: Record<string, readonly (typeof TEAMS)[number][]> = {
  "Dock A": ["Laundry Team Members – First Shift"],
  "Dock B": ["Laundry Team Members – Second Shift"],
  "Pack line": ["Team Leads", "Production Supervisors"],
  "Sort hub": ["Maintenance Technicians"],
  Yard: ["Delivery Drivers"],
};

/**
 * A station scope widened to the mock team names it covers (see
 * DEMO_STATION_TEAMS). Use it whenever filtering mock data; DB queries
 * keep using the plain scope.
 */
export function mockScope(scope: StationScope): StationScope {
  if (scope.all) return scope;
  return {
    all: false,
    teams: scope.teams.flatMap((station) => [station, ...(DEMO_STATION_TEAMS[station] ?? [])]),
  };
}

/** Demo floor roster — highest risk first. SMS intake not connected. */
export const DEMO_ROSTER: RosterEmployee[] = [
  {
    id: "e01",
    name: "Marcus Hale",
    role: "Laundry Team Member",
    team: "Laundry Team Members – First Shift",
    points: 16,
    lastSignal: "No-call no-show — shift start",
    lastSignalAgo: "12 min ago",
    suggestedAction: "At the 16-point termination threshold — notify HR",
  },
  {
    id: "e02",
    name: "Priya Nandakumar",
    role: "Team Lead",
    team: "Team Leads",
    points: 12,
    lastSignal: "Running late 45 min — traffic",
    lastSignalAgo: "28 min ago",
    suggestedAction: "Critical band — written warning, suspension, termination at discretion",
  },
  {
    id: "e03",
    name: "Devon Briggs",
    role: "Delivery Driver",
    team: "Delivery Drivers",
    points: 8,
    lastSignal: "Out sick — fever",
    lastSignalAgo: "1 hr ago",
    suggestedAction: "At-risk band — written warning and suspension eligible",
  },
  {
    id: "e04",
    name: "Elena Soto",
    role: "Laundry Team Member",
    team: "Laundry Team Members – Second Shift",
    points: 5,
    lastSignal: "Leaving early — childcare",
    lastSignalAgo: "2 hr ago",
    suggestedAction: "Check handoff to backup",
  },
  {
    id: "e05",
    name: "Jamal Okonkwo",
    role: "Maintenance Technician",
    team: "Maintenance Technicians",
    points: 4,
    lastSignal: "Running late 20 min",
    lastSignalAgo: "45 min ago",
    suggestedAction: "Watch clock-in window",
  },
  {
    id: "e06",
    name: "Sarah Chen",
    role: "Laundry Team Member",
    team: "Laundry Team Members – First Shift",
    points: 3,
    lastSignal: "Covering late — swap approved",
    lastSignalAgo: "3 hr ago",
    suggestedAction: "Note swap on board",
  },
  {
    id: "e07",
    name: "Theo Ramirez",
    role: "Laundry Team Member",
    team: "Laundry Team Members – First Shift",
    points: 2,
    lastSignal: "On floor — clocked in",
    lastSignalAgo: "4 hr ago",
    suggestedAction: "None — monitor only",
  },
  {
    id: "e08",
    name: "Aisha Rahman",
    role: "Delivery Driver",
    team: "Delivery Drivers",
    points: 1,
    lastSignal: "Break return confirmed",
    lastSignalAgo: "90 min ago",
    suggestedAction: "None — clear",
  },
  {
    id: "e09",
    name: "Chris Novak",
    role: "Production Supervisor",
    team: "Production Supervisors",
    points: 1,
    lastSignal: "On time — line ready",
    lastSignalAgo: "5 hr ago",
    suggestedAction: "None — clear",
  },
  {
    id: "e10",
    name: "Maya Patel",
    role: "Laundry Team Member",
    team: "Laundry Team Members – Second Shift",
    points: 0,
    lastSignal: "Shift start confirmed",
    lastSignalAgo: "5 hr ago",
    suggestedAction: "None — clear",
  },
  {
    id: "e11",
    name: "Luis Ortega",
    role: "Laundry Team Member",
    team: "Laundry Team Members – First Shift",
    points: 0,
    lastSignal: "On floor — clocked in",
    lastSignalAgo: "5 hr ago",
    suggestedAction: "None — clear",
  },
];

/** DEMO_ROSTER with its role/team/last-signal/suggested-action text translated (see i18n.ts's ROSTER_TEXT_ES). */
export function localizedRoster(
  lang: Lang = "en",
  scope: StationScope = ALL_STATIONS,
): RosterEmployee[] {
  // Filter on the untranslated team names, then localize.
  return localizeRoster(filterToScope(DEMO_ROSTER, mockScope(scope), (row) => row.team), lang);
}

export const DEMO_SHIFT_META = {
  floor: "Demo floor",
  shift: "Day shift",
  updated: "Updated just now",
} as const;

export type RosterSummary = {
  termination: number;
  critical: number;
  atRisk: number;
  elevated: number;
  low: number;
  clear: number;
  openPointsToday: number;
};

export function summarizeRoster(roster: RosterEmployee[]): RosterSummary {
  let termination = 0;
  let critical = 0;
  let atRisk = 0;
  let elevated = 0;
  let low = 0;
  let clear = 0;
  let openPointsToday = 0;

  for (const row of roster) {
    openPointsToday += row.points;
    const level = riskLevelFromPoints(row.points);
    if (level === "termination") termination += 1;
    else if (level === "critical") critical += 1;
    else if (level === "at_risk") atRisk += 1;
    else if (level === "elevated") elevated += 1;
    else if (level === "low") low += 1;
    else clear += 1;
  }

  return { termination, critical, atRisk, elevated, low, clear, openPointsToday };
}

/** Worst-first: employees at the termination threshold surface before those merely critical/at-risk. */
export function interventionTargets(
  roster: RosterEmployee[],
  limit = 3,
): RosterEmployee[] {
  return roster
    .filter((row) => {
      const level = riskLevelFromPoints(row.points);
      return level === "termination" || level === "critical" || level === "at_risk";
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}
