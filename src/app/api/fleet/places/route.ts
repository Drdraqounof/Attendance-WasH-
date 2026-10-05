import { NextResponse } from "next/server";
import { searchPlaces, tomtomKey } from "@/lib/fleet/tomtom";
import type { PlacesResponse } from "@/lib/fleet/types";
import { requireApiSession } from "@/lib/session";

/**
 * GET ?q=burger king -> up to 8 places near Boston from TomTom Search,
 * for "Plan a trip" on /map. Any signed-in workspace (HR or
 * Supervisor, every station). With no TOM_TOM_API_KEY, or on any TomTom error,
 * returns no places with `isLive: false`. See LIVE_ROUTING_PLAN.md.
 */
export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if (session instanceof NextResponse) return session;

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3 || q.length > 100) {
    return NextResponse.json({ error: "Search needs 3–100 characters." }, { status: 400 });
  }

  const key = tomtomKey();
  if (!key) return NextResponse.json<PlacesResponse>({ places: [], isLive: false });

  try {
    return NextResponse.json<PlacesResponse>({ places: await searchPlaces(q, key), isLive: true });
  } catch (error) {
    console.error("[fleet/places] TomTom search failed:", error);
    return NextResponse.json<PlacesResponse>({ places: [], isLive: false });
  }
}
