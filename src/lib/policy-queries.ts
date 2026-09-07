import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  employees,
  policyThresholds,
  pointEvents,
  warnings,
} from "@/db/schema";
import {
  applyPointEvent,
  POLICY_CAP,
  riskLevelFromPoints,
  type EscalationRuleCode,
  type PolicyThresholdKey,
  type RiskLevel,
} from "@/lib/policy-engine";

/**
 * Drizzle read/write layer over src/lib/policy-engine.ts's pure rules.
 * Conventions follow src/lib/insights-queries.ts. Note: Neon's HTTP
 * driver (drizzle-orm/neon-http) doesn't give us interactive
 * transactions across dependent reads/writes the way a pooled TCP
 * connection would, so these run as sequential statements rather than
 * a wrapped db.transaction() — acceptable for this app's current
 * single-writer demo scope, but worth revisiting (switch to
 * drizzle-orm/neon-serverless) if concurrent writers are introduced.
 */

export type PointEventSource = "SMS" | "Policy" | "Supervisor";

export type RecordPointEventInput = {
  /** Ledger row id, e.g. "p12c" — caller-generated to match existing id style. */
  id: string;
  employeeId: string;
  date: string;
  ruleCode: EscalationRuleCode | string;
  reason: string;
  source: PointEventSource;
};

export type RecordPointEventResult = {
  previousPoints: number;
  newPoints: number;
  crossedThresholdKeys: PolicyThresholdKey[];
  /** True once the employee is at (or clamped to) the 16-point cap — on a PIP. */
  isPipFlag: boolean;
};

/**
 * Records one infraction: inserts the ledger row, updates the
 * employee's running point total, and opens a `warnings` row for every
 * threshold the event just crossed (2pt verbal warning, 10pt required
 * manager meeting, 16pt PIP).
 */
export async function recordPointEvent(
  input: RecordPointEventInput,
): Promise<RecordPointEventResult> {
  const [employee] = await db
    .select({ points: employees.points, policyCap: employees.policyCap })
    .from(employees)
    .where(eq(employees.id, input.employeeId));

  if (!employee) {
    throw new Error(`Unknown employee: ${input.employeeId}`);
  }

  const result = applyPointEvent(
    employee.points,
    input.ruleCode,
    employee.policyCap ?? POLICY_CAP,
  );

  await db.insert(pointEvents).values({
    id: input.id,
    employeeId: input.employeeId,
    date: input.date,
    delta: result.delta,
    reason: input.reason,
    source: input.source,
    ruleCode: input.ruleCode,
  });

  await db
    .update(employees)
    .set({ points: result.newPoints })
    .where(eq(employees.id, input.employeeId));

  if (result.crossedThresholds.length > 0) {
    await db.insert(warnings).values(
      result.crossedThresholds.map((threshold) => ({
        employeeId: input.employeeId,
        thresholdKey: threshold.key,
        pointsAtTrigger: result.newPoints,
        status: "open" as const,
      })),
    );
  }

  return {
    previousPoints: result.previousPoints,
    newPoints: result.newPoints,
    crossedThresholdKeys: result.crossedThresholds.map((t) => t.key),
    isPipFlag: result.isPipFlag,
  };
}

export type EmployeePolicySnapshot = {
  points: number;
  policyCap: number;
  riskLevel: RiskLevel;
};

/**
 * The employee's *real* (DB-backed) current points/band — distinct
 * from the mock-driven `points` shown elsewhere on
 * /dashboard/people/[id] today. See docs/employee-track-record-plan.md.
 */
export async function getEmployeePolicySnapshot(
  employeeId: string,
): Promise<EmployeePolicySnapshot | null> {
  const [employee] = await db
    .select({ points: employees.points, policyCap: employees.policyCap })
    .from(employees)
    .where(eq(employees.id, employeeId));

  if (!employee) return null;

  return {
    points: employee.points,
    policyCap: employee.policyCap,
    riskLevel: riskLevelFromPoints(employee.points, employee.policyCap),
  };
}

