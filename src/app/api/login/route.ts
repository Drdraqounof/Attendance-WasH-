import { NextResponse } from "next/server";
import { isSameOrigin, isValidAssignment } from "@/lib/access";
import { verifyCredentials } from "@/lib/auth-mock";
import { createSession, getAssignments, setSessionCookie } from "@/lib/session";

/**
 * POST { email, password } -> verifies against the login_credentials
 * table in Neon (see src/lib/auth-mock.ts::verifyCredentials), then
 * creates a per-user session (src/lib/session.ts) and sets its httpOnly
 * cookie. Returns `{ next }`: /login/workspace when the user has more
 * than one role/station assignment to pick from, otherwise straight on
 * to /login/language. See docs/auth/roles-and-stations.md.
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

  const email =
    typeof body === "object" && body !== null && "email" in body
      ? String((body as { email: unknown }).email ?? "")
      : "";
  const password =
    typeof body === "object" && body !== null && "password" in body
      ? String((body as { password: unknown }).password ?? "")
      : "";

  if (!email.trim() || !password) {
    return NextResponse.json(
      { error: "Enter an email and password to continue." },
      { status: 400 },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const allowed = await verifyCredentials(normalizedEmail, password);
    if (!allowed) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const assignments = (await getAssignments(normalizedEmail)).filter(isValidAssignment);
    if (assignments.length === 0) {
      return NextResponse.json(
        {
          error:
            "Your account doesn't have a role yet. Ask an administrator to assign one.",
        },
        { status: 403 },
      );
    }

    const { token, active } = await createSession(normalizedEmail, assignments);
    const response = NextResponse.json({
      ok: true,
      next: active ? "/login/language" : "/login/workspace",
    });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Login check failed:", error);
    return NextResponse.json(
      { error: "Sign-in is temporarily unavailable. Try again shortly." },
      { status: 500 },
    );
  }
}
