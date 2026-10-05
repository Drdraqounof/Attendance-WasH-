"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LIVE_REFRESH_MS } from "@/lib/fleet/theme";
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
 * and refresh every LIVE_REFRESH_MS while the tab is visible. See
 * LIVE_ROUTING_PLAN.md.
 */

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
  const res = await fetch(url, { signal: signal ?? AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
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
      setData(await getJson<IncidentsResponse>(`/api/fleet/incidents?bbox=${key}`));
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
      setData(await getJson<DirectionsResponse>(url));
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
