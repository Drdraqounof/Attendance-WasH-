import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/access";
import { resetPassword } from "@/lib/account";
import { passwordProblem } from "@/lib/account-rules";

/**
 * POST { token, password } -> sets a new password using a one-time
 * reset link, then signs the account out everywhere. 400 for an
 * unknown, used or expired link.
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

  const { token, password } = (body ?? {}) as { token?: unknown; password?: unknown };
  if (typeof token !== "string" || token.length === 0 || typeof password !== "string") {
    return NextResponse.json({ error: "Token and new password are required." }, { status: 400 });
  }
  const problem = passwordProblem(password);
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  try {
    const ok = await resetPassword(token, password);
    if (!ok) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Request a new one." },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password reset failed:", error);
    return NextResponse.json(
      { error: "Password reset is temporarily unavailable. Try again shortly." },
      { status: 500 },
    );
  }
}
