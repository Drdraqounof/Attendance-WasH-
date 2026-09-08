import { NextResponse } from "next/server";
import { hasDemoSession } from "@/lib/auth-mock";
import type { PolicyThresholdKey } from "@/lib/policy-engine";
import {
  getPolicyThresholds,
  updatePolicyThreshold,
} from "@/lib/policy-queries";

/**
 * Lets a signed-in user retune any of the three automated-workflow
 * thresholds (verbal warning / required manager meeting / PIP) from
 * /settings. See docs/policy-thresholds-editing.md.
 *
 * GET  -> current thresholds (DB-backed, falls back to the static
 *         defaults if the table is ever empty).
 * PATCH { key, pointValue } -> updates one threshold; validated for
 *         ordering (verbal_warning < manager_meeting < pip) by
 *         src/lib/policy-queries.ts::updatePolicyThreshold. Editing
 *         "pip" also bulk-updates every employee's policy cap.
 *
 * Gated the same way as every other action in the app today: any
 * signed-in demo user — there's no manager/admin role system yet.
 */
export async function GET() {
  const signedIn = await hasDemoSession();
  if (!signedIn) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const thresholds = await getPolicyThresholds();
  return NextResponse.json({ thresholds });
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
    const result = await updatePolicyThreshold(
      key as PolicyThresholdKey,
      pointValue,
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
