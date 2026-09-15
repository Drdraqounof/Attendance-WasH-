import { describe, expect, it } from "vitest";
import { parseAttendanceCsv } from "./csv-import";

describe("parseAttendanceCsv", () => {
  it("parses valid rows with defaults applied", () => {
    const csv = [
      "employeeCode,date,ruleCode",
      "EMP-001,2026-08-01,late_short_notice",
      "EMP-002,2026-08-02,absence_no_notice",
    ].join("\n");

    const { rows, errors } = parseAttendanceCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      employeeCode: "EMP-001",
      date: "2026-08-01",
      ruleCode: "late_short_notice",
      source: "Policy",
    });
    expect(rows[0].reason).toContain("late_short_notice");
  });

  it("respects optional reason/source columns", () => {
    const csv = [
      "employeeCode,date,ruleCode,reason,source",
      'EMP-001,2026-08-01,absence_notice,"No-call, no-show",Supervisor',
    ].join("\n");

    const { rows, errors } = parseAttendanceCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0].reason).toBe("No-call, no-show");
    expect(rows[0].source).toBe("Supervisor");
  });

  it("reports missing required headers as a single structural error", () => {
    const { rows, errors } = parseAttendanceCsv("employeeCode,date\nEMP-001,2026-08-01");
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("ruleCode");
  });

  it("reports an empty file as an error", () => {
    const { rows, errors } = parseAttendanceCsv("");
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
  });

  it("validates each row independently — one bad row doesn't drop the good ones", () => {
    const csv = [
      "employeeCode,date,ruleCode",
      "EMP-001,2026-08-01,late_short_notice",
      "EMP-002,not-a-date,late_short_notice",
      "EMP-003,2026-08-03,not_a_real_code",
      ",2026-08-04,late_short_notice",
      "EMP-005,2026-08-05,late_short_no_notice",
    ].join("\n");

    const { rows, errors } = parseAttendanceCsv(csv);
    expect(rows.map((r) => r.employeeCode)).toEqual(["EMP-001", "EMP-005"]);
    expect(errors).toHaveLength(3);
    expect(errors.map((e) => e.row)).toEqual([3, 4, 5]);
  });

  it("defaults an unrecognized source to Policy and still reports it as a warning", () => {
    const csv = [
      "employeeCode,date,ruleCode,source",
      "EMP-001,2026-08-01,late_short_notice,Carrier Pigeon",
    ].join("\n");

    const { rows, errors } = parseAttendanceCsv(csv);
    expect(rows[0].source).toBe("Policy");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Carrier Pigeon");
  });

  it("skips blank lines", () => {
    const csv = [
      "employeeCode,date,ruleCode",
      "EMP-001,2026-08-01,late_short_notice",
      "",
      "EMP-002,2026-08-02,late_short_notice",
    ].join("\n");

    const { rows, errors } = parseAttendanceCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
  });
});
