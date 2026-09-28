import "dotenv/config";
import { db } from "@/db/client";
import { loginCredentials } from "@/db/schema";
import { hashPassword } from "@/lib/password-hash";

/**
 * Seeds/updates the login_credentials table with the current org
 * allowlist. Idempotent — upserts by email (primary key), so re-running
 * after rotating the temp password just updates the hash.
 *
 * Reads SEED_LOGIN_EMAILS (comma-separated) and SEED_LOGIN_PASSWORD
 * from .env (git-ignored) rather than hardcoding them here — this
 * script's source is committed to git, and a plaintext password
 * (even a temporary one) shouldn't live in git history.
 *
 * Run with: npm run db:seed-login
 */

function parseEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function main() {
  const emails = parseEmails(process.env.SEED_LOGIN_EMAILS);
  const password = process.env.SEED_LOGIN_PASSWORD;

  if (emails.length === 0 || !password) {
    throw new Error(
      "Set SEED_LOGIN_EMAILS (comma-separated) and SEED_LOGIN_PASSWORD in .env before running this script.",
    );
  }

  const passwordHash = hashPassword(password);

  for (const email of emails) {
    await db
      .insert(loginCredentials)
      .values({ email, passwordHash })
      .onConflictDoUpdate({
        target: loginCredentials.email,
        set: { passwordHash },
      });
    console.log(`Seeded login credential for ${email}`);
  }

  console.log(
    `\nDone — ${emails.length} email(s) can sign in with the temp password. Rotate it before production.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
