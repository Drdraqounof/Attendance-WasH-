import { NextResponse } from "next/server";
import { hasDemoSession } from "@/lib/auth-mock";
import type { RiskLevel } from "@/lib/policy-engine";
import { setEmployeeStatus, TARGET_STATUSES } from "@/lib/policy-queries";

/**
 * First real mutation-capable API route in the app — see
 * docs/employee-track-record-plan.md and docs/points-system-brd.md's
 * Phase 2 ("list/update warning & action-plan status").
 *
 * POST { employeeId, targetStatus, note? } -> moves the employee to
 * the chosen status (Clear / Watch / At Risk / PIP), adding or
 * deducting whatever points that takes — logged as an auditable
 * ledger entry, with warnings opened/resolved to match. See
 * src/lib/policy-queries.ts::setEmployeeStatus.
 *
 * Gated the same way as every other page in this demo: any signed-in
 * user (hasDemoSession()) — there is no manager/admin role system yet
 * (see docs/employee-track-record-plan.md's open questions).
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

  const employeeId =
    typeof body === "object" && body !== null && "employeeId" in body
      ? (body as { employeeId: unknown }).employeeId
      : undefined;
  const targetStatus =
    typeof body === "object" && body !== null && "targetStatus" in body
      ? (body as { targetStatus: unknown }).targetStatus
      : undefined;
  const note =
    typeof body === "object" && body !== null && "note" in body
      ? (body as { note: unknown }).note
      : undefined;

  if (typeof employeeId !== "string" || employeeId.length === 0) {
    return NextResponse.json(
      { error: "employeeId is required." },
      { status: 400 },
    );
  }
  if (
    typeof targetStatus !== "string" ||
    !TARGET_STATUSES.includes(targetStatus as RiskLevel)
  ) {
    return NextResponse.json(
      { error: `targetStatus must be one of: ${TARGET_STATUSES.join(", ")}.` },
      { status: 400 },
    );
  }

  try {
    const result = await setEmployeeStatus(
      employeeId,
      targetStatus as RiskLevel,
      typeof note === "string" ? note : undefined,
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
