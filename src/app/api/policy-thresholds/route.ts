import { NextResponse } from "next/server";
import type { PolicyThresholdKey } from "@/lib/policy-engine";
import {
  getPolicyThresholds,
  updatePolicyThreshold,
} from "@/lib/policy-queries";
import { requireApiSession, writeAudit } from "@/lib/session";

/**
 * Lets a signed-in user retune any of the 5 automated-workflow
 * thresholds (low / elevated / at_risk / critical / termination — the
 * policy PDF §5 risk bands) from /settings. See
 * docs/policy/policy-thresholds-editing.md.
 *
 * GET  -> current thresholds (DB-backed, falls back to the static
 *         defaults if the table is ever empty).
 * PATCH { key, pointValue } -> updates one threshold; validated for
 *         ordering (low < elevated < at_risk < critical < termination) by
 *         src/lib/policy-queries.ts::updatePolicyThreshold. Editing
 *         "termination" also bulk-updates every employee's policy cap.
 *
 * GET: any signed-in user. PATCH: HR only (these are org-wide policy
 * values), recorded in audit_log. See docs/auth/roles-and-stations.md.
 */
export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if (session instanceof NextResponse) return session;

  const thresholds = await getPolicyThresholds();
  return NextResponse.json({ thresholds });
}

export async function PATCH(request: Request) {
  const session = await requireApiSession(request, { hrOnly: true, mutating: true });
  if (session instanceof NextResponse) return session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const key =
    typeof body === "object" && body !== null && "key" in body
      ? (body as { key: unknown }).key
      : undefined;
  const pointValue =
    typeof body === "object" && body !== null && "pointValue" in body
      ? (body as { pointValue: unknown }).pointValue
      : undefined;

  if (typeof key !== "string" || typeof pointValue !== "number") {
    return NextResponse.json(
      { error: "key (string) and pointValue (number) are required." },
      { status: 400 },
    );
  }

  try {
    const before = await getPolicyThresholds();
    const result = await updatePolicyThreshold(
      key as PolicyThresholdKey,
      pointValue,
    );
    await writeAudit(session, {
      action: "update",
      entity: "policy_threshold",
      entityId: key,
      before: before.find((t) => t.key === key)?.pointValue ?? null,
      after: pointValue,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
