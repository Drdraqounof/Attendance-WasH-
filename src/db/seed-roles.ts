import "dotenv/config";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { employees, loginCredentials, stations, userProfiles, userRoles } from "@/db/schema";

/**
 * Sets up stations and role assignments. See
 * docs/auth/roles-and-stations.md.
 *
 * 1. Upserts one `stations` row per distinct `employees.team` (read-only
 *    on employees — nothing is written back to it).
 * 2. For every email in SEED_ROLE_ASSIGNMENTS, *replaces* that user's
 *    `user_roles` rows with the listed ones (so removing a station here
 *    and re-running revokes it), and upserts their display name.
 *
 * SEED_ROLE_ASSIGNMENTS lives in .env (git-ignored), as JSON:
 *
 *   SEED_ROLE_ASSIGNMENTS='[
 *     {"email":"hr@example.com","name":"Dana HR","role":"hr"},
 *     {"email":"sup@example.com","name":"Sam Lee","role":"supervisor",
 *      "stations":["Delivery Drivers","Team Leads"]}
 *   ]'
 *
 * HR with no "stations" = all stations. A supervisor must list at least
 * one. Every email must already exist in login_credentials
 * (npm run db:seed-login). The same email may appear more than once to
 * hold several roles.
 *
 * Run with: npm run db:seed-roles
 */

type AssignmentInput = {
  email: string;
  name?: string;
  role: "hr" | "supervisor";
  stations?: string[];
};

function parseAssignments(raw: string | undefined): AssignmentInput[] {
  if (!raw?.trim()) {
    throw new Error("Set SEED_ROLE_ASSIGNMENTS in .env (see the comment at the top of this file).");
  }
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("SEED_ROLE_ASSIGNMENTS must be a JSON array.");

  return parsed.map((item, index) => {
    const { email, name, role, stations: stationNames } = (item ?? {}) as Record<string, unknown>;
    if (typeof email !== "string" || !email.includes("@")) {
      throw new Error(`Assignment #${index + 1}: "email" is required.`);
    }
    if (role !== "hr" && role !== "supervisor") {
      throw new Error(`Assignment #${index + 1} (${email}): "role" must be "hr" or "supervisor".`);
    }
    if (stationNames !== undefined && !(Array.isArray(stationNames) && stationNames.every((s) => typeof s === "string"))) {
      throw new Error(`Assignment #${index + 1} (${email}): "stations" must be a list of names.`);
    }
    if (role === "supervisor" && !(stationNames as string[] | undefined)?.length) {
      throw new Error(`Assignment #${index + 1} (${email}): a supervisor needs at least one station.`);
    }
    return {
      email: email.trim().toLowerCase(),
      name: typeof name === "string" ? name.trim() : undefined,
      role,
      stations: stationNames as string[] | undefined,
    };
  });
}

async function main() {
  const assignments = parseAssignments(process.env.SEED_ROLE_ASSIGNMENTS);

  // 1. Stations from the existing team values.
  const teams = await db.selectDistinct({ team: employees.team }).from(employees);
  if (teams.length > 0) {
    await db
      .insert(stations)
      .values(teams.map(({ team }) => ({ name: team })))
      .onConflictDoNothing();
  }
  const stationRows = await db.select().from(stations);
  const stationIdByName = new Map(stationRows.map((row) => [row.name, row.id]));
  console.log(`Stations: ${stationRows.map((row) => row.name).join(", ")}`);

  // 2. Every email must already be able to sign in.
  const emails = [...new Set(assignments.map((a) => a.email))];
  const known = await db
    .select({ email: loginCredentials.email })
    .from(loginCredentials)
    .where(inArray(loginCredentials.email, emails));
  const knownEmails = new Set(known.map((row) => row.email));
  const missing = emails.filter((email) => !knownEmails.has(email));
  if (missing.length > 0) {
    throw new Error(`No login credential for: ${missing.join(", ")}. Run npm run db:seed-login first.`);
  }

  // 3. Resolve station names up front so a typo aborts before any writes.
  type RoleRow = { email: string; role: "hr" | "supervisor"; stationId: number | null };
  const rows = assignments.flatMap((a): RoleRow[] => {
    if (a.role === "hr" && !a.stations?.length) {
      return [{ email: a.email, role: a.role, stationId: null }];
    }
    return (a.stations ?? []).map((name) => {
      const stationId = stationIdByName.get(name);
      if (stationId === undefined) {
        throw new Error(`Unknown station "${name}" for ${a.email}. Known: ${[...stationIdByName.keys()].join(", ")}`);
      }
      return { email: a.email, role: a.role, stationId };
    });
  });

  // 4. Replace each listed user's assignments and upsert display names.
  for (const email of emails) {
    await db.delete(userRoles).where(eq(userRoles.email, email));
    const mine = rows.filter((row) => row.email === email);
    await db.insert(userRoles).values(mine).onConflictDoNothing();

    const name = assignments.find((a) => a.email === email && a.name)?.name;
    if (name) {
      await db
        .insert(userProfiles)
        .values({ email, displayName: name })
        .onConflictDoUpdate({ target: userProfiles.email, set: { displayName: sql`excluded.display_name` } });
    }
    console.log(`${email}: ${mine.map((row) => `${row.role}@${row.stationId ?? "all"}`).join(", ")}`);
  }

  console.log(`\nDone — ${emails.length} user(s) assigned.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
