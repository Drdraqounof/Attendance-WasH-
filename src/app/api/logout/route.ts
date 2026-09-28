import { NextResponse } from "next/server";
import { clearSessionCookie, revokeCurrentSession } from "@/lib/session";

/** POST -> revokes this session server-side and clears its cookie. */
export async function POST() {
  try {
    await revokeCurrentSession();
  } catch (error) {
    // Still clear the cookie — failing to sign out would be worse.
    console.error("Session revoke failed:", error);
  }
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
