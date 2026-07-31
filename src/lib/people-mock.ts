import {
  DEMO_ROSTER,
  riskLevelFromPoints,
  type RosterEmployee,
} from "@/lib/dashboard-mock";

export type ScheduleStatus =
  | "scheduled"
  | "worked"
  | "late"
  | "absent"
  | "early_out"
  | "off";

export type ScheduleDay = {
  date: string;
  weekday: string;
  shift: string;
  status: ScheduleStatus;
  note?: string;
};

export type PointEvent = {
  id: string;
  date: string;
  delta: number;
  reason: string;
  source: "SMS" | "Policy" | "Supervisor";
};

export type PersonProfile = RosterEmployee & {
  employeeCode: string;
  hireDate: string;
  phoneMasked: string;
  policyCap: number;
  schedule: ScheduleDay[];
  pointLedger: PointEvent[];
};

const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  scheduled: "Scheduled",
  worked: "Worked",
  late: "Late",
  absent: "Absent",
  early_out: "Early out",
  off: "Off",
};

export { SCHEDULE_STATUS_LABELS };

/** Week of Jul 27 – Aug 2, 2026 (demo). */
function weekSchedule(
  pattern: Array<Omit<ScheduleDay, "date" | "weekday">>,
): ScheduleDay[] {
  const days = [
    { date: "2026-07-27", weekday: "Mon" },
    { date: "2026-07-28", weekday: "Tue" },
    { date: "2026-07-29", weekday: "Wed" },
    { date: "2026-07-30", weekday: "Thu" },
    { date: "2026-07-31", weekday: "Fri" },
    { date: "2026-08-01", weekday: "Sat" },
    { date: "2026-08-02", weekday: "Sun" },
  ];
  return days.map((d, i) => ({ ...d, ...pattern[i]! }));
}

const day = (
  shift: string,
  status: ScheduleStatus,
  note?: string,
): Omit<ScheduleDay, "date" | "weekday"> => ({ shift, status, note });

