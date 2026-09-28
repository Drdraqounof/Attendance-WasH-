import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  loginCredentials,
  passwordResetTokens,
  stations,
  userProfiles,
  userRoles,
} from "@/db/schema";
import type { UserRole } from "@/lib/access";
import { normalizeEmail } from "@/lib/account-rules";
import { hashPassword } from "@/lib/password-hash";
import { revokeAllSessions } from "@/lib/session";
import { hashToken, newToken } from "@/lib/tokens";

/**
 * Server-only account lifecycle: self-registration and password reset.
 * Validation lives in src/lib/account-rules.ts; callers validate first.
 * See docs/auth/authentication.md.
 */

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export type RegisterResult =
  | { ok: true }
  | { ok: false; reason: "exists" | "unknown_station" };

/** Stations offered on the register form, alphabetical. */
export async function listStations(): Promise<{ id: number; name: string }[]> {
  return db.select({ id: stations.id, name: stations.name }).from(stations).orderBy(stations.name);
}

/**
 * Creates a sign-in for a new email, with the role (and, for a
 * supervisor, the station) the person picked on the form.
 *
 * TEMPORARY: there's no HR approval step yet, so sign-up grants that
 * role immediately — including HR. Replace with an approval queue
 * before production. See docs/auth/authentication.md.
 */
export async function registerAccount(input: {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  /** Required for supervisors; ignored for HR (HR = all stations). */
  stationId: number | null;
}): Promise<RegisterResult> {
  const email = normalizeEmail(input.email);
  const stationId = input.role === "hr" ? null : input.stationId;
  if (input.role === "supervisor") {
    if (stationId === null) return { ok: false, reason: "unknown_station" };
    const [station] = await db
      .select({ id: stations.id })
      .from(stations)
      .where(eq(stations.id, stationId))
      .limit(1);
    if (!station) return { ok: false, reason: "unknown_station" };
  }

  const inserted = await db
    .insert(loginCredentials)
    .values({ email, passwordHash: hashPassword(input.password) })
    .onConflictDoNothing()
    .returning({ email: loginCredentials.email });
  if (inserted.length === 0) return { ok: false, reason: "exists" };

  await db
    .insert(userProfiles)
    .values({ email, displayName: input.name.trim() })
    .onConflictDoNothing();
  await db
    .insert(userRoles)
    .values({ email, role: input.role, stationId })
    .onConflictDoNothing();
  return { ok: true };
}

/**
 * Issues a one-time reset link and delivers it. Silently does nothing
 * for unknown emails — callers always show the same message, so the
 * form can't be used to discover who has an account.
 */
export async function requestPasswordReset(rawEmail: string, origin: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const [account] = await db
    .select({ email: loginCredentials.email })
    .from(loginCredentials)
    .where(eq(loginCredentials.email, email))
    .limit(1);
  if (!account) return;

  const token = newToken();
  await db.insert(passwordResetTokens).values({
    id: hashToken(token),
    email,
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });

  deliverResetLink(email, `${origin}/reset-password?token=${encodeURIComponent(token)}`);
}

/**
 * No email provider is configured yet, so in development the link is
 * printed to the dev server terminal. In production nothing is sent
 * until a provider is wired in here — the link is never logged there.
 */
function deliverResetLink(email: string, link: string): void {
  if (process.env.NODE_ENV !== "production") {
    console.info(`\n[password-reset] Reset link for ${email} (valid 1 hour):\n${link}\n`);
    return;
  }
  console.warn(
    `[password-reset] Reset requested for ${email}, but no email provider is configured — link not delivered.`,
  );
}

async function findUsableToken(token: string) {
  const [row] = await db
    .select({ id: passwordResetTokens.id, email: passwordResetTokens.email })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.id, hashToken(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** True if the link can still be used (for showing the form vs. an "expired" message). */
export async function isResetTokenUsable(token: string): Promise<boolean> {
  return (await findUsableToken(token)) !== null;
}

/**
 * Sets the new password, burns every outstanding reset link for the
 * account, and signs it out everywhere. Returns false for an unknown,
 * used or expired link.
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const row = await findUsableToken(token);
  if (!row) return false;

  // Claim the token first so the same link can't be used twice.
  const claimed = await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.id, row.id), isNull(passwordResetTokens.usedAt)))
    .returning({ id: passwordResetTokens.id });
  if (claimed.length === 0) return false;

  await db
    .update(loginCredentials)
    .set({ passwordHash: hashPassword(newPassword) })
    .where(eq(loginCredentials.email, row.email));

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.email, row.email), isNull(passwordResetTokens.usedAt)));

  await revokeAllSessions(row.email);
  return true;
}
