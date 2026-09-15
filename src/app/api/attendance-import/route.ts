import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { employees } from "@/db/schema";
import { hasDemoSession } from "@/lib/auth-mock";
import { parseAttendanceCsv, type CsvRowError } from "@/lib/csv-import";
import { recordPointEvent } from "@/lib/policy-queries";

/**
 * POST { csv: string } -> bulk-imports attendance events from CSV text
 * (see src/lib/csv-import.ts for the expected columns). Each valid row
 * is matched to a real employee by employeeCode and recorded through
 * recordPointEvent() — the same ledger/threshold/termination-notification
 * path every other point event uses, so imported rows are real data, not a
 * mock addition. Per-row resilience: one bad row (unknown employee
 * code, DB error) doesn't abort the rest of the batch.
 *
 * Same gating as every other mutation route in the app —
 * hasDemoSession() only, no manager/admin role system yet.
 */
export async function POST(request: Request) {
  const signedIn = await hasDemoSession();
  if (!signedIn) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const csv =
    typeof body === "object" && body !== null && "csv" in body
      ? (body as { csv: unknown }).csv
      : undefined;
  if (typeof csv !== "string" || csv.trim().length === 0) {
    return NextResponse.json({ error: "csv (file text) is required." }, { status: 400 });
  }

  const { rows, errors: parseErrors } = parseAttendanceCsv(csv);
  const errors: CsvRowError[] = [...parseErrors];

  if (rows.length === 0) {
    return NextResponse.json({ imported: 0, total: 0, errors }, { status: 400 });
  }

  const employeeCodes = [...new Set(rows.map((r) => r.employeeCode))];
  const matches = await db
    .select({ id: employees.id, employeeCode: employees.employeeCode })
    .from(employees)
    .where(inArray(employees.employeeCode, employeeCodes));
  const idByCode = new Map(matches.map((m) => [m.employeeCode, m.id]));

  let imported = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // header is row 1, data starts at row 2
    const employeeId = idByCode.get(row.employeeCode);
    if (!employeeId) {
      errors.push({
        row: rowNumber,
        message: `No employee found with employeeCode "${row.employeeCode}".`,
      });
      continue;
    }

    try {
      await recordPointEvent({
        id: `imp-${Date.now()}-${i}-${employeeId}`,
        employeeId,
        date: row.date,
        ruleCode: row.ruleCode,
        reason: row.reason,
        source: row.source,
      });
      imported++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed.";
      errors.push({ row: rowNumber, message: `${row.employeeCode}: ${message}` });
    }
  }

  return NextResponse.json({ imported, total: rows.length, errors });
}
