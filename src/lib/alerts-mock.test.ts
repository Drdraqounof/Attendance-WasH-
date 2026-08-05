import { describe, expect, it } from "vitest";
import { generateAttendanceAlerts } from "./alerts-mock";
import { riskLevelFromPoints } from "./dashboard-mock";
import { getAllPeople } from "./people-mock";

describe("alerts-mock", () => {
  it("only raises alerts for watch/at-risk employees", () => {
    const people = getAllPeople();
    const alerts = generateAttendanceAlerts(people);
    const expectedCount = people.filter(
      (p) => riskLevelFromPoints(p.points) !== "clear",
    ).length;
    expect(alerts).toHaveLength(expectedCount);
    for (const alert of alerts) {
      const person = people.find((p) => p.id === alert.personId);
      expect(person).toBeDefined();
      expect(riskLevelFromPoints(person!.points)).not.toBe("clear");
    }
  });

  it("marks at-risk employees critical and watch employees as warning", () => {
    const alerts = generateAttendanceAlerts();
    const people = getAllPeople();
    for (const alert of alerts) {
      const person = people.find((p) => p.id === alert.personId)!;
      const level = riskLevelFromPoints(person.points);
      expect(alert.severity).toBe(level === "at_risk" ? "critical" : "warning");
    }
  });

  it("sorts alerts by attendance score ascending (worst first)", () => {
    const alerts = generateAttendanceAlerts();
    for (let i = 1; i < alerts.length; i++) {
      expect(alerts[i].attendanceScore).toBeGreaterThanOrEqual(
        alerts[i - 1].attendanceScore,
      );
    }
  });

  it("carries the recommended action and score for each alert", () => {
    const alerts = generateAttendanceAlerts();
    for (const alert of alerts) {
      expect(alert.recommendedAction.length).toBeGreaterThan(0);
      expect(alert.attendanceScore).toBeGreaterThanOrEqual(0);
      expect(alert.attendanceScore).toBeLessThanOrEqual(100);
    }
  });
});
