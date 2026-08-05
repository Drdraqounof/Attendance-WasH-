import { describe, expect, it } from "vitest";
import {
  DEMO_ROSTER,
  RISK_LABELS,
  riskLevelFromPoints,
  summarizeRoster,
  interventionTargets,
} from "./dashboard-mock";

describe("dashboard-mock", () => {
  it("returns the expected risk levels at threshold boundaries", () => {
    expect(riskLevelFromPoints(0)).toBe("clear");
    expect(riskLevelFromPoints(2)).toBe("clear");
    expect(riskLevelFromPoints(3)).toBe("watch");
    expect(riskLevelFromPoints(5)).toBe("watch");
    expect(riskLevelFromPoints(6)).toBe("at_risk");
    expect(riskLevelFromPoints(12)).toBe("at_risk");
  });

  it("summarizes roster counts and open points correctly", () => {
    const summary = summarizeRoster(DEMO_ROSTER);
    expect(summary.openPointsToday).toBe(
      DEMO_ROSTER.reduce((sum, row) => sum + row.points, 0),
    );
    expect(summary.atRisk).toBeGreaterThan(0);
    expect(summary.watch).toBeGreaterThan(0);
    expect(summary.clear).toBeGreaterThan(0);
  });

  it("returns up to the configured number of at-risk intervention targets", () => {
    const targets = interventionTargets(DEMO_ROSTER, 3);
    expect(targets).toHaveLength(3);
    expect(targets.every((row) => riskLevelFromPoints(row.points) === "at_risk")).toBe(true);
  });

  it("includes user-facing labels for each risk level", () => {
    expect(RISK_LABELS.at_risk).toBe("At risk");
    expect(RISK_LABELS.watch).toBe("Watch");
    expect(RISK_LABELS.clear).toBe("Clear");
  });
});
