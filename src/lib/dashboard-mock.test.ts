import { describe, expect, it } from "vitest";
import {
  DEMO_ROSTER,
  RISK_LABELS,
  riskLevelFromPoints,
  summarizeRoster,
  interventionTargets,
} from "./dashboard-mock";

// Threshold-boundary behavior (2/10/16, clear/watch/at_risk/pip_flag) is
// covered by src/lib/policy-engine.test.ts, the single source of truth
// for riskLevelFromPoints. These tests only cover dashboard-mock.ts's
// own demo-data-shaped helpers.
describe("dashboard-mock", () => {
  it("summarizes roster counts and open points correctly", () => {
    const summary = summarizeRoster(DEMO_ROSTER);
    expect(summary.openPointsToday).toBe(
      DEMO_ROSTER.reduce((sum, row) => sum + row.points, 0),
    );
    // Demo data is tuned to span every band, including PIP (Marcus Hale
    // at the 16-point cap) and at-risk (Priya Nandakumar at 12).
    expect(summary.pip).toBeGreaterThan(0);
    expect(summary.atRisk).toBeGreaterThan(0);
    expect(summary.watch).toBeGreaterThan(0);
    expect(summary.clear).toBeGreaterThan(0);
  });

  it("returns pip/at-risk employees worst-first as intervention targets", () => {
    const targets = interventionTargets(DEMO_ROSTER, 3);
    expect(targets.length).toBeGreaterThan(0);
    expect(
      targets.every((row) => {
        const level = riskLevelFromPoints(row.points);
        return level === "pip_flag" || level === "at_risk";
      }),
    ).toBe(true);
    // Worst-first: the PIP employee (highest points) leads the list.
    expect(targets[0]!.points).toBeGreaterThanOrEqual(
      targets[targets.length - 1]!.points,
    );
  });

  it("includes user-facing labels for each risk level", () => {
    expect(RISK_LABELS.pip_flag).toBe("On PIP");
    expect(RISK_LABELS.at_risk).toBe("At risk");
    expect(RISK_LABELS.watch).toBe("Watch");
    expect(RISK_LABELS.clear).toBe("Clear");
  });
});
