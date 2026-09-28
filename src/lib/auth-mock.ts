import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { loginCredentials } from "@/db/schema";
import { passwordMatches } from "@/lib/password-hash";
import { getSession } from "@/lib/session";

/**
 * True when a valid per-user session exists (any workspace state).
 * Prefer requireSession() / requireApiSession() from src/lib/session.ts,
 * which also enforce the active role/station.
 */
export async function hasDemoSession(): Promise<boolean> {
  return (await getSession()) !== null;
}

/**
 * Checks a submitted email/password against the login_credentials
 * table in Neon (see src/db/schema.ts and
 * src/db/seed-login-credentials.ts). Returns false for an unknown
 * email or wrong password — never throws for bad input, only for a
 * DB-level failure, so a misconfigured connection still fails closed.
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const [row] = await db
    .select({ passwordHash: loginCredentials.passwordHash })
    .from(loginCredentials)
    .where(eq(loginCredentials.email, normalizedEmail))
    .limit(1);

  if (!row) return false;
  return passwordMatches(password, row.passwordHash);
}
