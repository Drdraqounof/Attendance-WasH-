import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { cache } from "react";
import { db } from "@/db/client";
import { auditLog, sessions, stations, userProfiles, userRoles } from "@/db/schema";
import {
  findAssignment,
  isHr,
  isSameOrigin,
  pickDefaultAssignment,
  stationScope,
  type RoleAssignment,
  type SessionContext,
  type StationScope,
  type UserRole,
} from "@/lib/access";
import { SESSION_COOKIE } from "@/lib/auth-constants";
import { hashToken } from "@/lib/tokens";

/**
 * Server-only, DB-backed sessions — replaces the old shared
 * `ap_demo=1` cookie. Each sign-in gets its own random token; only its
 * sha256 is stored in `sessions`. See docs/auth/roles-and-stations.md.
 */

const SESSION_TTL_SECONDS = 60 * 60 * 24;

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** Every role/station assignment for one login email. */
export async function getAssignments(email: string): Promise<RoleAssignment[]> {
  const rows = await db
    .select({
      role: userRoles.role,
      stationId: stations.id,
      stationName: stations.name,
    })
    .from(userRoles)
    .leftJoin(stations, eq(userRoles.stationId, stations.id))
    .where(eq(userRoles.email, email));

  return rows.map((row) => ({
    role: row.role,
    station:
      row.stationId !== null && row.stationName !== null
        ? { id: row.stationId, name: row.stationName }
        : null,
  }));
}

/**
 * Creates a session row and returns the raw token for the cookie. If
 * the user has exactly one assignment it's made active straight away,
 * so the workspace picker can be skipped.
 */
export async function createSession(
  email: string,
  assignments: RoleAssignment[],
): Promise<{ token: string; active: RoleAssignment | null }> {
  const token = randomBytes(32).toString("base64url");
  const active = pickDefaultAssignment(assignments);

  await db.insert(sessions).values({
    id: hashToken(token),
    email,
    activeRole: active?.role ?? null,
    activeStationId: active?.station?.id ?? null,
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
  });

  return { token, active };
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, {
    ...sessionCookieOptions,
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
}

async function sessionIdFromCookie(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? hashToken(token) : null;
}

/**
 * The current user, their assignments, and the active workspace —
 * or null if not signed in / expired / revoked. Memoized per request.
 */
export const getSession = cache(async (): Promise<SessionContext | null> => {
  const sessionId = await sessionIdFromCookie();
  if (!sessionId) return null;

  const [row] = await db
    .select({
      email: sessions.email,
      activeRole: sessions.activeRole,
      activeStationId: sessions.activeStationId,
      displayName: userProfiles.displayName,
    })
    .from(sessions)
    .leftJoin(userProfiles, eq(userProfiles.email, sessions.email))
    .where(
      and(
        eq(sessions.id, sessionId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) return null;

  const assignments = await getAssignments(row.email);
  // Re-validated on every request, so revoking an assignment in
  // user_roles takes effect immediately for existing sessions.
  const active = row.activeRole
    ? findAssignment(assignments, row.activeRole, row.activeStationId)
    : null;

  return {
    email: row.email,
    displayName: row.displayName ?? row.email.split("@")[0],
    assignments,
    active,
  };
});

/** Switches the active workspace; rejects anything not assigned to this user. */
export async function setActiveAssignment(
  role: UserRole,
  stationId: number | null,
): Promise<RoleAssignment | null> {
  const session = await getSession();
  const sessionId = await sessionIdFromCookie();
  if (!session || !sessionId) return null;

  const chosen = findAssignment(session.assignments, role, stationId);
  if (!chosen) return null;

  await db
    .update(sessions)
    .set({ activeRole: chosen.role, activeStationId: chosen.station?.id ?? null })
    .where(eq(sessions.id, sessionId));
  return chosen;
}

/** Signs a user out everywhere — used after a password reset. */
export async function revokeAllSessions(email: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.email, email), isNull(sessions.revokedAt)));
}

export async function revokeCurrentSession(): Promise<void> {
  const sessionId = await sessionIdFromCookie();
  if (!sessionId) return;
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

// -- Page guards -------------------------------------------------------------

export type ActiveSession = SessionContext & {
  active: RoleAssignment;
  scope: StationScope;
};

/**
 * For Server Component pages: redirects to /login when signed out and
 * to /login/workspace when no workspace is picked yet.
 */
export async function requireSession(): Promise<ActiveSession> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.active) redirect("/login/workspace");
  return { ...session, active: session.active, scope: stationScope(session.active) };
}

// -- API guards ---------------------------------------------------------------

/**
 * For route handlers: returns the active session, or a ready-to-return
 * 401/403 response. Pass `hrOnly` for org-wide actions, and
 * `mutating` to enforce the same-origin (CSRF) check.
 */
export async function requireApiSession(
  request: Request,
  options: { hrOnly?: boolean; mutating?: boolean } = {},
): Promise<ActiveSession | NextResponse> {
  if (
    options.mutating &&
    !isSameOrigin(request.headers.get("origin"), request.headers.get("host"))
  ) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!session.active) {
    return NextResponse.json({ error: "Choose a workspace first." }, { status: 403 });
  }
  if (options.hrOnly && !isHr(session.active)) {
    return NextResponse.json(
      { error: "Only HR can make this change." },
      { status: 403 },
    );
  }
  return { ...session, active: session.active, scope: stationScope(session.active) };
}

// -- Audit ------------------------------------------------------------------

export async function writeAudit(
  session: ActiveSession,
  entry: {
    action: string;
    entity: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
  },
): Promise<void> {
  await db.insert(auditLog).values({
    actorEmail: session.email,
    role: session.active.role,
    stationId: session.active.station?.id ?? null,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    before: entry.before ?? null,
    after: entry.after ?? null,
  });
}
