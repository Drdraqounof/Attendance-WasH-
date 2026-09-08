import { NextResponse } from "next/server";
import { hasDemoSession } from "@/lib/auth-mock";
import type { EscalationRuleCode } from "@/lib/policy-engine";
import {
  getEscalationRules,
  updateEscalationRule,
} from "@/lib/policy-queries";

/**
 * Lets a signed-in user retune the four escalation tiers (how many
 * points each infraction type is worth) from /settings. See
 * docs/policy-thresholds-editing.md.
 *
 * GET   -> current rules (DB-backed, falls back to the static
 *          defaults if the table is ever empty).
 * PATCH { code, points } -> updates one rule; validated for ordering
 *          (minor < moderate < severe < no-call/no-show) by
 *          src/lib/policy-queries.ts::updateEscalationRule.
 *
 * Gated the same way as every other action in the app today: any
 * signed-in demo user — there's no manager/admin role system yet.
 */
export async function GET() {
  const signedIn = await hasDemoSession();
  if (!signedIn) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const rules = await getEscalationRules();
  return NextResponse.json({ rules });
}

export async function PATCH(request: Request) {
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
    const result = await updateEscalationRule(
      code as EscalationRuleCode,
      points,
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
