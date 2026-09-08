import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  employees,
  policyThresholds,
  pointEvents,
  pointRules,
  warnings,
} from "@/db/schema";
import {
  applyPointEvent,
  clampToCap,
  ESCALATION_RULES,
  POLICY_CAP,
  POLICY_THRESHOLDS,
  riskLevelFromPoints,
  thresholdsCrossed,
  type EscalationRule,
  type EscalationRuleCode,
  type PolicyThreshold,
  type PolicyThresholdKey,
  type RiskLevel,
} from "@/lib/policy-engine";

/** Every status a manager can set an employee to, in ascending severity. */
export const TARGET_STATUSES: RiskLevel[] = ["clear", "watch", "at_risk", "pip_flag"];

/** All four escalation codes — mirrors policy-engine.ts's EscalationRuleCode union. */
const ESCALATION_RULE_CODES: EscalationRuleCode[] = [
  "minor_tardy",
  "moderate_tardy",
  "severe_late_absence",
  "nc_ns_major",
];

/**
 * All three thresholds are editable from Settings. Editing "pip" also
 * bulk-updates every employee's `policyCap` to match — PIP *is* the
 * policy cap, so the two are kept in sync rather than letting them
 * drift apart. See docs/policy-thresholds-editing.md.
 */
const EDITABLE_THRESHOLD_KEYS: PolicyThresholdKey[] = [
  "verbal_warning",
  "manager_meeting",
  "pip",
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
 * Admin edit: retune any of the three thresholds. Validates ordering
 * so the tiers can never cross each other: 0 < verbal_warning <
 * manager_meeting < pip. Editing "pip" additionally bulk-updates every
 * employee's `policyCap` to the new value, since PIP is defined as the
 * policy cap — see docs/policy-thresholds-editing.md.
 */
export async function updatePolicyThreshold(
  key: PolicyThresholdKey,
  pointValue: number,
): Promise<UpdatePolicyThresholdResult> {
  if (!EDITABLE_THRESHOLD_KEYS.includes(key)) {
    throw new Error(`"${key}" isn't a recognized threshold.`);
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

  if (key === "pip") {
    // PIP *is* the policy cap — keep every employee's cap in sync
    // rather than letting the displayed threshold and the actual
    // clamp/pip-flag behavior (which reads employees.policyCap) drift
    // apart. Org-wide bulk update: every employee shares one cap today
    // (see src/db/seed.ts::POLICY_CAP), there's no per-employee
    // override to preserve.
    await db.update(employees).set({ policyCap: pointValue });
  }

  return { thresholds: next };
}

/**
 * Reads the current (possibly admin-edited) escalation schedule from
 * the `point_rules` table (the four rows with a `code`), ordered by
 * point value. Falls back to the static ESCALATION_RULES if the table
 * is somehow empty.
 */
export async function getEscalationRules(): Promise<EscalationRule[]> {
  const rows = await db
    .select({
      code: pointRules.code,
      label: pointRules.label,
      points: pointRules.points,
    })
    .from(pointRules)
    .where(isNotNull(pointRules.code))
    .orderBy(pointRules.points);

  if (rows.length === 0) return ESCALATION_RULES;

  return rows.map((row) => ({
    code: row.code as EscalationRuleCode,
    label: row.label,
    points: row.points ?? 0,
  }));
}

export type UpdateEscalationRuleResult = {
  rules: EscalationRule[];
};

/**
 * Admin edit: retune how many points one escalation tier is worth.
 * Validates ordering so the four tiers stay meaningfully escalating:
 * minor_tardy < moderate_tardy < severe_late_absence < nc_ns_major.
 */
export async function updateEscalationRule(
  code: EscalationRuleCode,
  points: number,
): Promise<UpdateEscalationRuleResult> {
  if (!ESCALATION_RULE_CODES.includes(code)) {
    throw new Error(`"${code}" isn't a recognized escalation rule.`);
  }
  if (!Number.isInteger(points) || points <= 0) {
    throw new Error("Points must be a positive whole number.");
  }

  const current = await getEscalationRules();
  const next = current.map((r) => (r.code === code ? { ...r, points } : r));
  const byCode = Object.fromEntries(next.map((r) => [r.code, r.points]));
  if (
    !(
      byCode.minor_tardy < byCode.moderate_tardy &&
      byCode.moderate_tardy < byCode.severe_late_absence &&
      byCode.severe_late_absence < byCode.nc_ns_major
    )
  ) {
    throw new Error(
      `Escalation tiers must stay in order: minor (${byCode.minor_tardy}) < moderate (${byCode.moderate_tardy}) < severe (${byCode.severe_late_absence}) < no-call/no-show (${byCode.nc_ns_major}).`,
    );
  }

  await db
    .update(pointRules)
    .set({ points, value: `+${points}` })
    .where(eq(pointRules.code, code));

  return { rules: next };
}

/**
 * Records one infraction: inserts the ledger row, updates the
 * employee's running point total, and opens a `warnings` row for every
 * threshold the event just crossed (verbal warning, required manager
 * meeting, PIP — using the live, possibly admin-edited threshold and
 * escalation-rule values, not the static defaults).
 */
export async function recordPointEvent(
  input: RecordPointEventInput,
): Promise<RecordPointEventResult> {
  const [employee, thresholds, escalationRules] = await Promise.all([
    db
      .select({ points: employees.points, policyCap: employees.policyCap })
      .from(employees)
      .where(eq(employees.id, input.employeeId))
      .then((rows) => rows[0]),
    getPolicyThresholds(),
    getEscalationRules(),
  ]);

  if (!employee) {
    throw new Error(`Unknown employee: ${input.employeeId}`);
  }

  const result = applyPointEvent(
    employee.points,
    input.ruleCode,
    employee.policyCap ?? POLICY_CAP,
    thresholds,
    escalationRules,
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

export type SetEmployeeStatusResult = {
  previousPoints: number;
  newPoints: number;
  delta: number;
  targetStatus: RiskLevel;
  /** Thresholds newly opened, if the change moved points up. */
  crossedThresholdKeys: PolicyThresholdKey[];
  /** Warnings resolved because they no longer apply, if points moved down. */
  resolvedWarningCount: number;
};

/**
 * The point value that puts an employee at the *start* of a given
 * band — the lower boundary, since a band is a range and the boundary
 * is the only unambiguous single point within it. "clear" is always 0;
 * "pip_flag" is always the employee's policy cap (see
 * docs/policy-thresholds-editing.md's PIP↔cap coupling).
 */
function pointsForTargetStatus(
  targetStatus: RiskLevel,
  cap: number,
  thresholds: PolicyThreshold[],
): number {
  const sorted = [...thresholds].sort((a, b) => a.pointValue - b.pointValue);
  const [verbalWarning, managerMeeting] = sorted;
  switch (targetStatus) {
    case "clear":
      return 0;
    case "watch":
      return verbalWarning?.pointValue ?? 2;
    case "at_risk":
      return managerMeeting?.pointValue ?? 10;
    case "pip_flag":
      return cap;
  }
}

const TARGET_STATUS_LABELS: Record<RiskLevel, string> = {
  clear: "Clear",
  watch: "Watch",
  at_risk: "At Risk",
  pip_flag: "PIP",
};

/**
 * Manually moves an employee to a chosen status (Clear / Watch / At
 * Risk / PIP) rather than just clearing them. Adds or deducts however
 * many points are needed to land at that band's boundary, logged as
 * one auditable ledger entry (never a silent edit) — same "ledger it,
 * don't erase it" shape as the (still-unbuilt) anniversary reset
 * described in docs/points-system-brd.md Phase 5.
 *
 * Moving points up fires the same threshold-crossing/warnings logic as
 * a real infraction (see recordPointEvent). Moving points down
 * resolves any open/acknowledged warnings for thresholds the employee
 * no longer meets.
 */
export async function setEmployeeStatus(
  employeeId: string,
  targetStatus: RiskLevel,
  note?: string,
): Promise<SetEmployeeStatusResult> {
  const [[employee], thresholds] = await Promise.all([
    db
      .select({ points: employees.points, policyCap: employees.policyCap })
      .from(employees)
      .where(eq(employees.id, employeeId)),
    getPolicyThresholds(),
  ]);

  if (!employee) {
    throw new Error(`Unknown employee: ${employeeId}`);
  }

  const cap = employee.policyCap ?? POLICY_CAP;
  const targetPoints = clampToCap(
    pointsForTargetStatus(targetStatus, cap, thresholds),
    cap,
  );
  const delta = targetPoints - employee.points;

  if (delta !== 0) {
    await db.insert(pointEvents).values({
      id: `status-${employeeId}-${Date.now()}`,
      employeeId,
      date: new Date().toISOString().slice(0, 10),
      delta,
      reason:
        note?.trim() ||
        `Manually set to ${TARGET_STATUS_LABELS[targetStatus]} by manager`,
      source: "Supervisor",
      ruleCode: null,
    });

    await db
      .update(employees)
      .set({ points: targetPoints })
      .where(eq(employees.id, employeeId));
  }

  let crossedThresholdKeys: PolicyThresholdKey[] = [];
  let resolvedWarningCount = 0;

  if (delta > 0) {
    const crossed = thresholdsCrossed(employee.points, targetPoints, thresholds);
    if (crossed.length > 0) {
      await db.insert(warnings).values(
        crossed.map((threshold) => ({
          employeeId,
          thresholdKey: threshold.key,
          pointsAtTrigger: targetPoints,
          status: "open" as const,
        })),
      );
      crossedThresholdKeys = crossed.map((t) => t.key);
    }
  } else if (delta < 0) {
    const noLongerApplicable = thresholds
      .filter((t) => t.pointValue > targetPoints)
      .map((t) => t.key);
    if (noLongerApplicable.length > 0) {
      const resolved = await db
        .update(warnings)
        .set({ status: "resolved" })
        .where(
          and(
            eq(warnings.employeeId, employeeId),
            inArray(warnings.status, ["open", "acknowledged"]),
            inArray(warnings.thresholdKey, noLongerApplicable),
          ),
        )
        .returning({ id: warnings.id });
      resolvedWarningCount = resolved.length;
    }
  }

  return {
    previousPoints: employee.points,
    newPoints: targetPoints,
    delta,
    targetStatus,
    crossedThresholdKeys,
    resolvedWarningCount,
  };
}
