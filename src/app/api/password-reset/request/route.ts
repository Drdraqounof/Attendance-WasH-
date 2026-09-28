import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/access";
import { requestPasswordReset } from "@/lib/account";
import { isValidEmail } from "@/lib/account-rules";

/**
 * POST { email } -> issues a one-time reset link (1 hour) if the email
 * has an account. Always answers the same way, so it can't be used to
 * find out who has an account. Delivery: see
 * src/lib/account.ts::deliverResetLink.
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

  const { email } = (body ?? {}) as { email?: unknown };
  if (typeof email !== "string" || !isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const origin = process.env.APP_URL ?? new URL(request.url).origin;
    await requestPasswordReset(email, origin);
  } catch (error) {
    console.error("Password reset request failed:", error);
    return NextResponse.json(
      { error: "Password reset is temporarily unavailable. Try again shortly." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
