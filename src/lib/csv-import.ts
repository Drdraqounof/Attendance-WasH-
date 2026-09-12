import { ESCALATION_RULES, type EscalationRuleCode } from "@/lib/policy-engine";
import type { PointEventSource } from "@/lib/policy-queries";

/**
 * CSV parsing/validation for bulk attendance-event import — the button
 * on /dashboard's Priority Roster (see attendance-import-button.tsx).
 * Each valid row becomes one call to recordPointEvent() (via the
 * /api/attendance-import route), so imported rows go through the same
 * ledger/threshold/notification logic as every other point event —
 * this is real data, not a mock addition.
 *
 * PDF import is an explicitly deferred follow-up — this file only
 * handles CSV text.
 */

const REQUIRED_HEADERS = ["employeeCode", "date", "ruleCode"] as const;
const OPTIONAL_HEADERS = ["reason", "source"] as const;
const VALID_RULE_CODES = ESCALATION_RULES.map((r) => r.code);
const VALID_SOURCES: PointEventSource[] = ["SMS", "Policy", "Supervisor"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type AttendanceCsvRow = {
  employeeCode: string;
  date: string;
  ruleCode: EscalationRuleCode;
  reason: string;
  source: PointEventSource;
};

export type CsvRowError = { row: number; message: string };

export type ParsedAttendanceCsv = {
  rows: AttendanceCsvRow[];
  errors: CsvRowError[];
};

/**
 * Minimal RFC4180-ish CSV line splitter — handles quoted fields,
 * commas inside quotes, and escaped ("") quotes. No external CSV
 * dependency in package.json, and the expected input (a small
 * hand-authored or spreadsheet-exported attendance sheet) doesn't need
 * more than this.
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

/**
 * Parses and validates attendance CSV text. Never throws — structural
 * problems (missing headers) and per-row problems (bad date, unknown
 * rule code) are both reported as errors alongside whatever valid rows
 * were found, so the caller can decide whether to import the good rows
 * and just report the bad ones (per-row resilience, not all-or-nothing
 * — same pattern as ai-recommendations.ts's per-employee fallback).
 *
 * Expected columns: employeeCode, date (YYYY-MM-DD), ruleCode (one of
 * minor_tardy / moderate_tardy / severe_late_absence / nc_ns_major),
 * plus optional reason and source (SMS/Policy/Supervisor, defaults to
 * "Policy" — a bulk file import isn't a live SMS signal or a
 * supervisor's manual click, so "Policy" best matches the existing
 * three-value enum).
 */
export function parseAttendanceCsv(text: string): ParsedAttendanceCsv {
  const lines = text
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { rows: [], errors: [{ row: 0, message: "The file is empty." }] };
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [
        {
          row: 0,
          message: `Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. Expected: ${[...REQUIRED_HEADERS, ...OPTIONAL_HEADERS].join(", ")}.`,
        },
      ],
    };
  }

  const rows: AttendanceCsvRow[] = [];
  const errors: CsvRowError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1; // 1-indexed, matching a spreadsheet row number (header is row 1)
    const values = splitCsvLine(lines[i]);
    if (values.length === 1 && values[0] === "") continue;

    const byHeader = Object.fromEntries(headers.map((h, idx) => [h, values[idx] ?? ""]));

    const employeeCode = byHeader.employeeCode?.trim();
    const date = byHeader.date?.trim();
    const ruleCode = byHeader.ruleCode?.trim();
    const reason = byHeader.reason?.trim() ?? "";
    const rawSource = byHeader.source?.trim();

    if (!employeeCode) {
      errors.push({ row: rowNumber, message: "employeeCode is required." });
      continue;
    }
    if (!date || !DATE_RE.test(date)) {
      errors.push({ row: rowNumber, message: `date must be YYYY-MM-DD (got "${date}").` });
      continue;
    }
    if (!VALID_RULE_CODES.includes(ruleCode as EscalationRuleCode)) {
      errors.push({
        row: rowNumber,
        message: `ruleCode must be one of: ${VALID_RULE_CODES.join(", ")} (got "${ruleCode}").`,
      });
      continue;
    }
    const source: PointEventSource =
      rawSource && VALID_SOURCES.includes(rawSource as PointEventSource)
        ? (rawSource as PointEventSource)
        : "Policy";
    if (rawSource && !VALID_SOURCES.includes(rawSource as PointEventSource)) {
      errors.push({
        row: rowNumber,
        message: `source must be one of: ${VALID_SOURCES.join(", ")} (got "${rawSource}"). Defaulted to "Policy".`,
      });
    }

    rows.push({
      employeeCode,
      date,
      ruleCode: ruleCode as EscalationRuleCode,
      reason: reason || `Imported via CSV — ${ruleCode}`,
      source,
    });
  }

  return { rows, errors };
}
