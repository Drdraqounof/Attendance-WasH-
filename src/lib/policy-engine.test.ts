import { describe, expect, it } from "vitest";
import {
  applyPointEvent,
  clampToCap,
  ESCALATION_RULES,
  POLICY_CAP,
  POLICY_THRESHOLDS,
  pointsForRule,
  riskLevelFromPoints,
  thresholdsCrossed,
} from "./policy-engine";

describe("policy-engine", () => {
  it("has a 16-point cap and the four escalation tiers from the BRD", () => {
    expect(POLICY_CAP).toBe(16);
    expect(ESCALATION_RULES.map((r) => r.points)).toEqual([1, 2, 4, 8]);
  });

  it("looks up points for a known rule code", () => {
    expect(pointsForRule("minor_tardy")).toBe(1);
    expect(pointsForRule("nc_ns_major")).toBe(8);
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
    it("fires the verbal warning exactly once when crossing 2 points", () => {
      expect(thresholdsCrossed(1, 2).map((t) => t.key)).toEqual([
        "verbal_warning",
      ]);
      // Already at 2 and another 2pt event lands exactly on it again —
      // no new crossing since old === new isn't > old.
      expect(thresholdsCrossed(2, 2)).toEqual([]);
    });

    it("does not re-fire a threshold already passed", () => {
      expect(thresholdsCrossed(5, 6)).toEqual([]);
    });

    it("fires multiple thresholds at once when a large event jumps past them", () => {
      // 9 -> 17 (pre-clamp) covers both the 10pt action-plan and 16pt
      // final-review thresholds in one event.
      expect(thresholdsCrossed(9, 17).map((t) => t.key)).toEqual([
        "action_plan",
        "final_review",
      ]);
    });

    it("returns nothing when points go down (e.g. an anniversary reset)", () => {
      expect(thresholdsCrossed(10, 0)).toEqual([]);
    });
  });

  describe("applyPointEvent", () => {
    it("accrues points and flags nothing below the first threshold", () => {
      const result = applyPointEvent(0, "minor_tardy");
      expect(result.newPoints).toBe(1);
      expect(result.crossedThresholds).toEqual([]);
      expect(result.isTerminationFlag).toBe(false);
    });

    it("fires the verbal warning at exactly 2 points", () => {
      const result = applyPointEvent(0, "moderate_tardy");
      expect(result.newPoints).toBe(2);
      expect(result.crossedThresholds.map((t) => t.key)).toEqual([
        "verbal_warning",
      ]);
    });

    it("fires the action plan at exactly 10 points", () => {
      const result = applyPointEvent(8, "moderate_tardy");
      expect(result.newPoints).toBe(10);
      expect(result.crossedThresholds.map((t) => t.key)).toEqual([
        "action_plan",
      ]);
    });

    it("clamps at the 16-point cap and flags final review/termination", () => {
      const result = applyPointEvent(12, "nc_ns_major"); // 12 + 8 = 20, clamped to 16
      expect(result.newPoints).toBe(16);
      expect(result.isTerminationFlag).toBe(true);
      expect(result.crossedThresholds.map((t) => t.key)).toContain(
        "final_review",
      );
    });

    it("keeps flagging termination on further infractions once already at the cap", () => {
      const result = applyPointEvent(16, "minor_tardy");
      expect(result.newPoints).toBe(16);
      expect(result.isTerminationFlag).toBe(true);
      // No *new* crossing — already at the cap before this event.
      expect(result.crossedThresholds).toEqual([]);
    });
  });

  describe("riskLevelFromPoints", () => {
    it("bands risk consistently with the policy thresholds", () => {
      expect(riskLevelFromPoints(0)).toBe("clear");
      expect(riskLevelFromPoints(1)).toBe("clear");
      expect(riskLevelFromPoints(2)).toBe("watch");
      expect(riskLevelFromPoints(9)).toBe("watch");
      expect(riskLevelFromPoints(10)).toBe("at_risk");
      expect(riskLevelFromPoints(15)).toBe("at_risk");
      expect(riskLevelFromPoints(16)).toBe("termination_flag");
      // Defensive: a value above the cap (shouldn't normally happen once
      // callers clamp via applyPointEvent) still reads as flagged.
      expect(riskLevelFromPoints(20)).toBe("termination_flag");
    });
  });

  it("keeps POLICY_THRESHOLDS ordered ascending by point value", () => {
    const values = POLICY_THRESHOLDS.map((t) => t.pointValue);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });
});
