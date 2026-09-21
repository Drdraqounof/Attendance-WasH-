import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { DEMO_COOKIE } from "@/lib/auth-constants";

export { DEMO_COOKIE };

/** Server-side session check for RSC pages. */
export async function hasDemoSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(DEMO_COOKIE)?.value === "1";
}

function parseAllowedEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Constant-time string compare (fixed-length digests, so length itself leaks nothing). */
function secretsMatch(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a).digest();
  const digestB = createHash("sha256").update(b).digest();
  return timingSafeEqual(digestA, digestB);
}

/**
 * Checks a submitted email/password against the org allowlist —
 * AUTH_ALLOWED_EMAILS (comma-separated) and AUTH_PASSWORD in .env.
 * Throws if those aren't configured, so a missing env var fails
 * closed (locks everyone out) rather than open (lets anyone in).
 */
export function verifyCredentials(email: string, password: string): boolean {
  const allowedEmails = parseAllowedEmails(process.env.AUTH_ALLOWED_EMAILS);
  const expectedPassword = process.env.AUTH_PASSWORD;

  if (allowedEmails.size === 0 || !expectedPassword) {
    throw new Error(
      "Login is not configured — set AUTH_ALLOWED_EMAILS and AUTH_PASSWORD in .env.",
    );
  }

  if (!allowedEmails.has(email.trim().toLowerCase())) {
    return false;
  }
  return secretsMatch(password, expectedPassword);
}
