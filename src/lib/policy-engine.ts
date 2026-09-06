/**
 * The 16-point escalating attendance policy — see docs/points-system-brd.md.
 *
 * Pure calculation only (no DB access, no I/O) so the rules are easy to
 * unit test in isolation. src/lib/policy-queries.ts wraps these functions
 * with the actual Drizzle reads/writes.
 *
 * Model: deduction-only, inverse scoring. Every employee starts at 0
 * points (perfect attendance) and only accrues points upward via the
 * escalation schedule below. 16 points is a hard cap — an employee can
 * never register above it — and reaching it places the employee on a
 * formal Performance Improvement Plan (PIP), a corrective action step,
 * not an automatic termination.
 */

/** Hard point cap. Reaching it triggers the PIP flag. */
export const POLICY_CAP = 16;

export type EscalationRuleCode =
  | "minor_tardy"
  | "moderate_tardy"
  | "severe_late_absence"
  | "nc_ns_major";

export type EscalationRule = {
  code: EscalationRuleCode;
  label: string;
  points: number;
};

/** The four-tier escalation schedule from docs/points-system-brd.md §1. */
export const ESCALATION_RULES: EscalationRule[] = [
  { code: "minor_tardy", label: "Minor tardy / minor infraction", points: 1 },
  {
    code: "moderate_tardy",
    label: "Moderate tardy / unexcused partial shift",
    points: 2,
  },
  {
    code: "severe_late_absence",
    label: "Severe late arrival or unexcused shift absence",
    points: 4,
  },
  {
    code: "nc_ns_major",
    label: "No-call, no-show / major infraction",
    points: 8,
  },
];

export type PolicyThresholdKey = "verbal_warning" | "manager_meeting" | "pip";

export type PolicyThreshold = {
  key: PolicyThresholdKey;
  pointValue: number;
  label: string;
  action: string;
};

/** The three automated-workflow thresholds from docs/points-system-brd.md §2. */
export const POLICY_THRESHOLDS: PolicyThreshold[] = [
  {
    key: "verbal_warning",
    pointValue: 2,
    label: "Verbal Warning",
    action:
      "Notify the employee's manager/supervisor to conduct a verbal warning conversation. Logged in system.",
  },
  {
    key: "manager_meeting",
    pointValue: 10,
    label: "Required Manager Meeting",
    action:
      "Flag the employee profile and require a formal attendance meeting between the employee and their manager/supervisor.",
  },
  {
    key: "pip",
    pointValue: POLICY_CAP,
    label: "Performance Improvement Plan (PIP)",
    action:
      "Place the employee on a formal Performance Improvement Plan (PIP) and notify HR. This is a corrective action step, not an automatic termination.",
  },
];

export function pointsForRule(code: EscalationRuleCode | string): number {
  const rule = ESCALATION_RULES.find((r) => r.code === code);
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
 * points didn't increase (e.g. an anniversary reset).
 */
export function thresholdsCrossed(
  oldPoints: number,
  newPoints: number,
): PolicyThreshold[] {
  if (newPoints <= oldPoints) return [];
  return POLICY_THRESHOLDS.filter(
    (threshold) => threshold.pointValue > oldPoints && threshold.pointValue <= newPoints,
  );
}

export type PointEventResult = {
  previousPoints: number;
  delta: number;
  newPoints: number;
  crossedThresholds: PolicyThreshold[];
  /** True once the employee is at (or clamped to) the 16-point cap — on a PIP. */
  isPipFlag: boolean;
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
): PointEventResult {
  const delta = pointsForRule(ruleCode);
  const newPoints = clampToCap(currentPoints + delta, cap);
  const crossedThresholds = thresholdsCrossed(currentPoints, newPoints);

  return {
    previousPoints: currentPoints,
    delta,
    newPoints,
    crossedThresholds,
    isPipFlag: newPoints >= cap,
  };
}

export type RiskLevel = "clear" | "watch" | "at_risk" | "pip_flag";

/**
 * Coarse risk banding used for "risk radar"-style views — how close an
 * employee is to the 16-point cap, not just their raw score.
 */
export function riskLevelFromPoints(
  points: number,
  cap: number = POLICY_CAP,
): RiskLevel {
  if (points >= cap) return "pip_flag";
  if (points >= 10) return "at_risk";
  if (points >= 2) return "watch";
  return "clear";
}
