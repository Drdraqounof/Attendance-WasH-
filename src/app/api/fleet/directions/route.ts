import { NextResponse } from "next/server";
import { NODES } from "@/lib/fleet/nodes";
import { fetchAlternatives } from "@/lib/fleet/osrm";
import { originNodesForScope } from "@/lib/fleet/scoped-routes";
import {
  attachBlockers,
  bboxOf,
  incidentsInBbox,
  routeOptions,
  tomtomKey,
} from "@/lib/fleet/tomtom";
import type { DirectionsResponse, Incident } from "@/lib/fleet/types";
import { requireApiSession } from "@/lib/session";

/**
 * GET ?from=<nodeId>&to=<lat>,<lng>&mode=truck|bike -> up to 3 route
 * options with live-traffic ETAs, the fastest flagged, and the live
 * incidents (accidents, closures, jams…) on each as `blockers`.
 * `from` must be a depot/hub on one of the viewer's routes. Falls back
 * to OSRM alternatives (`isLive: false`, no traffic or blockers) when
 * TomTom is unavailable. See LIVE_ROUTING_PLAN.md.
 */
export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if (session instanceof NextResponse) return session;

  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? "";
  if (!originNodesForScope(session.scope).includes(from)) {
    return NextResponse.json({ error: "Unknown or out-of-scope origin." }, { status: 403 });
  }
  const to = (params.get("to") ?? "").split(",").map(Number);
  const [lat, lng] = to;
  if (
    to.length !== 2 ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat!) > 90 ||
    Math.abs(lng!) > 180
  ) {
    return NextResponse.json({ error: "`to` must be lat,lng." }, { status: 400 });
  }
  const mode = params.get("mode") === "bike" ? "bike" : "truck";

  const node = NODES[from]!;
  const origin: [number, number] = [node.lat, node.lng];
  const dest: [number, number] = [lat!, lng!];
  const fetchedAt = new Date().toISOString();

  const key = tomtomKey();
  if (key) {
    try {
      const options = await routeOptions(origin, dest, mode, key);
      if (options.length === 0) throw new Error("TomTom returned no routes");
      // Blockers are best-effort: routes still show if incidents fail.
      let incidents: Incident[] = [];
      try {
        incidents = await incidentsInBbox(bboxOf(options.flatMap((o) => o.geometry), 0.01), key);
      } catch (error) {
        console.error("[fleet/directions] TomTom incidents failed:", error);
      }
      return NextResponse.json<DirectionsResponse>({
        options: attachBlockers(options, incidents),
        isLive: true,
        fetchedAt,
      });
    } catch (error) {
      console.error("[fleet/directions] TomTom routing failed:", error);
    }
  }

  return NextResponse.json<DirectionsResponse>({
    options: await fetchAlternatives(origin, dest),
    isLive: false,
    fetchedAt,
  });
}
