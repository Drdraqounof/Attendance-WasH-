import { describe, expect, it } from "vitest";
import {
  DEMO_ROSTER,
} from "./dashboard-mock";
import {
  analyticsSummary,
  attendanceNominees,
  attendanceTrendNarrative,
  employeeOfTheMonth,
  getAllPeople,
  getPersonById,
  incidentHistory,
  incidentSummary,
  pointsTowardCap,
  topPointHolders,
} from "./people-mock";

describe("people-mock", () => {
  it("returns a profile by id", () => {
    const person = getPersonById("e01");
    expect(person).not.toBeNull();
    expect(person?.name).toBe("Marcus Hale");
    expect(person?.policyCap).toBe(16);
  });

  it("returns a profile for every roster member", () => {
    const allPeople = getAllPeople();
    expect(allPeople).toHaveLength(DEMO_ROSTER.length);
    expect(allPeople.map((person) => person.id)).toEqual(
      DEMO_ROSTER.map((row) => row.id),
    );
  });

  it("never returns more points toward cap than the policy cap", () => {
    const person = getPersonById("e01");
    expect(person).not.toBeNull();
    if (person) {
      expect(pointsTowardCap(person)).toBeLessThanOrEqual(person.policyCap);
    }
  });

  it("returns point leaders in descending order", () => {
    const leaders = topPointHolders(3);
    expect(leaders).toHaveLength(3);
    expect(leaders[0].points).toBeGreaterThanOrEqual(leaders[1].points);
    expect(leaders[1].points).toBeGreaterThanOrEqual(leaders[2].points);
  });

  it("computes analytics summary metrics consistently", () => {
    const summary = analyticsSummary(DEMO_ROSTER);
    expect(summary.openPoints).toBe(
      DEMO_ROSTER.reduce((sum, row) => sum + row.points, 0),
    );
    expect(summary.headcount).toBe(DEMO_ROSTER.length);
    expect(summary.avgPoints).toBeGreaterThanOrEqual(0);
  });

  it("only counts ledger events inside the trailing incident window", () => {
    const person = getPersonById("e01");
    expect(person).not.toBeNull();
    const events30 = incidentHistory(person!, 30);
    const events7 = incidentHistory(person!, 7);
    expect(events30.length).toBeGreaterThan(0);
    expect(events7.length).toBeLessThanOrEqual(events30.length);
    for (const event of events30) {
      expect(person!.pointLedger).toContainEqual(event);
    }
  });

  it("summarizes incidents by type within the window", () => {
    const person = getPersonById("e01");
    expect(person).not.toBeNull();
    const summary = incidentSummary(person!, 30);
    expect(summary.totalIncidents).toBe(
      summary.lateCount + summary.absentCount + summary.otherCount,
    );
    expect(summary.events).toHaveLength(summary.totalIncidents);
  });

  it("returns a clean-trend narrative for someone with no recent incidents", () => {
    const person = getPersonById("e10");
    expect(person).not.toBeNull();
    expect(incidentSummary(person!, 30).totalIncidents).toBe(0);
    expect(attendanceTrendNarrative(person!, 30)).toMatch(/no attendance incidents/i);
  });

  it("returns a discussion-flagging narrative for frequent lateness", () => {
    const person = getPersonById("e01");
    expect(person).not.toBeNull();
    const summary = incidentSummary(person!, 30);
    if (summary.lateCount >= 5) {
      expect(attendanceTrendNarrative(person!, 30)).toMatch(
        /recommend attendance discussion/i,
      );
    } else {
      expect(attendanceTrendNarrative(person!, 30).length).toBeGreaterThan(0);
    }
  });

  it("nominates the lowest-points employees for recognition", () => {
    const nominees = attendanceNominees(3);
    expect(nominees).toHaveLength(3);
    for (let i = 1; i < nominees.length; i++) {
      expect(nominees[i].score).toBeLessThanOrEqual(nominees[i - 1].score);
    }
    expect(nominees[0].score).toBeGreaterThanOrEqual(nominees[1].score);
  });

  it("picks the top nominee as employee of the month", () => {
    const top = employeeOfTheMonth();
    const nominees = attendanceNominees(1);
    expect(top).not.toBeNull();
    expect(top?.person.id).toBe(nominees[0].person.id);
  });
});