const profiles: Record<string, Omit<PersonProfile, keyof RosterEmployee>> = {
  e01: {
    employeeCode: "AP-1042",
    hireDate: "2024-03-12",
    phoneMasked: "••• ••• 4182",
    policyCap: 12,
    schedule: weekSchedule([
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "late", "22 min late"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "absent", "No-call no-show"),
      day("06:00–14:30", "scheduled"),
      day("Off", "off"),
      day("Off", "off"),
    ]),
    pointLedger: [
      {
        id: "p01a",
        date: "2026-07-31",
        delta: 4,
        reason: "No-call no-show — shift start",
        source: "SMS",
      },
      {
        id: "p01b",
        date: "2026-07-28",
        delta: 2,
        reason: "Late arrival — 22 min",
        source: "SMS",
      },
      {
        id: "p01c",
        date: "2026-07-21",
        delta: 2,
        reason: "Late arrival — 18 min",
        source: "SMS",
      },
      {
        id: "p01d",
        date: "2026-07-14",
        delta: 1,
        reason: "Early departure — unapproved",
        source: "Supervisor",
      },
    ],
  },
  e02: {
    employeeCode: "AP-0871",
    hireDate: "2023-08-01",
    phoneMasked: "••• ••• 9021",
    policyCap: 12,
    schedule: weekSchedule([
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "late", "45 min — traffic"),
      day("06:00–14:30", "late", "12 min"),
      day("06:00–14:30", "scheduled"),
      day("Off", "off"),
      day("Off", "off"),
    ]),
    pointLedger: [
      {
        id: "p02a",
        date: "2026-07-31",
        delta: 3,
        reason: "Running late 45 min — traffic",
        source: "SMS",
      },
      {
        id: "p02b",
        date: "2026-07-30",
        delta: 2,
        reason: "Late arrival — 12 min",
        source: "SMS",
      },
      {
        id: "p02c",
        date: "2026-07-18",
        delta: 2,
        reason: "Missed punch — corrected by supervisor",
        source: "Supervisor",
      },
      {
        id: "p02d",
        date: "2026-07-09",
        delta: 1,
        reason: "Late arrival — 8 min",
        source: "Policy",
      },
    ],
  },
  e03: {
    employeeCode: "AP-1190",
    hireDate: "2025-01-20",
    phoneMasked: "••• ••• 3340",
    policyCap: 12,
    schedule: weekSchedule([
      day("14:00–22:30", "worked"),
      day("14:00–22:30", "worked"),
      day("14:00–22:30", "absent", "Out sick — fever"),
      day("14:00–22:30", "absent", "Out sick — fever"),
      day("14:00–22:30", "scheduled"),
      day("Off", "off"),
      day("Off", "off"),
    ]),
    pointLedger: [
      {
        id: "p03a",
        date: "2026-07-30",
        delta: 3,
        reason: "Out sick — fever (day 1)",
        source: "SMS",
      },
      {
        id: "p03b",
        date: "2026-07-31",
        delta: 2,
        reason: "Out sick — fever (day 2)",
        source: "SMS",
      },
      {
        id: "p03c",
        date: "2026-07-12",
        delta: 2,
        reason: "Late arrival — 35 min",
        source: "SMS",
      },
    ],
  },
  e04: {
    employeeCode: "AP-0664",
    hireDate: "2022-11-08",
    phoneMasked: "••• ••• 7712",
    policyCap: 12,
    schedule: weekSchedule([
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "early_out", "Childcare — 13:00 out"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "scheduled"),
      day("Off", "off"),
      day("Off", "off"),
    ]),
    pointLedger: [
      {
        id: "p04a",
        date: "2026-07-29",
        delta: 2,
        reason: "Leaving early — childcare",
        source: "SMS",
      },
      {
        id: "p04b",
        date: "2026-07-22",
        delta: 2,
        reason: "Late arrival — 25 min",
        source: "SMS",
      },
      {
        id: "p04c",
        date: "2026-07-08",
        delta: 1,
        reason: "Break overrun",
        source: "Policy",
      },
    ],
  },
  e05: {
    employeeCode: "AP-1311",
    hireDate: "2024-09-15",
    phoneMasked: "••• ••• 5508",
    policyCap: 12,
    schedule: weekSchedule([
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "late", "20 min"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "scheduled"),
      day("Off", "off"),
      day("Off", "off"),
    ]),
    pointLedger: [
      {
        id: "p05a",
        date: "2026-07-28",
        delta: 2,
        reason: "Running late 20 min",
        source: "SMS",
      },
      {
        id: "p05b",
        date: "2026-07-15",
        delta: 2,
        reason: "Late arrival — 15 min",
        source: "SMS",
      },
    ],
  },
  e06: {
    employeeCode: "AP-0448",
    hireDate: "2021-06-01",
    phoneMasked: "••• ••• 2290",
    policyCap: 12,
    schedule: weekSchedule([
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "worked"),
      day("10:00–18:30", "worked", "Swap — covering late"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "scheduled"),
      day("Off", "off"),
      day("Off", "off"),
    ]),
    pointLedger: [
      {
        id: "p06a",
        date: "2026-07-29",
        delta: 1,
        reason: "Covering late — swap approved (logged)",
        source: "Supervisor",
      },
      {
        id: "p06b",
        date: "2026-07-10",
        delta: 2,
        reason: "Late arrival — 11 min",
        source: "SMS",
      },
    ],
  },
  e07: {
    employeeCode: "AP-1520",
    hireDate: "2025-04-02",
    phoneMasked: "••• ••• 8814",
    policyCap: 12,
    schedule: weekSchedule([
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "scheduled"),
      day("Off", "off"),
      day("Off", "off"),
    ]),
    pointLedger: [
      {
        id: "p07a",
        date: "2026-07-05",
        delta: 2,
        reason: "Late arrival — 14 min",
        source: "SMS",
      },
    ],
  },
  e08: {
    employeeCode: "AP-0332",
    hireDate: "2020-02-18",
    phoneMasked: "••• ••• 6103",
    policyCap: 12,
    schedule: weekSchedule([
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "scheduled"),
      day("Off", "off"),
      day("Off", "off"),
    ]),
    pointLedger: [
      {
        id: "p08a",
        date: "2026-06-28",
        delta: 1,
        reason: "Break return delayed",
        source: "Policy",
      },
    ],
  },
  e09: {
    employeeCode: "AP-0988",
    hireDate: "2023-12-04",
    phoneMasked: "••• ••• 1477",
    policyCap: 12,
    schedule: weekSchedule([
      day("14:00–22:30", "worked"),
      day("14:00–22:30", "worked"),
      day("14:00–22:30", "worked"),
      day("14:00–22:30", "worked"),
      day("14:00–22:30", "scheduled"),
      day("Off", "off"),
      day("Off", "off"),
    ]),
    pointLedger: [
      {
        id: "p09a",
        date: "2026-07-02",
        delta: 1,
        reason: "Late punch — 6 min",
        source: "Policy",
      },
    ],
  },
  e10: {
    employeeCode: "AP-0775",
    hireDate: "2024-07-22",
    phoneMasked: "••• ••• 3906",
    policyCap: 12,
    schedule: weekSchedule([
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "scheduled"),
      day("Off", "off"),
      day("Off", "off"),
    ]),
    pointLedger: [],
  },
  e11: {
    employeeCode: "AP-1604",
    hireDate: "2025-06-10",
    phoneMasked: "••• ••• 2045",
    policyCap: 12,
    schedule: weekSchedule([
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "worked"),
      day("06:00–14:30", "scheduled"),
      day("Off", "off"),
      day("Off", "off"),
    ]),
    pointLedger: [],
  },
};

