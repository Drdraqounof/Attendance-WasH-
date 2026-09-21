import { NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/auth-constants";

/** POST -> clears the httpOnly session cookie set by /api/login. */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
