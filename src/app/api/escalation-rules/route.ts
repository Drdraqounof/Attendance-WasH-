import { NextResponse } from "next/server";
import type { EscalationRuleCode } from "@/lib/policy-engine";
import {
  getEscalationRules,
  updateEscalationRule,
} from "@/lib/policy-queries";
import { requireApiSession, writeAudit } from "@/lib/session";

/**
 * Lets a signed-in user retune the 7 escalation rules (how many points
 * each duration/notice-status combination is worth, per the policy PDF
 * §4 matrix, plus the flat non-attendance-written-warning rule) from
 * /settings. See docs/policy/policy-thresholds-editing.md.
 *
 * GET   -> current rules (DB-backed, falls back to the static
 *          defaults if the table is ever empty).
 * PATCH { code, points } -> updates one rule; validated for ordering
 *          (each duration band's "without notice" value at or above its
 *          "with notice" value, and the three bands escalating) by
 *          src/lib/policy-queries.ts::updateEscalationRule.
 *
 * GET: any signed-in user. PATCH: HR only (these are org-wide policy
 * values), recorded in audit_log. See docs/auth/roles-and-stations.md.
 */
export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if (session instanceof NextResponse) return session;

  const rules = await getEscalationRules();
  return NextResponse.json({ rules });
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

  const code =
    typeof body === "object" && body !== null && "code" in body
      ? (body as { code: unknown }).code
      : undefined;
  const points =
    typeof body === "object" && body !== null && "points" in body
      ? (body as { points: unknown }).points
      : undefined;

  if (typeof code !== "string" || typeof points !== "number") {
    return NextResponse.json(
      { error: "code (string) and points (number) are required." },
      { status: 400 },
    );
  }

  try {
    const before = await getEscalationRules();
    const result = await updateEscalationRule(
      code as EscalationRuleCode,
      points,
    );
    await writeAudit(session, {
      action: "update",
      entity: "escalation_rule",
      entityId: code,
      before: before.find((r) => r.code === code)?.points ?? null,
      after: points,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
