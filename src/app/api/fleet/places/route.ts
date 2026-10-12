import { NextResponse } from "next/server";
import { fallbackReason, startRequest } from "@/lib/fleet/api-log";
import { searchPlaces, tomtomKey } from "@/lib/fleet/tomtom";
import type { PlacesResponse } from "@/lib/fleet/types";
import { requireApiSession } from "@/lib/session";

/**
 * GET ?q=burger king -> up to 8 places near Boston from TomTom Search,
 * for "Plan a trip" on /map. Any signed-in workspace (HR or
 * Supervisor, every station). With no TOM_TOM_API_KEY, or on any TomTom
 * error, returns no places with `isLive: false` and a `fallbackReason`.
 * Every request is logged with an id (see docs/operations/logging.md).
 */
export async function GET(request: Request) {
  const req = startRequest("fleet/places", request);
  const session = await requireApiSession(request);
  if (session instanceof NextResponse) {
    req.log.warn("not signed in or no workspace", { status: session.status });
    return session;
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3 || q.length > 100) {
    return req.respond(
      { error: "Search needs 3–100 characters." },
      { status: 400, fields: { qLength: q.length } },
    );
  }

  const key = tomtomKey();
  if (!key) {
    req.log.warn("TOM_TOM_API_KEY is not set — live search unavailable");
    return req.respond<PlacesResponse>({ places: [], isLive: false, fallbackReason: "no_key" });
  }

  try {
    const places = await searchPlaces(q, key);
    return req.respond<PlacesResponse>(
      { places, isLive: true },
      { fields: { results: places.length } },
    );
  } catch (error) {
    const reason = fallbackReason(error);
    req.log.error("TomTom search failed — returning no places", { reason, error });
    return req.respond<PlacesResponse>({ places: [], isLive: false, fallbackReason: reason });
  }
}