export function getPersonById(id: string): PersonProfile | null {
  const base = DEMO_ROSTER.find((row) => row.id === id);
  const extra = profiles[id];
  if (!base || !extra) return null;
  return { ...base, ...extra };
}

export function getAllPeople(): PersonProfile[] {
  return DEMO_ROSTER.map((row) => {
    const extra = profiles[row.id];
    if (!extra) {
      throw new Error(`Missing profile for ${row.id}`);
    }
    return { ...row, ...extra };
  });
}

export function pointsTowardCap(person: PersonProfile): number {
  return Math.min(person.points, person.policyCap);
}

export function riskProgressLabel(person: PersonProfile): string {
  const level = riskLevelFromPoints(person.points);
  if (level === "at_risk") return "At risk vs policy";
  if (level === "watch") return "Watch band";
  return "Within clear band";
}

/* ——— Analytics aggregates (demo) ——— */

export type DailyPointTrend = {
  date: string;
  label: string;
  points: number;
  signals: number;
};

export type TeamRiskRow = {
  team: string;
  atRisk: number;
  watch: number;
  clear: number;
  openPoints: number;
};

export type SignalTypeRow = {
  type: string;
  count: number;
};

/** Rolling 7-day floor trend (demo). */
export const ANALYTICS_TREND: DailyPointTrend[] = [
  { date: "2026-07-25", label: "Sat", points: 4, signals: 3 },
  { date: "2026-07-26", label: "Sun", points: 2, signals: 2 },
  { date: "2026-07-27", label: "Mon", points: 6, signals: 5 },
  { date: "2026-07-28", label: "Tue", points: 9, signals: 7 },
  { date: "2026-07-29", label: "Wed", points: 11, signals: 8 },
  { date: "2026-07-30", label: "Thu", points: 14, signals: 9 },
  { date: "2026-07-31", label: "Fri", points: 16, signals: 11 },
];

export function teamRiskBreakdown(roster: RosterEmployee[]): TeamRiskRow[] {
  const map = new Map<string, TeamRiskRow>();
  for (const row of roster) {
    const current = map.get(row.team) ?? {
      team: row.team,
      atRisk: 0,
      watch: 0,
      clear: 0,
      openPoints: 0,
    };
    current.openPoints += row.points;
    const level = riskLevelFromPoints(row.points);
    if (level === "at_risk") current.atRisk += 1;
    else if (level === "watch") current.watch += 1;
    else current.clear += 1;
    map.set(row.team, current);
  }
  return [...map.values()].sort((a, b) => b.openPoints - a.openPoints);
}

export function signalTypeBreakdown(): SignalTypeRow[] {
  const people = getAllPeople();
  const counts = new Map<string, number>();
  for (const person of people) {
    for (const event of person.pointLedger) {
      const key = event.reason.split("—")[0]?.trim() ?? event.reason;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export function topPointHolders(limit = 5): PersonProfile[] {
  return [...getAllPeople()]
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

export function analyticsSummary(roster: RosterEmployee[]) {
  const openPoints = roster.reduce((sum, row) => sum + row.points, 0);
  const weekPoints = ANALYTICS_TREND.reduce((sum, d) => sum + d.points, 0);
  const weekSignals = ANALYTICS_TREND.reduce((sum, d) => sum + d.signals, 0);
  const atRisk = roster.filter(
    (r) => riskLevelFromPoints(r.points) === "at_risk",
  ).length;
  return {
    openPoints,
    weekPoints,
    weekSignals,
    atRisk,
    headcount: roster.length,
    avgPoints:
      roster.length === 0
        ? 0
        : Math.round((openPoints / roster.length) * 10) / 10,
  };
}
