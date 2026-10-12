import { NextResponse } from "next/server";
import { TomTomError } from "@/lib/fleet/tomtom";
import { createLogger, elapsedMs, newRequestId, now, type Logger } from "@/lib/log";

/**
 * Shared request logging for the /api/fleet/* routes: a per-request id
 * (returned as `x-request-id`), a start/finish line with timing, and a
 * short, safe fallback reason. See docs/operations/logging.md.
 */
export function startRequest(scope: string, request: Request) {
  const requestId = newRequestId();
  const log: Logger = createLogger(scope).child({ requestId });
  const start = now();
  const path = new URL(request.url).pathname;

  return {
    log,
    requestId,
    /** Sends JSON with the request id header and logs one summary line. */
    respond<T>(body: T, init: { status?: number; fields?: Record<string, unknown> } = {}) {
      const status = init.status ?? 200;
      const fields = { path, status, ms: elapsedMs(start), ...init.fields };
      if (status >= 500) log.error("request failed", fields);
      else if (status >= 400) log.warn("request rejected", fields);
      else log.info("request done", fields);
      return NextResponse.json<T>(body, {
        status,
        headers: { "x-request-id": requestId },
      });
    },
  };
}

/** A short reason for a fallback, safe to return to the client. */
export function fallbackReason(error: unknown): string {
  if (error instanceof TomTomError) {
    return error.status ? `${error.reason} ${error.status}` : error.reason;
  }
  return "error";
}
