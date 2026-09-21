import { NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/auth-constants";
import { verifyCredentials } from "@/lib/auth-mock";

/**
 * POST { email, password } -> verifies against the org allowlist
 * (AUTH_ALLOWED_EMAILS / AUTH_PASSWORD in .env — see
 * src/lib/auth-mock.ts::verifyCredentials) and, on success, issues a
 * server-set httpOnly session cookie. Replaces the previous
 * client-side `document.cookie = "ap_demo=1"` — the cookie is no
 * longer readable or forgeable from devtools/JS.
 *
 * Still a single shared session value (DEMO_COOKIE), not a per-user
 * token — see docs/auth/authentication.md's "Known limitations" for
 * what real per-manager identity would still require.
 */
export async function POST(request: Request) {
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

  let allowed: boolean;
  try {
    allowed = verifyCredentials(email, password);
  } catch (error) {
    console.error("Login is not configured:", error);
    return NextResponse.json(
      { error: "Sign-in is not configured. Contact an administrator." },
      { status: 500 },
    );
  }

  if (!allowed) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return response;
}
