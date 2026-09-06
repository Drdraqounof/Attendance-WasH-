import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { employees, pointEvents, warnings } from "@/db/schema";
import {
  applyPointEvent,
  POLICY_CAP,
  type EscalationRuleCode,
  type PolicyThresholdKey,
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
