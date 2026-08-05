import { describe, expect, it } from "vitest";
import {
  attendanceScoreFromPoints,
  attendanceStatusFromPoints,
  attendanceStatusFromScore,
} from "./attendance-utils";

describe("attendance-utils", () => {
  it("computes a 100-point attendance score from penalty points", () => {
    expect(attendanceScoreFromPoints(0, 12)).toBe(100);
    expect(attendanceScoreFromPoints(6, 12)).toBe(50);
    expect(attendanceScoreFromPoints(12, 12)).toBe(0);
  });

  it("caps scores between 0 and 100", () => {
    expect(attendanceScoreFromPoints(-5, 12)).toBe(100);
    expect(attendanceScoreFromPoints(20, 12)).toBe(0);
  });

  it("maps scores to attendance statuses", () => {
    expect(attendanceStatusFromScore(95)).toBe("Excellent");
    expect(attendanceStatusFromScore(80)).toBe("Good");
    expect(attendanceStatusFromScore(70)).toBe("Needs Improvement");
    expect(attendanceStatusFromScore(50)).toBe("Action Required");
  });

  it("derives status from point totals and policy cap", () => {
    expect(attendanceStatusFromPoints(1, 12)).toBe("Excellent");
    expect(attendanceStatusFromPoints(3, 12)).toBe("Good");
    expect(attendanceStatusFromPoints(4, 12)).toBe("Needs Improvement");
    expect(attendanceStatusFromPoints(9, 12)).toBe("Action Required");
  });
});
