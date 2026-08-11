import { defineConfig } from "drizzle-kit";

// Load .env manually so drizzle-kit (run outside Next.js) sees DATABASE_URL.
import { config } from "dotenv";
config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to .env first.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
