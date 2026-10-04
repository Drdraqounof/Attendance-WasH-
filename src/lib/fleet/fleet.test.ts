import { afterEach, describe, expect, it, vi } from "vitest";
import { NODES } from "./nodes";
import { fetchRouteGeometry, haversineKm, OSRM_TIMEOUT_MS } from "./osrm";
import { ROUTE_DEFINITIONS } from "./routes";
import { inefficiencyFactor, KM_TO_MILES, TRUCK_MPG, truckFuelCost } from "./theme";

// Fixed points so the routing tests don't move when demo nodes change.
const SOUTH_END: [number, number] = [42.3388, -71.0784];
const SEAPORT: [number, number] = [42.352, -71.041];

describe("fleet — cost math", () => {
  it("prices truck fuel from distance, mpg and gas price", () => {
    // 100 km ≈ 62.14 mi ÷ 14 mpg ≈ 4.44 gal × $3.50 ≈ $15.53
    expect(truckFuelCost(100, 3.5)).toBeCloseTo(((100 * KM_TO_MILES) / TRUCK_MPG) * 3.5, 6);
    expect(truckFuelCost(100, 3.5)).toBeCloseTo(15.53, 2);
    expect(truckFuelCost(0, 3.5)).toBe(0);
  });

  it("uses a fixed inefficiency factor per route type", () => {
    expect(inefficiencyFactor("truck")).toBe(0.35);
    expect(inefficiencyFactor("bike")).toBe(0.3);
  });
});

describe("fleet — demo data", () => {
  it("only references stops that exist", () => {
    for (const route of ROUTE_DEFINITIONS) {
      for (const stop of route.stops) expect(NODES[stop], `${route.id}: ${stop}`).toBeDefined();
    }
  });

  it("places the depot at the real Lynn plant", () => {
    expect(NODES.wcl_lynn).toMatchObject({ type: "depot", lat: 42.4531, lng: -70.9615 });
  });
});

describe("fleet — OSRM routing", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("measures straight-line distance with haversine", () => {
    expect(haversineKm(SOUTH_END, SEAPORT)).toBeCloseTo(3.4, 1);
  });

  it("falls back to straight lines when OSRM is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await fetchRouteGeometry("truck", [SOUTH_END, SEAPORT]);
    expect(result.isFallback).toBe(true);
    expect(result.geometry).toEqual([SOUTH_END, SEAPORT]);
    expect(result.distanceKm).toBeCloseTo(haversineKm(SOUTH_END, SEAPORT), 6);
    expect(result.durationMin).toBeCloseTo((result.distanceKm / 25) * 60, 6);
  });

  it("falls back when OSRM hangs past the timeout", async () => {
    // Fake timers don't drive AbortSignal.timeout, so hand out a signal we abort ourselves.
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
          }),
      ),
    );
    try {
      const pending = fetchRouteGeometry("truck", [SOUTH_END, SEAPORT]);
      expect(timeout).toHaveBeenCalledWith(OSRM_TIMEOUT_MS);
      controller.abort(new DOMException("timed out", "TimeoutError"));
      const result = await pending;
      expect(result.isFallback).toBe(true);
      expect(result.geometry).toEqual([SOUTH_END, SEAPORT]);
    } finally {
      timeout.mockRestore();
    }
  });

  it("uses OSRM geometry (converted to [lat, lng]) when available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          routes: [
            {
              distance: 4200,
              duration: 600,
              geometry: { coordinates: [[SOUTH_END[1], SOUTH_END[0]], [SEAPORT[1], SEAPORT[0]]] },
            },
          ],
        }),
      }),
    );
    const result = await fetchRouteGeometry("bike", [SOUTH_END, SEAPORT]);
    expect(result).toEqual({
      distanceKm: 4.2,
      durationMin: 10,
      geometry: [SOUTH_END, SEAPORT],
      isFallback: false,
    });
  });
});
