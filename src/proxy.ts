import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-constants";

/**
 * Optimistic gate only: bounce requests with no session cookie at all
 * to /login before rendering. The real checks (valid, unexpired,
 * unrevoked session + role/station scope) happen server-side in
 * src/lib/session.ts — per Next 16 guidance, Proxy isn't an
 * authorization layer.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/analytics/:path*",
    "/insights/:path*",
    "/map/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/login/workspace",
    "/login/language",
  ],
};
