import { describe, expect, it } from "vitest";
import {
  DEMO_ROSTER,
  RISK_LABELS,
  riskLevelFromPoints,
  summarizeRoster,
  interventionTargets,
} from "./dashboard-mock";

// Threshold-boundary behavior (1/4/8/12/16, clear/low/elevated/at_risk/
// critical/termination) is covered by src/lib/policy-engine.test.ts, the
// single source of truth for riskLevelFromPoints. These tests only
// cover dashboard-mock.ts's own demo-data-shaped helpers.
describe("dashboard-mock", () => {
  it("summarizes roster counts and open points correctly", () => {
    const summary = summarizeRoster(DEMO_ROSTER);
    expect(summary.openPointsToday).toBe(
      DEMO_ROSTER.reduce((sum, row) => sum + row.points, 0),
    );
    // Demo data is tuned to span every band, including termination
    // (Marcus Hale at the 16-point cap) and critical (Priya Nandakumar
    // at 12).
    expect(summary.termination).toBeGreaterThan(0);
    expect(summary.critical).toBeGreaterThan(0);
    expect(summary.atRisk).toBeGreaterThan(0);
    expect(summary.clear).toBeGreaterThan(0);
  });

  it("returns termination/critical/at-risk employees worst-first as intervention targets", () => {
    const targets = interventionTargets(DEMO_ROSTER, 3);
    expect(targets.length).toBeGreaterThan(0);
    expect(
      targets.every((row) => {
        const level = riskLevelFromPoints(row.points);
        return level === "termination" || level === "critical" || level === "at_risk";
      }),
    ).toBe(true);
    // Worst-first: the termination-threshold employee (highest points) leads the list.
    expect(targets[0]!.points).toBeGreaterThanOrEqual(
      targets[targets.length - 1]!.points,
    );
  });

  it("includes user-facing labels for each risk level", () => {
    expect(RISK_LABELS.termination).toBe("Termination threshold");
    expect(RISK_LABELS.critical).toBe("Critical");
    expect(RISK_LABELS.at_risk).toBe("At risk");
    expect(RISK_LABELS.elevated).toBe("Elevated");
    expect(RISK_LABELS.low).toBe("Low");
    expect(RISK_LABELS.clear).toBe("Clear");
  });
});
