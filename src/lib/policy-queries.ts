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
  POLICY_THRESHOLDS,
  riskLevelFromPoints,
  type EscalationRuleCode,
  type PolicyThreshold,
  type PolicyThresholdKey,
  type RiskLevel,
} from "@/lib/policy-engine";

/**
 * The two thresholds an admin can retune from Settings. "pip" is
 * intentionally excluded — it's defined as the employee's policy cap
 * (employees.policyCap), not an independently editable trigger; see
 * docs/policy-thresholds-editing.md.
 */
const EDITABLE_THRESHOLD_KEYS: PolicyThresholdKey[] = [
  "verbal_warning",
  "manager_meeting",
];

/**
 * Static text (label/action copy) the DB's `policy_thresholds` table
 * doesn't carry a column for — merged onto the DB's live `pointValue`
 * so edits don't require a schema migration just to keep descriptive
 * copy in sync.
 */
const THRESHOLD_ACTION_TEXT: Record<PolicyThresholdKey, string> = {
  verbal_warning: "Notify the employee's manager/supervisor to conduct a verbal warning conversation. Logged in system.",
  manager_meeting: "Flag the employee profile and require a formal attendance meeting between the employee and their manager/supervisor.",
  pip: "Place the employee on a formal Performance Improvement Plan (PIP) and notify HR. This is a corrective action step, not an automatic termination.",
};

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
 * Reads the current (possibly admin-edited) thresholds from the
 * `policy_thresholds` table, ordered by point value. Falls back to the
 * static POLICY_THRESHOLDS if the table is somehow empty (shouldn't
 * happen post-seed, but keeps callers from computing against nothing).
 */
export async function getPolicyThresholds(): Promise<PolicyThreshold[]> {
  const rows = await db
    .select()
    .from(policyThresholds)
    .orderBy(policyThresholds.pointValue);

  if (rows.length === 0) return POLICY_THRESHOLDS;

  return rows.map((row) => ({
    key: row.key as PolicyThresholdKey,
    pointValue: row.pointValue,
    label: row.label,
    action:
      THRESHOLD_ACTION_TEXT[row.key as PolicyThresholdKey] ??
      "Automated workflow triggered.",
  }));
}

export type UpdatePolicyThresholdResult = {
  thresholds: PolicyThreshold[];
};

/**
 * Admin edit: retune one of the two editable thresholds (verbal
 * warning / required manager meeting). Validates ordering so the
 * three tiers can never cross each other or the policy cap:
 * 0 < verbal_warning < manager_meeting < POLICY_CAP.
 */
export async function updatePolicyThreshold(
  key: PolicyThresholdKey,
  pointValue: number,
): Promise<UpdatePolicyThresholdResult> {
  if (!EDITABLE_THRESHOLD_KEYS.includes(key)) {
    throw new Error(
      `"${key}" isn't editable — it's fixed at the policy cap (${POLICY_CAP}).`,
    );
  }
  if (!Number.isInteger(pointValue) || pointValue <= 0) {
    throw new Error("Threshold must be a positive whole number of points.");
  }

  const current = await getPolicyThresholds();
  const next = current.map((t) => (t.key === key ? { ...t, pointValue } : t));
  const [verbal, meeting, pip] = [
    next.find((t) => t.key === "verbal_warning")!,
    next.find((t) => t.key === "manager_meeting")!,
    next.find((t) => t.key === "pip")!,
  ];
  if (!(verbal.pointValue < meeting.pointValue && meeting.pointValue < pip.pointValue)) {
    throw new Error(
      `Thresholds must stay in order: verbal warning (${verbal.pointValue}) < required manager meeting (${meeting.pointValue}) < PIP (${pip.pointValue}).`,
    );
  }

  await db
    .update(policyThresholds)
    .set({ pointValue })
    .where(eq(policyThresholds.key, key));

  return { thresholds: next };
}

/**
 * Records one infraction: inserts the ledger row, updates the
 * employee's running point total, and opens a `warnings` row for every
 * threshold the event just crossed (verbal warning, required manager
 * meeting, PIP — using the live, possibly admin-edited threshold
 * values, not the static defaults).
 */
export async function recordPointEvent(
  input: RecordPointEventInput,
): Promise<RecordPointEventResult> {
  const [employee, thresholds] = await Promise.all([
    db
      .select({ points: employees.points, policyCap: employees.policyCap })
      .from(employees)
      .where(eq(employees.id, input.employeeId))
      .then((rows) => rows[0]),
    getPolicyThresholds(),
  ]);

  if (!employee) {
    throw new Error(`Unknown employee: ${input.employeeId}`);
  }

  const result = applyPointEvent(
    employee.points,
    input.ruleCode,
    employee.policyCap ?? POLICY_CAP,
    thresholds,
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
  const [[employee], thresholds] = await Promise.all([
    db
      .select({ points: employees.points, policyCap: employees.policyCap })
      .from(employees)
      .where(eq(employees.id, employeeId)),
    getPolicyThresholds(),
  ]);

  if (!employee) return null;

  return {
    points: employee.points,
    policyCap: employee.policyCap,
    riskLevel: riskLevelFromPoints(employee.points, employee.policyCap, thresholds),
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
