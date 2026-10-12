"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LIVE_REFRESH_MS } from "@/lib/fleet/theme";
import { createLogger, elapsedMs, now } from "@/lib/log";
import type {
  DirectionsResponse,
  IncidentsResponse,
  PlaceResult,
  PlacesResponse,
  RouteType,
} from "@/lib/fleet/types";

/**
 * Client hooks for live data on /map: the incidents layer and "Plan a
 * trip". Both call the /api/fleet/* routes (which hold the TomTom key)
 * and refresh every LIVE_REFRESH_MS while the tab is visible. Failures
 * and fallbacks are logged to the browser console as `[map/live]`, with
 * the server's request id to match against server logs. See
 * docs/operations/logging.md.
 */

const log = createLogger("map/live");

/** Fallback reasons already logged, so a 2-minute refresh doesn't repeat them. */
const loggedFallbacks = new Set<string>();

function noteFallback(what: string, data: { isLive: boolean; fallbackReason?: string }) {
  const key = `${what}:${data.fallbackReason ?? "unknown"}`;
  if (data.isLive) {
    // Recovered: allow the same reason to be logged again later.
    for (const k of [...loggedFallbacks]) if (k.startsWith(`${what}:`)) loggedFallbacks.delete(k);
    return;
  }
  if (loggedFallbacks.has(key)) return;
  loggedFallbacks.add(key);
  log.warn(`${what}: live data unavailable — showing fallback`, { reason: data.fallbackReason });
}

/** Runs `fn` every LIVE_REFRESH_MS while enabled and the tab is visible. */
function useVisibleInterval(fn: () => void, enabled: boolean) {
  const saved = useRef(fn);
  useEffect(() => {
    saved.current = fn;
  }, [fn]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") saved.current();
    }, LIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, [enabled]);
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const start = now();
  const path = url.split("?")[0];
  let res: Response;
  try {
    res = await fetch(url, { signal: signal ?? AbortSignal.timeout(20000) });
  } catch (error) {
    if (!(error instanceof Error && error.name === "AbortError")) {
      log.error(`${path} request failed`, { ms: elapsedMs(start), error });
    }
    throw error;
  }
  const requestId = res.headers.get("x-request-id") ?? undefined;
  if (!res.ok) {
    let detail: string | undefined;
    try {
      detail = ((await res.json()) as { error?: string }).error;
    } catch {
      // Non-JSON error body.
    }
    log.error(`${path} returned ${res.status}`, { requestId, detail, ms: elapsedMs(start) });
    throw new Error(`${path} ${res.status}`);
  }
  log.debug(`${path} ok`, { requestId, ms: elapsedMs(start) });
  return res.json();
}

/** [west, south, east, north] */
export type BBox = [number, number, number, number];

export function useIncidents(bbox: BBox, enabled: boolean) {
  const [data, setData] = useState<IncidentsResponse | null>(null);
  const [error, setError] = useState(false);
  const key = bbox.map((v) => v.toFixed(3)).join(",");

  const load = useCallback(async () => {
    try {
      const result = await getJson<IncidentsResponse>(`/api/fleet/incidents?bbox=${key}`);
      noteFallback("incidents", result);
      setData(result);
      setError(false);
    } catch {
      setError(true);
    }
  }, [key]);

  useEffect(() => {
    // Fetch when switched on or when the area changes; state updates land after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (enabled) void load();
  }, [enabled, load]);
  useVisibleInterval(load, enabled);

  return { data: enabled ? data : null, error, refresh: load };
}

export function usePlaceSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "unavailable" | "error">(
    "idle",
  );

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const data = await getJson<PlacesResponse>(
          `/api/fleet/places?q=${encodeURIComponent(q)}`,
          controller.signal,
        );
        noteFallback("place search", data);
        setResults(data.places);
        setStatus(data.isLive ? "done" : "unavailable");
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { query, setQuery, results, status };
}

export function useTrip(origin: string, destination: PlaceResult | null, mode: RouteType) {
  const [data, setData] = useState<DirectionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!destination) return;
    setLoading(true);
    try {
      const url =
        `/api/fleet/directions?from=${encodeURIComponent(origin)}` +
        `&to=${destination.lat},${destination.lng}&mode=${mode}`;
      const result = await getJson<DirectionsResponse>(url);
      noteFallback("directions", result);
      setData(result);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [origin, destination, mode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    void load();
  }, [load]);
  useVisibleInterval(load, destination !== null);

  return { data: destination ? data : null, loading, error, refresh: load };
}
