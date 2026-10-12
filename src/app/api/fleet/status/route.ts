import { NextResponse } from "next/server";
import { startRequest } from "@/lib/fleet/api-log";
import { tomtomStatus } from "@/lib/fleet/tomtom";
import { recentProblems } from "@/lib/log";
import { requireApiSession } from "@/lib/session";

/**
 * GET -> live-routing diagnostics for when /map "isn't working". HR only.
 * Reports whether keys are configured (never their values), today's
 * TomTom budget, per-endpoint call/failure counts with the last error,
 * and the most recent warnings/errors logged by the map stack. All of it
 * is per server instance and resets on restart. See
 * docs/operations/logging.md.
 */
export async function GET(request: Request) {
  const req = startRequest("fleet/status", request);
  const session = await requireApiSession(request, { hrOnly: true });
  if (session instanceof NextResponse) {
    req.log.warn("status denied", { status: session.status });
    return session;
  }

  const problems = recentProblems().filter((p) =>
    ["tomtom", "osrm", "fleet/", "gas-price"].some((prefix) => p.scope.startsWith(prefix)),
  );

  return req.respond({
    checkedAt: new Date().toISOString(),
    env: {
      tomtomKey: tomtomStatus().keyConfigured,
      eiaKey: Boolean(process.env.EIA_API_KEY),
      logLevel: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "development" ? "debug" : "info"),
    },
    tomtom: tomtomStatus(),
    recentProblems: problems.slice(0, 25),
  });
}
