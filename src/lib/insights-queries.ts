import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { employees, pointEvents } from "@/db/schema";
import { attendanceScoreFromPoints } from "@/lib/attendance-utils";
import {
  POLICY_THRESHOLDS,
  riskLevelFromPoints,
  type RiskLevel,
} from "@/lib/policy-engine";
import type { TrendDirection } from "@/lib/ai-analysis-mock";

/**
 * Drizzle/Neon-backed replacements for the four deterministic
 * `/insights` sections that used to read from ai-analysis-mock.ts +
 * people-mock.ts. Same math, same output shapes (renamed to avoid
 * importing PersonProfile) — now driven by a `days` time window
 * instead of a hardcoded 30, and querying `employees` / `point_events`
 * directly. See docs/database.md for the schema these read from.
 *
 * The mock files are untouched — /analytics still uses them.
 */

/** Fixed "today" for demo data, matching DEMO_TODAY in people-mock.ts. */
const REFERENCE_DATE = "2026-08-02";

function isoDateDaysAgo(days: number, from = REFERENCE_DATE): string {
  const d = new Date(`${from}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export type LatenessPatternRow = {
  employeeId: string;
  name: string;
  lateCount: number;
  narrative: string;
};

/** "Frequent lateness patterns" — employees with `minLateCount`+ late events in the window. */
export async function frequentLatenessPatterns(
  days = 30,
  minLateCount = 3,
): Promise<LatenessPatternRow[]> {
  const since = isoDateDaysAgo(days);
  const lateCountExpr = sql<number>`count(*)`;

  const rows = await db
    .select({
      employeeId: employees.id,
      name: employees.name,
      lateCount: lateCountExpr.as("late_count"),
    })
    .from(pointEvents)
    .innerJoin(employees, eq(pointEvents.employeeId, employees.id))
    .where(
      and(
        gte(pointEvents.date, since),
        lte(pointEvents.date, REFERENCE_DATE),
        sql`${pointEvents.reason} ilike '%late%'`,
      ),
    )
    .groupBy(employees.id, employees.name)
    .having(sql`count(*) >= ${minLateCount}`)
    .orderBy(desc(lateCountExpr));

  return rows.map((row) => {
    const lateCount = Number(row.lateCount);
    return {
      employeeId: row.employeeId,
      name: row.name,
      lateCount,
      narrative: `${row.name} has been late ${lateCount} time${
        lateCount === 1 ? "" : "s"
      } within the last ${days} days. Recommend attendance discussion.`,
    };
  });
}

export type SignalTypeRow = {
  type: string;
  count: number;
};

/** "Common causes of attendance issues" — top reason categories in the window. */
export async function signalTypeBreakdown(
  days = 30,
  limit = 6,
): Promise<SignalTypeRow[]> {
  const since = isoDateDaysAgo(days);
  // Reasons are formatted "Category — detail" (see point-event seed data);
  // split_part on the em dash recovers the same category people-mock.ts
  // derives with `reason.split("—")[0]`.
  const typeExpr = sql<string>`trim(split_part(${pointEvents.reason}, '—', 1))`;
  const countExpr = sql<number>`count(*)`;

  const rows = await db
    .select({ type: typeExpr.as("type"), count: countExpr.as("count") })
    .from(pointEvents)
    .where(and(gte(pointEvents.date, since), lte(pointEvents.date, REFERENCE_DATE)))
    .groupBy(typeExpr)
    .orderBy(desc(countExpr))
    .limit(limit);

  return rows.map((row) => ({ type: row.type, count: Number(row.count) }));
}

export type AtRiskRow = {
  employeeId: string;
  name: string;
  reliabilityScore: number;
  reason: string;
  /** How close this employee is to the 16-point cap — see policy-engine.ts. */
  riskLevel: RiskLevel;
  /** True once points have reached the cap — final review/termination protocol. */
  isTerminationFlag: boolean;
};

/**
 * "Employees at risk of attendance problems" — watch band (the lowest
 * automated-workflow threshold, 2 points) and above, worst first.
 * Employees who've reached the 16-point cap (`isTerminationFlag: true`)
 * sort to the top, per docs/points-system-brd.md's escalation policy.
 */
export async function employeesAtRisk(days = 30): Promise<AtRiskRow[]> {
  const since = isoDateDaysAgo(days);
  const watchFloor = POLICY_THRESHOLDS[0]!.pointValue; // 2 — "verbal_warning"
  const incidentCountExpr = sql<number>`count(${pointEvents.id}) filter (where ${pointEvents.date} >= ${since} and ${pointEvents.date} <= ${REFERENCE_DATE})`;

  const rows = await db
    .select({
      id: employees.id,
      name: employees.name,
      points: employees.points,
      policyCap: employees.policyCap,
      suggestedAction: employees.suggestedAction,
      incidentCount: incidentCountExpr.as("incident_count"),
    })
    .from(employees)
    .leftJoin(pointEvents, eq(pointEvents.employeeId, employees.id))
    .where(gte(employees.points, watchFloor))
    .groupBy(
      employees.id,
      employees.name,
      employees.points,
      employees.policyCap,
      employees.suggestedAction,
    );

  return rows
    .map((row) => {
      const incidentCount = Number(row.incidentCount);
      const riskLevel = riskLevelFromPoints(row.points, row.policyCap);
      return {
        employeeId: row.id,
        name: row.name,
        reliabilityScore: attendanceScoreFromPoints(row.points, row.policyCap),
        reason:
          incidentCount > 0
            ? `${incidentCount} incident${incidentCount === 1 ? "" : "s"} in the last ${days} days`
            : row.suggestedAction,
        riskLevel,
        isTerminationFlag: riskLevel === "termination_flag",
      };
    })
    .sort((a, b) => {
      if (a.isTerminationFlag !== b.isTerminationFlag) {
        return a.isTerminationFlag ? -1 : 1;
      }
      return a.reliabilityScore - b.reliabilityScore;
    });
}

export type ReliabilityRow = {
  employeeId: string;
  name: string;
  score: number;
  trend: TrendDirection;
};

/**
 * "Attendance reliability scores & improvement trends" — highest score
 * first, capped to `limit` rows so the table stays performant as
 * headcount scales (task: UI scalability).
 */
export async function reliabilityRanking(
  days = 30,
  limit = 10,
): Promise<ReliabilityRow[]> {
  const currentSince = isoDateDaysAgo(days);
  const previousSince = isoDateDaysAgo(days * 2);
  const previousUntil = isoDateDaysAgo(days + 1);

  const currentSumExpr = sql<number>`coalesce(sum(${pointEvents.delta}) filter (where ${pointEvents.date} >= ${currentSince} and ${pointEvents.date} <= ${REFERENCE_DATE}), 0)`;
  const previousSumExpr = sql<number>`coalesce(sum(${pointEvents.delta}) filter (where ${pointEvents.date} >= ${previousSince} and ${pointEvents.date} <= ${previousUntil}), 0)`;

  const rows = await db
    .select({
      id: employees.id,
      name: employees.name,
      points: employees.points,
      policyCap: employees.policyCap,
      currentSum: currentSumExpr.as("current_sum"),
      previousSum: previousSumExpr.as("previous_sum"),
    })
    .from(employees)
    .leftJoin(pointEvents, eq(pointEvents.employeeId, employees.id))
    .groupBy(employees.id, employees.name, employees.points, employees.policyCap);

  return rows
    .map((row) => {
      const current = Number(row.currentSum);
      const previous = Number(row.previousSum);
      const trend: TrendDirection =
        current < previous ? "improving" : current > previous ? "worsening" : "stable";
      return {
        employeeId: row.id,
        name: row.name,
        score: attendanceScoreFromPoints(row.points, row.policyCap),
        trend,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
