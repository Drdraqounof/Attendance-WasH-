import { describe, expect, it } from "vitest";
import {
  attendanceTrendDirection,
  employeesAtRisk,
  frequentLatenessPatterns,
  reliabilityRanking,
} from "./ai-analysis-mock";
import { riskLevelFromPoints } from "./dashboard-mock";
import { getAllPeople, getPersonById } from "./people-mock";

describe("ai-analysis-mock", () => {
  it("only surfaces employees at or above the late-count threshold", () => {
    const rows = frequentLatenessPatterns(3, 30);
    for (const row of rows) {
      expect(row.lateCount).toBeGreaterThanOrEqual(3);
      expect(row.narrative).toContain(row.person.name);
      expect(row.narrative).toContain(String(row.lateCount));
    }
  });

  it("sorts lateness patterns by late count descending", () => {
    const rows = frequentLatenessPatterns(1, 30);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].lateCount).toBeLessThanOrEqual(rows[i - 1].lateCount);
    }
  });

  it("only flags non-clear employees as at risk", () => {
    const rows = employeesAtRisk(30);
    const people = getAllPeople();
    expect(rows).toHaveLength(
      people.filter((p) => riskLevelFromPoints(p.points) !== "clear").length,
    );
    for (const row of rows) {
      expect(riskLevelFromPoints(row.person.points)).not.toBe("clear");
      expect(row.reliabilityScore).toBeGreaterThanOrEqual(0);
      expect(row.reliabilityScore).toBeLessThanOrEqual(100);
    }
  });

  it("ranks every roster member by reliability score descending", () => {
    const ranking = reliabilityRanking(30);
    expect(ranking).toHaveLength(getAllPeople().length);
    for (let i = 1; i < ranking.length; i++) {
      expect(ranking[i].score).toBeLessThanOrEqual(ranking[i - 1].score);
    }
  });

  it("marks employees with no ledger history as a stable trend", () => {
    const person = getPersonById("e10");
    expect(person).not.toBeNull();
    expect(attendanceTrendDirection(person!, 30)).toBe("stable");
  });

  it("marks recent-heavy point activity as worsening", () => {
    const person = getPersonById("e01");
    expect(person).not.toBeNull();
    expect(attendanceTrendDirection(person!, 30)).toBe("worsening");
  });
});
