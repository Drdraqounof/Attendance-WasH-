import { createHash, randomBytes } from "node:crypto";

/**
 * Random bearer tokens (sessions, password reset links). Only the
 * sha256 is ever stored, so a leaked DB row can't be replayed.
 */

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
