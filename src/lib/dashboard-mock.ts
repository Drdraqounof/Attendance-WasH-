export type RiskLevel = "at_risk" | "watch" | "clear";

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

export const RISK_THRESHOLDS = {
  atRisk: 6,
  watch: 3,
} as const;

export function riskLevelFromPoints(points: number): RiskLevel {
  if (points >= RISK_THRESHOLDS.atRisk) return "at_risk";
  if (points >= RISK_THRESHOLDS.watch) return "watch";
  return "clear";
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  at_risk: "At risk",
  watch: "Watch",
  clear: "Clear",
};

/** Demo floor roster — highest risk first. SMS intake not connected. */
export const DEMO_ROSTER: RosterEmployee[] = [
  {
    id: "e01",
    name: "Marcus Hale",
    role: "Picker",
    team: "Dock A",
    points: 9,
    lastSignal: "No-call no-show — shift start",
    lastSignalAgo: "12 min ago",
    suggestedAction: "Confirm no-call no-show",
  },
  {
    id: "e02",
    name: "Priya Nandakumar",
    role: "Team lead",
    team: "Pack line",
    points: 8,
    lastSignal: "Running late 45 min — traffic",
    lastSignalAgo: "28 min ago",
    suggestedAction: "Call before 2nd break",
  },
  {
    id: "e03",
    name: "Devon Briggs",
    role: "Loader",
    team: "Dock B",
    points: 7,
    lastSignal: "Out sick — fever",
    lastSignalAgo: "1 hr ago",
    suggestedAction: "Reassign bay coverage",
  },
  {
    id: "e04",
    name: "Elena Soto",
    role: "Sorter",
    team: "Sort hub",
    points: 5,
    lastSignal: "Leaving early — childcare",
    lastSignalAgo: "2 hr ago",
    suggestedAction: "Check handoff to backup",
  },
  {
    id: "e05",
    name: "Jamal Okonkwo",
    role: "Forklift",
    team: "Yard",
    points: 4,
    lastSignal: "Running late 20 min",
    lastSignalAgo: "45 min ago",
    suggestedAction: "Watch clock-in window",
  },
  {
    id: "e06",
    name: "Sarah Chen",
    role: "QC tech",
    team: "Pack line",
    points: 3,
    lastSignal: "Covering late — swap approved",
    lastSignalAgo: "3 hr ago",
    suggestedAction: "Note swap on board",
  },
  {
    id: "e07",
    name: "Theo Ramirez",
    role: "Picker",
    team: "Dock A",
    points: 2,
    lastSignal: "On floor — clocked in",
    lastSignalAgo: "4 hr ago",
    suggestedAction: "None — monitor only",
  },
  {
    id: "e08",
    name: "Aisha Rahman",
    role: "Dispatcher",
    team: "Yard",
    points: 1,
    lastSignal: "Break return confirmed",
    lastSignalAgo: "90 min ago",
    suggestedAction: "None — clear",
  },
  {
    id: "e09",
    name: "Chris Novak",
    role: "Loader",
    team: "Dock B",
    points: 1,
    lastSignal: "On time — dock ready",
    lastSignalAgo: "5 hr ago",
    suggestedAction: "None — clear",
  },
  {
    id: "e10",
    name: "Maya Patel",
    role: "Sorter",
    team: "Sort hub",
    points: 0,
    lastSignal: "Shift start confirmed",
    lastSignalAgo: "5 hr ago",
    suggestedAction: "None — clear",
  },
  {
    id: "e11",
    name: "Luis Ortega",
    role: "Picker",
    team: "Dock A",
    points: 0,
    lastSignal: "On floor — clocked in",
    lastSignalAgo: "5 hr ago",
    suggestedAction: "None — clear",
  },
];

export const DEMO_SHIFT_META = {
  floor: "Demo floor",
  shift: "Day shift",
  updated: "Updated just now",
} as const;

export type RosterSummary = {
  atRisk: number;
  watch: number;
  clear: number;
  openPointsToday: number;
};

export function summarizeRoster(roster: RosterEmployee[]): RosterSummary {
  let atRisk = 0;
  let watch = 0;
  let clear = 0;
  let openPointsToday = 0;

  for (const row of roster) {
    openPointsToday += row.points;
    const level = riskLevelFromPoints(row.points);
    if (level === "at_risk") atRisk += 1;
    else if (level === "watch") watch += 1;
    else clear += 1;
  }

  return { atRisk, watch, clear, openPointsToday };
}

export function interventionTargets(
  roster: RosterEmployee[],
  limit = 3,
): RosterEmployee[] {
  return roster
    .filter((row) => riskLevelFromPoints(row.points) === "at_risk")
    .slice(0, limit);
}
