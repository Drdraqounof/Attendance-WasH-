import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

/**
 * Server-only Neon/Drizzle client. Reads DATABASE_URL from the
 * environment (see .env, git-ignored). Uses Neon's HTTP driver so it
 * works from both regular server components and edge runtimes without
 * holding a persistent socket.
 *
 * Never import this from a "use client" component.
 */

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env (see docs/database.md).",
  );
}

const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });
