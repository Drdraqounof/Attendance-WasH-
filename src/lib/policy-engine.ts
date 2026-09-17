/**
 * The attendance policy engine — see
 * docs/WCL_Attendance_Policy_AttendPoint_Reference.pdf, the official,
 * effective (Oct 1, 2025) Wash Cycle Laundry Hourly Attendance & Leave
 * Policy. This supersedes the point values/thresholds originally
 * specified in docs/planning/points-system-brd.md §1/§2 — see the note
 * at the top of that document.
 *
 * Pure calculation only (no DB access, no I/O) so the rules are easy to
 * unit test in isolation. src/lib/policy-queries.ts wraps these functions
 * with the actual Drizzle reads/writes.
 *
 * Model: deduction-only, inverse scoring. Every employee starts at 0
 * points (perfect attendance) and only accrues points upward via the
 * escalation schedule below. 16 points is a hard cap — an employee can
 * never register above it. The policy states "16 or more points
 * requires termination"; this engine only *flags* that (never registers
 * above the cap, marks `isTerminationFlag`) rather than taking an
 * automated termination action itself — the policy's own instruction is
 * to preserve HR/management discretion rather than assume a fully
 * automatic outcome.
 */

/** Hard point cap. Reaching it triggers the termination flag. */
export const POLICY_CAP = 16;

/**
 * The policy's point matrix (PDF §4) is duration × notice-status, plus
 * one flat rule for a written warning issued for a non-attendance
 * issue:
 *
 *   Late 15min–1hr   : 1 pt with notice / 2 pts without notice
 *   Late 1–3hr        : 2 pts with notice / 4 pts without notice
 *   Absent/late 3hr+  : 4 pts with notice / 8 pts without notice
 *   Non-attendance written warning (PDF §4 "Additional rule") : 4 pts
 */
export type EscalationRuleCode =
  | "late_short_notice"
  | "late_short_no_notice"
  | "late_mid_notice"
  | "late_mid_no_notice"
  | "absence_notice"
  | "absence_no_notice"
  | "non_attendance_warning";

export type EscalationRule = {
  code: EscalationRuleCode;
  label: string;
  points: number;
};

/** The 7-rule escalation schedule from the policy PDF §4. */
export const ESCALATION_RULES: EscalationRule[] = [
  {
    code: "late_short_notice",
    label: "Late 15min–1hr — with notice",
    points: 1,
  },
  {
    code: "late_short_no_notice",
    label: "Late 15min–1hr — without notice",
    points: 2,
  },
  {
    code: "late_mid_notice",
    label: "Late 1–3hr — with notice",
    points: 2,
  },
  {
    code: "late_mid_no_notice",
    label: "Late 1–3hr — without notice",
    points: 4,
  },
  {
    code: "absence_notice",
    label: "Absent or late 3hr+ — with notice",
    points: 4,
  },
  {
    code: "absence_no_notice",
    label: "Absent or late 3hr+ — without notice",
    points: 8,
  },
  {
    code: "non_attendance_warning",
    label: "Written warning — non-attendance issue",
    points: 4,
  },
];

/**
 * Risk bands from the policy PDF §5 — a rolling-12-month point total is
 * evaluated against these ranges: 0 clear, 1-3 low, 4-7 elevated, 8-11
 * at_risk, 12-15 critical, 16+ termination. Each key doubles as the
 * `PolicyThresholdKey`/`RiskLevel` value for the band it opens.
 */
export type PolicyThresholdKey =
  | "low"
  | "elevated"
  | "at_risk"
  | "critical"
  | "termination";

export type PolicyThreshold = {
  key: PolicyThresholdKey;
  pointValue: number;
  label: string;
  action: string;
};

/** The 5 risk bands (lower bound of each) from the policy PDF §5. */
export const POLICY_THRESHOLDS: PolicyThreshold[] = [
  {
    key: "low",
    pointValue: 1,
    label: "Low",
    action: "Employee is eligible for a verbal warning.",
  },
  {
    key: "elevated",
    pointValue: 4,
    label: "Elevated",
    action: "Employee is eligible for a verbal warning and a written warning.",
  },
  {
    key: "at_risk",
    pointValue: 8,
    label: "At Risk",
    action: "Employee is eligible for a written warning and unpaid suspension.",
  },
  {
    key: "critical",
    pointValue: 12,
    label: "Critical",
    action:
      "Employee is eligible for a written warning, unpaid suspension, and termination at management discretion.",
  },
  {
    key: "termination",
    pointValue: POLICY_CAP,
    label: "Termination Threshold",
    action:
      "16 or more points requires termination under the policy. Notify HR — this system flags the threshold but does not take automated termination action.",
  },
];

/**
 * Accepts a `rules` override (defaulting to the static ESCALATION_RULES)
 * so callers with access to the admin-editable values in the
 * `point_rules` table — see
 * src/lib/policy-queries.ts::getEscalationRules() — can pass those in
 * instead. Callers that can't reach the DB (mock data, pure functions)
 * keep working unchanged against the defaults.
 */
