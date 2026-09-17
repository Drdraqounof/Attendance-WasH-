import { describe, expect, it } from "vitest";
import {
  applyPointEvent,
  clampToCap,
  ESCALATION_RULES,
  POLICY_CAP,
  POLICY_THRESHOLDS,
  pointsForRule,
  recommendedNextStep,
  riskLevelFromPoints,
  thresholdsCrossed,
  type EscalationRule,
  type PolicyThreshold,
} from "./policy-engine";

describe("policy-engine", () => {
  it("has a 16-point cap and the 7 escalation rules from the policy PDF §4", () => {
    expect(POLICY_CAP).toBe(16);
    expect(ESCALATION_RULES.map((r) => r.points)).toEqual([1, 2, 2, 4, 4, 8, 4]);
  });

  it("looks up points for a known rule code", () => {
    expect(pointsForRule("late_short_notice")).toBe(1);
    expect(pointsForRule("late_short_no_notice")).toBe(2);
    expect(pointsForRule("late_mid_notice")).toBe(2);
    expect(pointsForRule("late_mid_no_notice")).toBe(4);
    expect(pointsForRule("absence_notice")).toBe(4);
    expect(pointsForRule("absence_no_notice")).toBe(8);
    expect(pointsForRule("non_attendance_warning")).toBe(4);
  });

  it("throws for an unknown rule code", () => {
    expect(() => pointsForRule("not_a_real_rule")).toThrow();
  });

  it("clamps to the cap and never goes negative", () => {
    expect(clampToCap(20)).toBe(16);
    expect(clampToCap(-5)).toBe(0);
    expect(clampToCap(9)).toBe(9);
  });

  describe("thresholdsCrossed", () => {
    it("fires the low band exactly once when crossing 1 point", () => {
      expect(thresholdsCrossed(0, 1).map((t) => t.key)).toEqual(["low"]);
      // Already at 1 and another event lands exactly on it again — no
      // new crossing since old === new isn't > old.
      expect(thresholdsCrossed(1, 1)).toEqual([]);
    });

    it("does not re-fire a threshold already passed", () => {
      expect(thresholdsCrossed(5, 6)).toEqual([]);
    });

    it("fires multiple thresholds at once when a large event jumps past them", () => {
      // 9 -> 17 (pre-clamp) covers the at_risk(8)... no wait, 9 is
      // already past at_risk; covers critical(12) and termination(16)
      // in one event.
      expect(thresholdsCrossed(9, 17).map((t) => t.key)).toEqual([
        "critical",
        "termination",
      ]);
    });

    it("returns nothing when points go down", () => {
      expect(thresholdsCrossed(10, 0)).toEqual([]);
    });
  });

  describe("applyPointEvent", () => {
    it("accrues points and flags nothing below the first threshold", () => {
      const result = applyPointEvent(0, "late_short_notice");
      expect(result.newPoints).toBe(1);
      expect(result.crossedThresholds.map((t) => t.key)).toEqual(["low"]);
      expect(result.isTerminationFlag).toBe(false);
    });

    it("fires the elevated band at exactly 4 points", () => {
      const result = applyPointEvent(2, "late_mid_no_notice");
      expect(result.newPoints).toBe(6);
      expect(result.crossedThresholds.map((t) => t.key)).toEqual(["elevated"]);
    });

    it("fires the at_risk band at exactly 8 points", () => {
      const result = applyPointEvent(6, "late_mid_no_notice");
      expect(result.newPoints).toBe(10);
      expect(result.crossedThresholds.map((t) => t.key)).toEqual(["at_risk"]);
    });

    it("clamps at the 16-point cap and flags termination", () => {
      const result = applyPointEvent(12, "absence_no_notice"); // 12 + 8 = 20, clamped to 16
      expect(result.newPoints).toBe(16);
      expect(result.isTerminationFlag).toBe(true);
      expect(result.crossedThresholds.map((t) => t.key)).toContain("termination");
    });

    it("keeps flagging termination on further infractions once already at the cap", () => {
      const result = applyPointEvent(16, "late_short_notice");
      expect(result.newPoints).toBe(16);
      expect(result.isTerminationFlag).toBe(true);
      // No *new* crossing — already at the cap before this event.
      expect(result.crossedThresholds).toEqual([]);
    });

    it("adds 4 points for a written warning on a non-attendance issue", () => {
      const result = applyPointEvent(0, "non_attendance_warning");
      expect(result.newPoints).toBe(4);
      // 0 -> 4 passes through both the low(1) and elevated(4) boundaries.
      expect(result.crossedThresholds.map((t) => t.key)).toEqual(["low", "elevated"]);
    });
  });

  describe("riskLevelFromPoints", () => {
    it("bands risk consistently with the policy PDF §5", () => {
      expect(riskLevelFromPoints(0)).toBe("clear");
      expect(riskLevelFromPoints(1)).toBe("low");
      expect(riskLevelFromPoints(3)).toBe("low");
      expect(riskLevelFromPoints(4)).toBe("elevated");
      expect(riskLevelFromPoints(7)).toBe("elevated");
      expect(riskLevelFromPoints(8)).toBe("at_risk");
      expect(riskLevelFromPoints(11)).toBe("at_risk");
      expect(riskLevelFromPoints(12)).toBe("critical");
      expect(riskLevelFromPoints(15)).toBe("critical");
      expect(riskLevelFromPoints(16)).toBe("termination");
      // Defensive: a value above the cap (shouldn't normally happen once
      // callers clamp via applyPointEvent) still reads as flagged.
      expect(riskLevelFromPoints(20)).toBe("termination");
    });
  });

  it("keeps POLICY_THRESHOLDS ordered ascending by point value", () => {
    const values = POLICY_THRESHOLDS.map((t) => t.pointValue);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  describe("admin-editable thresholds (see docs/policy/policy-thresholds-editing.md)", () => {
    // Simulates thresholds retuned via /settings — to confirm the engine
    // bands/fires against whatever thresholds it's given rather than
    // hardcoded 1/4/8/12/16.
    const customThresholds: PolicyThreshold[] = [
      { key: "low", pointValue: 2, label: "Low", action: "" },
      { key: "elevated", pointValue: 5, label: "Elevated", action: "" },
      { key: "at_risk", pointValue: 9, label: "At Risk", action: "" },
      { key: "critical", pointValue: 13, label: "Critical", action: "" },
      { key: "termination", pointValue: POLICY_CAP, label: "Termination", action: "" },
    ];

    it("thresholdsCrossed fires against the custom values, not the defaults", () => {
      expect(thresholdsCrossed(1, 2, customThresholds).map((t) => t.key)).toEqual([
        "low",
      ]);
      expect(thresholdsCrossed(0, 1, customThresholds)).toEqual([]);
      expect(thresholdsCrossed(8, 9, customThresholds).map((t) => t.key)).toEqual([
        "at_risk",
      ]);
    });

    it("applyPointEvent respects custom thresholds end to end", () => {
      const result = applyPointEvent(0, "late_short_no_notice", POLICY_CAP, customThresholds);
      expect(result.newPoints).toBe(2);
      expect(result.crossedThresholds.map((t) => t.key)).toEqual(["low"]);
    });

    it("riskLevelFromPoints bands against the custom thresholds", () => {
      expect(riskLevelFromPoints(1, POLICY_CAP, customThresholds)).toBe("clear");
      expect(riskLevelFromPoints(2, POLICY_CAP, customThresholds)).toBe("low");
      expect(riskLevelFromPoints(8, POLICY_CAP, customThresholds)).toBe("elevated");
      expect(riskLevelFromPoints(9, POLICY_CAP, customThresholds)).toBe("at_risk");
      expect(riskLevelFromPoints(16, POLICY_CAP, customThresholds)).toBe("termination");
    });

    it("still matches the default banding when no override is passed", () => {
      // Regression guard: the generalized threshold-banding
      // implementation must reproduce the original hardcoded bands
      // exactly when called with defaults.
      for (const points of [0, 1, 4, 8, 12, 16, 20]) {
        expect(riskLevelFromPoints(points)).toBe(
          riskLevelFromPoints(points, POLICY_CAP, POLICY_THRESHOLDS),
        );
      }
    });
  });

  describe("recommendedNextStep", () => {
    it("requires no action below the first threshold", () => {
      const result = recommendedNextStep(0);
      expect(result.thresholdKey).toBeNull();
      expect(result.text).toContain("No corrective action required");
    });

    it("recommends the highest crossed threshold's action, grounded in real points", () => {
      const result = recommendedNextStep(9);
      expect(result.thresholdKey).toBe("at_risk");
      expect(result.text).toContain("9 pts");
      expect(result.text).toContain("At Risk");
      expect(result.text).toContain(
        POLICY_THRESHOLDS.find((t) => t.key === "at_risk")!.action,
      );
    });

    it("recommends the termination action once at the cap, not the lower thresholds", () => {
      const result = recommendedNextStep(16);
      expect(result.thresholdKey).toBe("termination");
      expect(result.text).toContain("termination");
    });

    it("respects admin-edited thresholds instead of the defaults", () => {
      const customThresholds: PolicyThreshold[] = [
        { key: "low", pointValue: 2, label: "Low", action: "Custom low action." },
        { key: "elevated", pointValue: 5, label: "Elevated", action: "Custom elevated action." },
        { key: "at_risk", pointValue: 9, label: "At Risk", action: "Custom at-risk action." },
        { key: "critical", pointValue: 13, label: "Critical", action: "Custom critical action." },
        { key: "termination", pointValue: POLICY_CAP, label: "Termination", action: "Custom termination action." },
      ];
      const result = recommendedNextStep(9, POLICY_CAP, customThresholds);
      expect(result.thresholdKey).toBe("at_risk");
      expect(result.text).toContain("Custom at-risk action.");
    });
  });

  describe("admin-editable escalation rules", () => {
    // Simulates the escalation schedule retuned via /settings.
    const customRules: EscalationRule[] = [
      { code: "late_short_notice", label: "Late short — notice", points: 2 },
      { code: "late_short_no_notice", label: "Late short — no notice", points: 3 },
      { code: "late_mid_notice", label: "Late mid — notice", points: 4 },
      { code: "late_mid_no_notice", label: "Late mid — no notice", points: 6 },
      { code: "absence_notice", label: "Absence — notice", points: 7 },
      { code: "absence_no_notice", label: "Absence — no notice", points: 12 },
      { code: "non_attendance_warning", label: "Written warning", points: 5 },
    ];

    it("pointsForRule looks up against the custom rules, not the defaults", () => {
      expect(pointsForRule("late_short_notice", customRules)).toBe(2);
      expect(pointsForRule("absence_no_notice", customRules)).toBe(12);
    });

    it("applyPointEvent uses custom rules for the delta end to end", () => {
      const result = applyPointEvent(
        0,
        "absence_notice",
        POLICY_CAP,
        POLICY_THRESHOLDS,
        customRules,
      );
      expect(result.delta).toBe(7);
      expect(result.newPoints).toBe(7);
    });
  });
});
