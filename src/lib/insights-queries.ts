import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { employees, pointEvents } from "@/db/schema";
import { getPolicyThresholds } from "@/lib/policy-queries";
import { clampToCap, riskLevelFromPoints, type RiskLevel } from "@/lib/policy-engine";
import type { TrendDirection } from "@/lib/ai-analysis-mock";

/**
 * Drizzle/Neon-backed replacements for the four deterministic
 * `/insights` sections that used to read from ai-analysis-mock.ts +
 * people-mock.ts — driven by a `days` time window instead of a
 * hardcoded 30, and querying `employees` / `point_events` directly.
 * See docs/database/database.md for the schema these read from.
 *
 * `AtRiskRow`/`ReliabilityRow` show raw points + a policy-engine risk
 * band (see src/lib/policy-engine.ts), not the old 0-100
 * attendanceScoreFromPoints() percentage — see
 * docs/planning/employee-track-record-plan.md.
 *
 * The mock files are untouched — /analytics still uses them.
 */

/** Fixed "today" for demo data, matching DEMO_TODAY in people-mock.ts. */
const REFERENCE_DATE = "2026-08-02";

/**
 * The policy PDF §5 evaluates points on a rolling 12-month period, not
 * an all-time total — see src/lib/policy-queries.ts::rollingPolicyPoints
 * for the single-employee equivalent of this window.
 */
const ROLLING_WINDOW_DAYS = 365;

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
  /** Rolling-12-month points (policy PDF §5) — the display field, not a 0-100 score. */
  points: number;
  /** This employee's policy cap (usually 16) — needed to ground recommendedNextStep(). */
  policyCap: number;
  reason: string;
  /** How close this employee is to the 16-point cap — see policy-engine.ts. */
  riskLevel: RiskLevel;
  /** True once points have reached the cap — the policy's termination threshold. */
  isTerminationFlag: boolean;
};

/**
 * "Employees at risk of attendance problems" — the "low" band (the
 * lowest automated-workflow threshold, 1 point) and above, worst first.
 * Employees who've reached the 16-point cap (`isTerminationFlag: true`)
 * sort to the top, per the policy PDF §5. Points are the rolling
 * 12-month sum, not employees.points' all-time running total.
 */
export async function employeesAtRisk(days = 30): Promise<AtRiskRow[]> {
  const since = isoDateDaysAgo(days);
  const rollingSince = isoDateDaysAgo(ROLLING_WINDOW_DAYS);
  const thresholds = await getPolicyThresholds();
  const watchFloor = Math.min(...thresholds.map((t) => t.pointValue));
  const incidentCountExpr = sql<number>`count(${pointEvents.id}) filter (where ${pointEvents.date} >= ${since} and ${pointEvents.date} <= ${REFERENCE_DATE})`;
  const rollingSumExpr = sql<number>`coalesce(sum(${pointEvents.delta}) filter (where ${pointEvents.date} >= ${rollingSince} and ${pointEvents.date} <= ${REFERENCE_DATE}), 0)`;

  const rows = await db
    .select({
      id: employees.id,
      name: employees.name,
      policyCap: employees.policyCap,
      suggestedAction: employees.suggestedAction,
      incidentCount: incidentCountExpr.as("incident_count"),
      rollingPoints: rollingSumExpr.as("rolling_points"),
    })
    .from(employees)
    .leftJoin(pointEvents, eq(pointEvents.employeeId, employees.id))
    .groupBy(employees.id, employees.name, employees.policyCap, employees.suggestedAction);

  return rows
    .map((row) => {
      const incidentCount = Number(row.incidentCount);
      const points = clampToCap(Number(row.rollingPoints), row.policyCap);
      const riskLevel = riskLevelFromPoints(points, row.policyCap, thresholds);
      return {
        employeeId: row.id,
        name: row.name,
        points,
        policyCap: row.policyCap,
        reason:
          incidentCount > 0
            ? `${incidentCount} incident${incidentCount === 1 ? "" : "s"} in the last ${days} days`
            : row.suggestedAction,
        riskLevel,
        isTerminationFlag: riskLevel === "termination",
      };
    })
    .filter((row) => row.points >= watchFloor)
    .sort((a, b) => {
      if (a.isTerminationFlag !== b.isTerminationFlag) {
        return a.isTerminationFlag ? -1 : 1;
      }
      // Worst first — highest points among the non-flagged rows leads.
      return b.points - a.points;
    });
}

export type ReliabilityRow = {
  employeeId: string;
  name: string;
  /** Rolling-12-month points (policy PDF §5) — the display field, not a 0-100 score. */
  points: number;
  riskLevel: RiskLevel;
  trend: TrendDirection;
};

/**
 * "Attendance reliability scores & improvement trends" — most reliable
 * (lowest points) first, capped to `limit` rows so the table stays
 * performant as headcount scales (task: UI scalability). `trend`
 * compares two `days`-long windows (default 30); `points`/`riskLevel`
 * are the rolling-12-month total, independent of that trend window.
 */
export async function reliabilityRanking(
  days = 30,
  limit = 10,
): Promise<ReliabilityRow[]> {
  const currentSince = isoDateDaysAgo(days);
  const previousSince = isoDateDaysAgo(days * 2);
  const previousUntil = isoDateDaysAgo(days + 1);
  const rollingSince = isoDateDaysAgo(ROLLING_WINDOW_DAYS);

  const currentSumExpr = sql<number>`coalesce(sum(${pointEvents.delta}) filter (where ${pointEvents.date} >= ${currentSince} and ${pointEvents.date} <= ${REFERENCE_DATE}), 0)`;
  const previousSumExpr = sql<number>`coalesce(sum(${pointEvents.delta}) filter (where ${pointEvents.date} >= ${previousSince} and ${pointEvents.date} <= ${previousUntil}), 0)`;
  const rollingSumExpr = sql<number>`coalesce(sum(${pointEvents.delta}) filter (where ${pointEvents.date} >= ${rollingSince} and ${pointEvents.date} <= ${REFERENCE_DATE}), 0)`;

  const thresholds = await getPolicyThresholds();
  const rows = await db
    .select({
      id: employees.id,
      name: employees.name,
      policyCap: employees.policyCap,
      currentSum: currentSumExpr.as("current_sum"),
      previousSum: previousSumExpr.as("previous_sum"),
      rollingPoints: rollingSumExpr.as("rolling_points"),
    })
    .from(employees)
    .leftJoin(pointEvents, eq(pointEvents.employeeId, employees.id))
    .groupBy(employees.id, employees.name, employees.policyCap);

  return rows
    .map((row) => {
      const current = Number(row.currentSum);
      const previous = Number(row.previousSum);
      const trend: TrendDirection =
        current < previous ? "improving" : current > previous ? "worsening" : "stable";
      const points = clampToCap(Number(row.rollingPoints), row.policyCap);
      return {
        employeeId: row.id,
        name: row.name,
        points,
        riskLevel: riskLevelFromPoints(points, row.policyCap, thresholds),
        trend,
      };
    })
    .sort((a, b) => a.points - b.points)
    .slice(0, limit);
}
