import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { employees } from "@/db/schema";
import { inScope } from "@/lib/access";
import { parseAttendanceCsv, type CsvRowError } from "@/lib/csv-import";
import { recordPointEvent } from "@/lib/policy-queries";
import { requireApiSession, writeAudit } from "@/lib/session";

/**
 * POST { csv: string } -> bulk-imports attendance events from CSV text
 * (see src/lib/csv-import.ts for the expected columns). Each valid row
 * is matched to a real employee by employeeCode and recorded through
 * recordPointEvent() — the same ledger/threshold/termination-notification
 * path every other point event uses, so imported rows are real data, not a
 * mock addition. Per-row resilience: one bad row (unknown employee
 * code, DB error) doesn't abort the rest of the batch.
 *
 * Any signed-in role can import, but only for employees inside their
 * active station scope — rows for anyone else are rejected with a
 * per-row error. Each recorded event carries the importer's email
 * (createdBy), and the batch is logged to audit_log.
 */
export async function POST(request: Request) {
  const session = await requireApiSession(request, { mutating: true });
  if (session instanceof NextResponse) return session;

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
    .select({ id: employees.id, employeeCode: employees.employeeCode, team: employees.team })
    .from(employees)
    .where(inArray(employees.employeeCode, employeeCodes));
  const byCode = new Map(matches.map((m) => [m.employeeCode, m]));

  let imported = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // header is row 1, data starts at row 2
    const match = byCode.get(row.employeeCode);
    // Out-of-scope employees get the same message as unknown ones, so a
    // supervisor can't probe for employees at other stations.
    if (!match || !inScope(session.scope, match.team)) {
      errors.push({
        row: rowNumber,
        message: `No employee found with employeeCode "${row.employeeCode}" at your station.`,
      });
      continue;
    }
    const employeeId = match.id;

    try {
      await recordPointEvent({
        id: `imp-${Date.now()}-${i}-${employeeId}`,
        employeeId,
        date: row.date,
        ruleCode: row.ruleCode,
        reason: row.reason,
        source: row.source,
        createdBy: session.email,
      });
      imported++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed.";
      errors.push({ row: rowNumber, message: `${row.employeeCode}: ${message}` });
    }
  }

  if (imported > 0) {
    await writeAudit(session, {
      action: "import",
      entity: "attendance_import",
      entityId: new Date().toISOString(),
      after: { imported, total: rows.length, errorCount: errors.length },
    });
  }

  return NextResponse.json({ imported, total: rows.length, errors });
}
