import { NextResponse } from "next/server";
import { fallbackReason, startRequest } from "@/lib/fleet/api-log";
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
 * `from` must be the Lynn plant or a depot/hub on one of the viewer's
 * routes (originNodesForScope). Falls back to OSRM alternatives
 * (`isLive: false`, no traffic or blockers, with a `fallbackReason`)
 * when TomTom is unavailable. Logged per request (see
 * docs/operations/logging.md).
 */
export async function GET(request: Request) {
  const req = startRequest("fleet/directions", request);
  const session = await requireApiSession(request);
  if (session instanceof NextResponse) {
    req.log.warn("not signed in or no workspace", { status: session.status });
    return session;
  }

  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? "";
  const allowed = originNodesForScope(session.scope);
  if (!allowed.includes(from)) {
    return req.respond(
      { error: "Unknown or out-of-scope origin." },
      {
        status: 403,
        fields: {
          from,
          allowed,
          role: session.active.role,
          station: session.active.station?.name ?? "all",
        },
      },
    );
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
    return req.respond(
      { error: "`to` must be lat,lng." },
      { status: 400, fields: { to: params.get("to") } },
    );
  }
  const mode = params.get("mode") === "bike" ? "bike" : "truck";

  const node = NODES[from]!;
  const origin: [number, number] = [node.lat, node.lng];
  const dest: [number, number] = [lat!, lng!];
  const fetchedAt = new Date().toISOString();
  const summary = { from, mode };

  const key = tomtomKey();
  let reason = "no_key";
  if (!key) {
    req.log.warn("TOM_TOM_API_KEY is not set — using OSRM free-flow routes");
  } else {
    try {
      const options = await routeOptions(origin, dest, mode, key);
      if (options.length === 0) throw new Error("TomTom returned no routes");
      // Blockers are best-effort: routes still show if incidents fail.
      let incidents: Incident[] = [];
      let incidentsOk = true;
      try {
        incidents = await incidentsInBbox(bboxOf(options.flatMap((o) => o.geometry), 0.01), key);
      } catch (error) {
        incidentsOk = false;
        req.log.warn("TomTom incidents failed — routes shown without blockers", {
          reason: fallbackReason(error),
          error,
        });
      }
      const withBlockers = attachBlockers(options, incidents);
      return req.respond<DirectionsResponse>(
        { options: withBlockers, isLive: true, fetchedAt },
        {
          fields: {
            ...summary,
            options: withBlockers.length,
            fastestMin: Math.round(Math.min(...withBlockers.map((o) => o.durationMin))),
            areaIncidents: incidents.length,
            blockers: withBlockers.map((o) => o.blockers.length),
            incidentsOk,
          },
        },
      );
    } catch (error) {
      reason = fallbackReason(error);
      req.log.error("TomTom routing failed — using OSRM free-flow routes", {
        ...summary,
        reason,
        error,
      });
    }
  }

  const options = await fetchAlternatives(origin, dest);
  return req.respond<DirectionsResponse>(
    { options, isLive: false, fetchedAt, fallbackReason: reason },
    { fields: { ...summary, options: options.length, fallback: "osrm", reason } },
  );
}
