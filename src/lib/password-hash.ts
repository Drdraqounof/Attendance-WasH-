import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Salted scrypt password hashing — used by auth-mock.ts (checking a
 * login) and src/db/seed-login-credentials.ts (seeding one). Kept
 * free of any Next.js import so the seed script (plain Node/tsx, no
 * request context) can use it too.
 */

const SCRYPT_KEY_LENGTH = 64;

/** Returns "<salt-hex>:<hash-hex>", safe to store in login_credentials.password_hash. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

export function passwordMatches(password: string, storedHash: string): boolean {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
