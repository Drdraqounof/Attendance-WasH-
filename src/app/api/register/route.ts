import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/access";
import { registerAccount } from "@/lib/account";
import { isValidEmail, nameProblem, passwordProblem } from "@/lib/account-rules";

/**
 * POST { name, email, password, role, stationId } -> creates a sign-in
 * with the chosen role (a supervisor must pick a station). The person
 * can sign in straight away.
 *
 * TEMPORARY: self-selected roles stand in for an HR approval step that
 * doesn't exist yet — see src/lib/account.ts::registerAccount.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request.headers.get("origin"), request.headers.get("host"))) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { name, email, password, role, stationId } = (body ?? {}) as Record<string, unknown>;
  if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
  }

  if (role !== "hr" && role !== "supervisor") {
    return NextResponse.json({ error: "Choose a role." }, { status: 400 });
  }
  const station =
    role === "supervisor" && typeof stationId === "number" && Number.isInteger(stationId)
      ? stationId
      : null;
  if (role === "supervisor" && station === null) {
    return NextResponse.json({ error: "Choose your station." }, { status: 400 });
  }

  const problem =
    nameProblem(name) ??
    (isValidEmail(email) ? null : "Enter a valid email address.") ??
    passwordProblem(password);
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  try {
    const result = await registerAccount({ name, email, password, role, stationId: station });
    if (!result.ok && result.reason === "unknown_station") {
      return NextResponse.json({ error: "Choose one of the listed stations." }, { status: 400 });
    }
    if (!result.ok) {
      return NextResponse.json(
        { error: "An account with this email already exists. Sign in, or reset your password." },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Registration failed:", error);
    return NextResponse.json(
      { error: "Registration is temporarily unavailable. Try again shortly." },
      { status: 500 },
    );
  }
}