export type HistoryEntry =
  | {
      kind: "point_event";
      id: string;
      date: string;
      delta: number;
      reason: string;
      source: string;
      ruleCode: string | null;
    }
  | {
      kind: "threshold_crossed";
      id: string;
      date: string;
      thresholdKey: PolicyThresholdKey;
      label: string;
      pointsAtTrigger: number;
      status: "open" | "acknowledged" | "resolved";
    };

/**
 * An employee's full track record: every point ledger entry and every
 * threshold crossing (verbal warning / manager meeting / PIP), merged
 * into one reverse-chronological timeline. Follows the query
 * conventions in src/lib/insights-queries.ts.
 */
export async function getEmployeeHistory(
  employeeId: string,
): Promise<HistoryEntry[]> {
  const [eventRows, warningRows] = await Promise.all([
    db
      .select()
      .from(pointEvents)
      .where(eq(pointEvents.employeeId, employeeId))
      .orderBy(desc(pointEvents.date)),
    db
      .select({
        id: warnings.id,
        createdAt: warnings.createdAt,
        thresholdKey: warnings.thresholdKey,
        label: policyThresholds.label,
        pointsAtTrigger: warnings.pointsAtTrigger,
        status: warnings.status,
      })
      .from(warnings)
      .innerJoin(
        policyThresholds,
        eq(warnings.thresholdKey, policyThresholds.key),
      )
      .where(eq(warnings.employeeId, employeeId))
      .orderBy(desc(warnings.createdAt)),
  ]);

  const entries: HistoryEntry[] = [
    ...eventRows.map(
      (row): HistoryEntry => ({
        kind: "point_event",
        id: row.id,
        date: row.date,
        delta: row.delta,
        reason: row.reason,
        source: row.source,
        ruleCode: row.ruleCode,
      }),
    ),
    ...warningRows.map(
      (row): HistoryEntry => ({
        kind: "threshold_crossed",
        id: `warning-${row.id}`,
        date: row.createdAt.toISOString().slice(0, 10),
        thresholdKey: row.thresholdKey as PolicyThresholdKey,
        label: row.label,
        pointsAtTrigger: row.pointsAtTrigger,
        status: row.status,
      }),
    ),
  ];

  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export type ResetEmployeeStatusResult = {
  previousPoints: number;
  resolvedWarningCount: number;
};

/**
 * Manually clears an employee's status back to "Clear": zeroes their
 * points, logs the reset as an auditable ledger entry (never silently
 * edits the total), and resolves any open/acknowledged warnings. Same
 * "ledger it, don't erase it" shape as the (still-unbuilt) anniversary
 * reset described in docs/points-system-brd.md Phase 5.
 */
export async function resetEmployeeStatus(
  employeeId: string,
  note?: string,
): Promise<ResetEmployeeStatusResult> {
  const [employee] = await db
    .select({ points: employees.points })
    .from(employees)
    .where(eq(employees.id, employeeId));

  if (!employee) {
    throw new Error(`Unknown employee: ${employeeId}`);
  }

  if (employee.points > 0) {
    await db.insert(pointEvents).values({
      id: `reset-${employeeId}-${Date.now()}`,
      employeeId,
      date: new Date().toISOString().slice(0, 10),
      delta: -employee.points,
      reason: note?.trim() || "Manually cleared by manager",
      source: "Supervisor",
      ruleCode: null,
    });
  }

  await db
    .update(employees)
    .set({ points: 0 })
    .where(eq(employees.id, employeeId));

  const resolved = await db
    .update(warnings)
    .set({ status: "resolved" })
    .where(
      and(
        eq(warnings.employeeId, employeeId),
        inArray(warnings.status, ["open", "acknowledged"]),
      ),
    )
    .returning({ id: warnings.id });

  return {
    previousPoints: employee.points,
    resolvedWarningCount: resolved.length,
  };
}
