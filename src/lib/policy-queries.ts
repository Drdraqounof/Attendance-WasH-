import { and, desc, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db/client";
import {
  employees,
  notifications,
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
export const TARGET_STATUSES: RiskLevel[] = [
  "clear",
  "low",
  "elevated",
  "at_risk",
  "critical",
  "termination",
];

/** All 7 escalation codes — mirrors policy-engine.ts's EscalationRuleCode union. */
const ESCALATION_RULE_CODES: EscalationRuleCode[] = [
  "late_short_notice",
  "late_short_no_notice",
  "late_mid_notice",
  "late_mid_no_notice",
  "absence_notice",
  "absence_no_notice",
  "non_attendance_warning",
];

/**
 * All 5 thresholds are editable from Settings. Editing "termination"
 * also bulk-updates every employee's `policyCap` to match — the
 * termination threshold *is* the policy cap, so the two are kept in
 * sync rather than letting them drift apart. See
 * docs/policy/policy-thresholds-editing.md.
 */
const EDITABLE_THRESHOLD_KEYS: PolicyThresholdKey[] = [
  "low",
  "elevated",
  "at_risk",
  "critical",
  "termination",
];

/**
 * Static text (label/action copy) the DB's `policy_thresholds` table
 * doesn't carry a column for — merged onto the DB's live `pointValue`
 * so edits don't require a schema migration just to keep descriptive
 * copy in sync. Wording follows the policy PDF §5 exactly.
 */
const THRESHOLD_ACTION_TEXT: Record<PolicyThresholdKey, string> = {
  low: "Employee is eligible for a verbal warning.",
  elevated: "Employee is eligible for a verbal warning and a written warning.",
  at_risk: "Employee is eligible for a written warning and unpaid suspension.",
  critical:
    "Employee is eligible for a written warning, unpaid suspension, and termination at management discretion.",
  termination:
    "16 or more points requires termination under the policy. Notify HR — this system flags the threshold but does not take automated termination action.",
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
  /** True once the employee is at (or clamped to) the 16-point cap — the policy's termination threshold. */
  isTerminationFlag: boolean;
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
 * Admin edit: retune any of the 5 thresholds. Validates ordering so the
 * bands can never cross each other: 0 < low < elevated < at_risk <
 * critical < termination. Editing "termination" additionally
 * bulk-updates every employee's `policyCap` to the new value, since the
 * termination threshold is defined as the policy cap — see
 * docs/policy/policy-thresholds-editing.md.
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
  const [low, elevated, atRisk, critical, termination] = [
    next.find((t) => t.key === "low")!,
    next.find((t) => t.key === "elevated")!,
    next.find((t) => t.key === "at_risk")!,
    next.find((t) => t.key === "critical")!,
    next.find((t) => t.key === "termination")!,
  ];
  if (
    !(
      low.pointValue < elevated.pointValue &&
      elevated.pointValue < atRisk.pointValue &&
      atRisk.pointValue < critical.pointValue &&
      critical.pointValue < termination.pointValue
    )
  ) {
    throw new Error(
      `Thresholds must stay in order: low (${low.pointValue}) < elevated (${elevated.pointValue}) < at risk (${atRisk.pointValue}) < critical (${critical.pointValue}) < termination (${termination.pointValue}).`,
    );
  }

  await db
    .update(policyThresholds)
    .set({ pointValue })
    .where(eq(policyThresholds.key, key));

  if (key === "termination") {
    // The termination threshold *is* the policy cap — keep every
    // employee's cap in sync rather than letting the displayed
    // threshold and the actual clamp/termination-flag behavior (which
    // reads employees.policyCap) drift apart. Org-wide bulk update:
    // every employee shares one cap today (see
    // src/db/seed.ts::POLICY_CAP), there's no per-employee override to
    // preserve.
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
 * Admin edit: retune how many points one escalation rule is worth.
 * Validates ordering so each duration band's "without notice" value
 * stays at or above its "with notice" value, and the three duration
 * bands stay meaningfully escalating — mirroring the policy PDF §4
 * matrix. `non_attendance_warning` is a flat rule with no ordering
 * constraint of its own beyond being a positive whole number.
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
  const byCode = Object.fromEntries(next.map((r) => [r.code, r.points])) as Record<
    EscalationRuleCode,
    number
  >;
  const orderingOk =
    byCode.late_short_notice <= byCode.late_short_no_notice &&
    byCode.late_mid_notice <= byCode.late_mid_no_notice &&
    byCode.absence_notice <= byCode.absence_no_notice &&
    byCode.late_short_no_notice <= byCode.late_mid_no_notice &&
    byCode.late_mid_no_notice <= byCode.absence_no_notice &&
    byCode.late_short_notice <= byCode.late_mid_notice &&
    byCode.late_mid_notice <= byCode.absence_notice;
  if (!orderingOk) {
    throw new Error(
      `Escalation rules must stay in order per the policy matrix: each band's "without notice" value must be at or above its "with notice" value, and the three duration bands (15min–1hr < 1–3hr < 3hr+) must escalate. Current values: ${JSON.stringify(byCode)}.`,
    );
  }

  await db
    .update(pointRules)
    .set({ points, value: `+${points}` })
    .where(eq(pointRules.code, code));

  return { rules: next };
}

/**
 * Inserts one `notifications` row when the termination-threshold
 * `warnings` row was just created — shared by recordPointEvent and
 * setEmployeeStatus so termination-threshold-crossing detection stays
 * in one place rather than duplicated. No-op if "termination" isn't
 * among the newly inserted warnings (the lower bands don't notify in
 * this phase). See docs/planning/pip-notifications.md.
 */
async function notifyIfTerminationCrossed(
  employeeId: string,
  employeeName: string,
  insertedWarnings: { id: number; thresholdKey: string; pointsAtTrigger: number }[],
): Promise<void> {
  const termination = insertedWarnings.find((w) => w.thresholdKey === "termination");
  if (!termination) return;

  await db.insert(notifications).values({
    employeeId,
    warningId: termination.id,
    thresholdKey: "termination",
    pointsAtTrigger: termination.pointsAtTrigger,
    title: `${employeeName} reached the termination threshold`,
    body: `${employeeName} crossed ${termination.pointsAtTrigger} points. Under policy, 16 or more points requires termination — notify HR. This is a flag, not an automated termination action.`,
    severity: "critical",
  });
}

/**
 * Records one infraction: inserts the ledger row, updates the
 * employee's running point total, and opens a `warnings` row for every
 * threshold the event just crossed (low / elevated / at_risk / critical
 * / termination — using the live, possibly admin-edited threshold and
 * escalation-rule values, not the static defaults). A termination
 * crossing also inserts a `notifications` row — see
 * notifyIfTerminationCrossed above.
 */
export async function recordPointEvent(
  input: RecordPointEventInput,
): Promise<RecordPointEventResult> {
  const [employee, thresholds, escalationRules] = await Promise.all([
    db
      .select({
        name: employees.name,
        points: employees.points,
        policyCap: employees.policyCap,
      })
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
    const inserted = await db
      .insert(warnings)
      .values(
        result.crossedThresholds.map((threshold) => ({
          employeeId: input.employeeId,
          thresholdKey: threshold.key,
          pointsAtTrigger: result.newPoints,
          status: "open" as const,
        })),
      )
      .returning({
        id: warnings.id,
        thresholdKey: warnings.thresholdKey,
        pointsAtTrigger: warnings.pointsAtTrigger,
      });

    await notifyIfTerminationCrossed(input.employeeId, employee.name, inserted);
  }

  return {
    previousPoints: result.previousPoints,
    newPoints: result.newPoints,
    crossedThresholdKeys: result.crossedThresholds.map((t) => t.key),
    isTerminationFlag: result.isTerminationFlag,
  };
}

/**
 * The policy PDF §5 evaluates points on a rolling 12-month period, not
 * an all-time or anniversary-reset total (docs/planning/points-system-brd.md's
 * unbuilt Phase 5 anniversary reset is superseded by this requirement —
 * see the note at the top of that document). 365 days is close enough
 * to "12 months" for this app's purposes; the ledger (`pointEvents`)
 * stays the source of truth either way, so aging-out happens naturally
 * as the window slides — no reset job needed.
 */
const ROLLING_WINDOW_DAYS = 365;

function isoDateDaysAgo(days: number, from: Date): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Sums this employee's point-ledger deltas within the trailing rolling
 * 12-month window ending `asOf` (defaults to now), clamped to their
 * policy cap — the "current points" the policy PDF actually means, as
 * opposed to `employees.points`'s simple running total.
 */
export async function rollingPolicyPoints(
  employeeId: string,
  cap: number,
  asOf: Date = new Date(),
): Promise<number> {
  const since = isoDateDaysAgo(ROLLING_WINDOW_DAYS, asOf);
  const until = asOf.toISOString().slice(0, 10);

  const rows = await db
    .select({ delta: pointEvents.delta })
    .from(pointEvents)
    .where(
      and(
        eq(pointEvents.employeeId, employeeId),
        gte(pointEvents.date, since),
        lte(pointEvents.date, until),
      ),
    );

  const sum = rows.reduce((total, row) => total + row.delta, 0);
  return clampToCap(sum, cap);
}

export type EmployeePolicySnapshot = {
  points: number;
  policyCap: number;
  riskLevel: RiskLevel;
};

/**
 * The employee's *real* (DB-backed) current points/band — distinct
 * from the mock-driven `points` shown elsewhere on
 * /dashboard/people/[id] today. `points` here is the rolling-12-month
 * total (see rollingPolicyPoints above), not employees.points'
 * all-time running total. See docs/planning/employee-track-record-plan.md.
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

  const points = await rollingPolicyPoints(employeeId, employee.policyCap);

  return {
    points,
    policyCap: employee.policyCap,
    riskLevel: riskLevelFromPoints(points, employee.policyCap, thresholds),
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
 * "termination" is always the employee's policy cap (see
 * docs/policy/policy-thresholds-editing.md's termination↔cap coupling).
 */
function pointsForTargetStatus(
  targetStatus: RiskLevel,
  cap: number,
  thresholds: PolicyThreshold[],
): number {
  if (targetStatus === "clear") return 0;
  if (targetStatus === "termination") return cap;
  const threshold = thresholds.find((t) => t.key === targetStatus);
  return threshold?.pointValue ?? cap;
}

const TARGET_STATUS_LABELS: Record<RiskLevel, string> = {
  clear: "Clear",
  low: "Low",
  elevated: "Elevated",
  at_risk: "At Risk",
  critical: "Critical",
  termination: "Termination Threshold",
};

/**
 * Manually moves an employee to a chosen status (Clear / Watch / At
 * Risk / PIP) rather than just clearing them. Adds or deducts however
 * many points are needed to land at that band's boundary, logged as
 * one auditable ledger entry (never a silent edit) — same "ledger it,
 * don't erase it" shape as the (still-unbuilt) anniversary reset
 * described in docs/planning/points-system-brd.md Phase 5.
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
      .select({
        name: employees.name,
        points: employees.points,
        policyCap: employees.policyCap,
      })
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
      const inserted = await db
        .insert(warnings)
        .values(
          crossed.map((threshold) => ({
            employeeId,
            thresholdKey: threshold.key,
            pointsAtTrigger: targetPoints,
            status: "open" as const,
          })),
        )
        .returning({
          id: warnings.id,
          thresholdKey: warnings.thresholdKey,
          pointsAtTrigger: warnings.pointsAtTrigger,
        });
      crossedThresholdKeys = crossed.map((t) => t.key);

      await notifyIfTerminationCrossed(employeeId, employee.name, inserted);
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
