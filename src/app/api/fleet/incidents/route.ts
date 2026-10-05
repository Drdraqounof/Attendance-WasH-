import { NextResponse } from "next/server";
import { routesForScope } from "@/lib/fleet/scoped-routes";
import { bboxAreaKm2, incidentsInBbox, tomtomKey, type BBox } from "@/lib/fleet/tomtom";
import type { IncidentsResponse } from "@/lib/fleet/types";
import { requireApiSession } from "@/lib/session";

/**
 * GET ?bbox=west,south,east,north -> live traffic incidents (accidents,
 * closures, roadworks, jams…) in that box, for the "Live incidents" layer
 * on /map. Map viewers only. Boxes over 5,000 km² are rejected. With no
 * TOM_TOM_API_KEY, or on a TomTom error, returns none with
 * `isLive: false`. See LIVE_ROUTING_PLAN.md.
 */
export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if (session instanceof NextResponse) return session;
  if (routesForScope(session.scope).length === 0) {
    return NextResponse.json({ error: "No map access at this station." }, { status: 403 });
  }

  const bbox = (new URL(request.url).searchParams.get("bbox") ?? "").split(",").map(Number);
  const [w, s, e, n] = bbox;
  if (
    bbox.length !== 4 ||
    bbox.some((v) => !Number.isFinite(v)) ||
    w! >= e! ||
    s! >= n! ||
    bboxAreaKm2(bbox as BBox) > 5000
  ) {
    return NextResponse.json({ error: "Invalid or too-large bbox." }, { status: 400 });
  }

  const fetchedAt = new Date().toISOString();
  const key = tomtomKey();
  if (!key) return NextResponse.json<IncidentsResponse>({ incidents: [], isLive: false, fetchedAt });

  try {
    return NextResponse.json<IncidentsResponse>({
      incidents: await incidentsInBbox(bbox as BBox, key),
      isLive: true,
      fetchedAt,
    });
  } catch (error) {
    console.error("[fleet/incidents] TomTom incidents failed:", error);
    return NextResponse.json<IncidentsResponse>({ incidents: [], isLive: false, fetchedAt });
  }
}
