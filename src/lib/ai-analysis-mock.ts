import { attendanceScoreFromPoints } from "@/lib/attendance-utils";
import { riskLevelFromPoints } from "@/lib/dashboard-mock";
import {
  DEMO_TODAY,
  getAllPeople,
  incidentSummary,
  type PersonProfile,
} from "@/lib/people-mock";

/**
 * Rule-based stand-ins for the "AI Attendance Analysis" capabilities in the
 * attendance plan (frequent lateness patterns, at-risk employees,
 * improvement trends, reliability scores). Demo: derived from the mock
 * point ledgers rather than a real model.
 */

export type TrendDirection = "improving" | "stable" | "worsening";

export const TREND_LABELS: Record<TrendDirection, string> = {
  improving: "Improving",
  stable: "Stable",
  worsening: "Worsening",
};

function daysBetween(earlier: string, later: string): number {
  const ms = new Date(later).getTime() - new Date(earlier).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function pointsWithAgeRange(
  person: PersonProfile,
  minAge: number,
  maxAge: number,
  referenceDate = DEMO_TODAY,
): number {
  return person.pointLedger
    .filter((event) => {
      const age = daysBetween(event.date, referenceDate);
      return age >= minAge && age <= maxAge;
    })
    .reduce((sum, event) => sum + event.delta, 0);
}

/** Compares the trailing window to the prior window of equal length. */
export function attendanceTrendDirection(
  person: PersonProfile,
  days = 30,
  referenceDate = DEMO_TODAY,
): TrendDirection {
  const current = pointsWithAgeRange(person, 0, days, referenceDate);
  const previous = pointsWithAgeRange(
    person,
    days + 1,
    days * 2,
    referenceDate,
  );
  if (current < previous) return "improving";
  if (current > previous) return "worsening";
  return "stable";
}

export type LatenessPatternRow = {
  person: PersonProfile;
  lateCount: number;
  narrative: string;
};

/** "Frequent lateness patterns" — the plan's headline AI signal. */
export function frequentLatenessPatterns(
  minLateCount = 3,
  days = 30,
): LatenessPatternRow[] {
  return getAllPeople()
    .map((person) => ({
      person,
      lateCount: incidentSummary(person, days).lateCount,
    }))
    .filter((row) => row.lateCount >= minLateCount)
    .sort((a, b) => b.lateCount - a.lateCount)
    .map((row) => ({
      ...row,
      narrative: `${row.person.name} has been late ${row.lateCount} time${
        row.lateCount === 1 ? "" : "s"
      } within the last ${days} days. Recommend attendance discussion.`,
    }));
}

export type AtRiskRow = {
  person: PersonProfile;
  reliabilityScore: number;
  reason: string;
};

/** "Employees at risk of attendance problems." */
export function employeesAtRisk(days = 30): AtRiskRow[] {
  return getAllPeople()
    .filter((person) => riskLevelFromPoints(person.points) !== "clear")
    .map((person) => {
      const summary = incidentSummary(person, days);
      return {
        person,
        reliabilityScore: attendanceScoreFromPoints(
          person.points,
          person.policyCap,
        ),
        reason:
          summary.totalIncidents > 0
            ? `${summary.totalIncidents} incident${summary.totalIncidents === 1 ? "" : "s"} in the last ${days} days`
            : person.suggestedAction,
      };
    })
    .sort((a, b) => a.reliabilityScore - b.reliabilityScore);
}

export type ReliabilityRow = {
  person: PersonProfile;
  score: number;
  trend: TrendDirection;
};

/** "Attendance reliability scores" ranked alongside "Improvement trends." */
export function reliabilityRanking(days = 30): ReliabilityRow[] {
  return getAllPeople()
    .map((person) => ({
      person,
      score: attendanceScoreFromPoints(person.points, person.policyCap),
      trend: attendanceTrendDirection(person, days),
    }))
    .sort((a, b) => b.score - a.score);
}