export function pointsForRule(
  code: EscalationRuleCode | string,
  rules: EscalationRule[] = ESCALATION_RULES,
): number {
  const rule = rules.find((r) => r.code === code);
  if (!rule) {
    throw new Error(`Unknown escalation rule code: ${code}`);
  }
  return rule.points;
}

/** Clamp a point total to the policy cap — points never register above it. */
export function clampToCap(points: number, cap: number = POLICY_CAP): number {
  return Math.max(0, Math.min(cap, points));
}

/**
 * Thresholds whose pointValue falls in (oldPoints, newPoints] — i.e. the
 * ones an infraction just pushed the employee up past. Returns [] if
 * points didn't increase (e.g. a rolling-window aging-out).
 *
 * Accepts a `thresholds` override (defaulting to the static
 * POLICY_THRESHOLDS) so callers with access to the admin-editable
 * values in the `policy_thresholds` table — see
 * src/lib/policy-queries.ts::getPolicyThresholds() — can pass those in
 * instead. Callers that can't reach the DB (mock data, pure functions)
 * keep working unchanged against the defaults.
 */
export function thresholdsCrossed(
  oldPoints: number,
  newPoints: number,
  thresholds: PolicyThreshold[] = POLICY_THRESHOLDS,
): PolicyThreshold[] {
  if (newPoints <= oldPoints) return [];
  return thresholds.filter(
    (threshold) => threshold.pointValue > oldPoints && threshold.pointValue <= newPoints,
  );
}

export type PointEventResult = {
  previousPoints: number;
  delta: number;
  newPoints: number;
  crossedThresholds: PolicyThreshold[];
  /** True once the employee is at (or clamped to) the 16-point cap — the policy's termination threshold. */
  isTerminationFlag: boolean;
};

/**
 * Apply one infraction to an employee's current point total. Pure
 * function — the caller (policy-queries.ts) is responsible for
 * persisting the ledger entry, the updated total, and any warnings.
 */
export function applyPointEvent(
  currentPoints: number,
  ruleCode: EscalationRuleCode | string,
  cap: number = POLICY_CAP,
  thresholds: PolicyThreshold[] = POLICY_THRESHOLDS,
  escalationRules: EscalationRule[] = ESCALATION_RULES,
): PointEventResult {
  const delta = pointsForRule(ruleCode, escalationRules);
  const newPoints = clampToCap(currentPoints + delta, cap);
  const crossedThresholds = thresholdsCrossed(currentPoints, newPoints, thresholds);

  return {
    previousPoints: currentPoints,
    delta,
    newPoints,
    crossedThresholds,
    isTerminationFlag: newPoints >= cap,
  };
}

export type RiskRecommendation = {
  /** The highest threshold currently crossed, or null if none. */
  thresholdKey: PolicyThresholdKey | null;
  /** Deterministic, template-built sentence grounded in real point values — safe to show without AI. */
  text: string;
};

/**
 * Deterministic "what to do next" for an employee, built from the same
 * threshold `.action` copy already shown elsewhere — never generated
 * text. This is both the fallback and the grounding fact set for the
 * optional AI rewrite in src/lib/ai-recommendations.ts.
 */
export function recommendedNextStep(
  points: number,
  cap: number = POLICY_CAP,
  thresholds: PolicyThreshold[] = POLICY_THRESHOLDS,
): RiskRecommendation {
  const crossed = thresholds
    .filter((t) => points >= t.pointValue)
    .sort((a, b) => b.pointValue - a.pointValue);
  const highest = crossed[0];

  if (!highest) {
    return {
      thresholdKey: null,
      text: `No corrective action required at ${points} pts.`,
    };
  }

  return {
    thresholdKey: highest.key,
    text: `At ${points} pts (crossed the ${highest.label} threshold at ${highest.pointValue}), ${highest.action}`,
  };
}

export type RiskLevel = "clear" | PolicyThresholdKey;

/**
 * Risk banding straight from the policy PDF §5: the employee's points
 * land in exactly one of 6 bands (clear, then the 5 threshold bands),
 * each a range starting at its threshold's `pointValue` and running up
 * to (but not including) the next threshold's `pointValue`. Generalized
 * over whatever `thresholds` are passed (defaulting to the static
 * POLICY_THRESHOLDS) so admin-edited thresholds (see
 * src/lib/policy-queries.ts::getPolicyThresholds()) band employees
 * correctly too.
 */
export function riskLevelFromPoints(
  points: number,
  cap: number = POLICY_CAP,
  thresholds: PolicyThreshold[] = POLICY_THRESHOLDS,
): RiskLevel {
  if (points >= cap) return "termination";
  const sorted = [...thresholds].sort((a, b) => b.pointValue - a.pointValue);
  const highest = sorted.find((t) => points >= t.pointValue);
  return highest?.key ?? "clear";
}
