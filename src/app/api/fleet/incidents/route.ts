import { NextResponse } from "next/server";
import { fallbackReason, startRequest } from "@/lib/fleet/api-log";
import { bboxAreaKm2, incidentsInBbox, tomtomKey, type BBox } from "@/lib/fleet/tomtom";
import type { IncidentsResponse } from "@/lib/fleet/types";
import { requireApiSession } from "@/lib/session";

/**
 * GET ?bbox=west,south,east,north -> live traffic incidents (accidents,
 * closures, roadworks, jams…) in that box, for the "Live incidents" layer
 * on /map. Any signed-in workspace. Boxes over 5,000 km² are rejected.
 * With no TOM_TOM_API_KEY, or on a TomTom error, returns none with
 * `isLive: false` and a `fallbackReason`. Logged per request (see
 * docs/operations/logging.md).
 */
export async function GET(request: Request) {
  const req = startRequest("fleet/incidents", request);
  const session = await requireApiSession(request);
  if (session instanceof NextResponse) {
    req.log.warn("not signed in or no workspace", { status: session.status });
    return session;
  }

  const rawBbox = new URL(request.url).searchParams.get("bbox") ?? "";
  const bbox = rawBbox.split(",").map(Number);
  const [w, s, e, n] = bbox;
  if (
    bbox.length !== 4 ||
    bbox.some((v) => !Number.isFinite(v)) ||
    w! >= e! ||
    s! >= n! ||
    bboxAreaKm2(bbox as BBox) > 5000
  ) {
    return req.respond(
      { error: "Invalid or too-large bbox." },
      { status: 400, fields: { bbox: rawBbox } },
    );
  }

  const fetchedAt = new Date().toISOString();
  const key = tomtomKey();
  if (!key) {
    req.log.warn("TOM_TOM_API_KEY is not set — live incidents unavailable");
    return req.respond<IncidentsResponse>({
      incidents: [],
      isLive: false,
      fetchedAt,
      fallbackReason: "no_key",
    });
  }

  try {
    const incidents = await incidentsInBbox(bbox as BBox, key);
    const accidents = incidents.filter((i) => i.kind === "accident").length;
    return req.respond<IncidentsResponse>(
      { incidents, isLive: true, fetchedAt },
      { fields: { incidents: incidents.length, accidents } },
    );
  } catch (error) {
    const reason = fallbackReason(error);
    req.log.error("TomTom incidents failed — returning none", { reason, error });
    return req.respond<IncidentsResponse>({
      incidents: [],
      isLive: false,
      fetchedAt,
      fallbackReason: reason,
    });
  }
}
