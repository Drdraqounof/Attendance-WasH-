import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { loginCredentials } from "@/db/schema";
import { DEMO_COOKIE } from "@/lib/auth-constants";
import { passwordMatches } from "@/lib/password-hash";

export { DEMO_COOKIE };

/** Server-side session check for RSC pages. */
export async function hasDemoSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(DEMO_COOKIE)?.value === "1";
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
