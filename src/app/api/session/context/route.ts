import { NextResponse } from "next/server";
import { isSameOrigin, type UserRole } from "@/lib/access";
import { getSession, setActiveAssignment } from "@/lib/session";

/**
 * POST { role, stationId } -> switches the active workspace for this
 * session. Only accepts one of the caller's own assignments
 * (user_roles) — nobody can pick a role or station they weren't given.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request.headers.get("origin"), request.headers.get("host"))) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { role, stationId } = (body ?? {}) as { role?: unknown; stationId?: unknown };
  if (role !== "hr" && role !== "supervisor") {
    return NextResponse.json({ error: "role must be hr or supervisor." }, { status: 400 });
  }
  if (stationId !== null && !(typeof stationId === "number" && Number.isInteger(stationId))) {
    return NextResponse.json({ error: "stationId must be a number or null." }, { status: 400 });
  }

  const chosen = await setActiveAssignment(role as UserRole, stationId);
  if (!chosen) {
    return NextResponse.json(
      { error: "That workspace isn't assigned to your account." },
      { status: 403 },
    );
  }
  return NextResponse.json({ ok: true });
}
