"use client";

import { useEffect, useState } from "react";
import { NODES } from "@/lib/fleet/nodes";
import { fetchRouteGeometry } from "@/lib/fleet/osrm";
import { ROUTE_DEFINITIONS } from "@/lib/fleet/routes";
import {
  FALLBACK_GAS_PRICE_PER_GALLON,
  inefficiencyFactor,
  TRUCK_CO2_PER_KM,
  truckFuelCost,
} from "@/lib/fleet/theme";
import type { GasPriceResponse, Route } from "@/lib/fleet/types";

function toCoords(stops: string[]): [number, number][] {
  return stops.filter((s) => NODES[s]).map((s) => [NODES[s].lat, NODES[s].lng]);
}

async function loadGasPrice(): Promise<GasPriceResponse> {
  try {
    const res = await fetch("/api/gas-price");
    if (!res.ok) throw new Error(`gas-price ${res.status}`);
    return await res.json();
  } catch {
    return { pricePerGallon: FALLBACK_GAS_PRICE_PER_GALLON, period: null, isFallback: true };
  }
}

/**
 * Loads the gas price, then routes every demo route through OSRM and
 * derives distance / duration / fuel / CO₂ / "vs. unoptimized" savings.
 * Toggling a route is a per-viewer view filter only — nothing is saved.
 */
export function useRoutes() {
  const [routes, setRoutes] = useState<Route[] | null>(null);
  const [gasPrice, setGasPrice] = useState<GasPriceResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const price = await loadGasPrice();
      if (cancelled) return;
      setGasPrice(price);

      const withMetrics = await Promise.all(
        ROUTE_DEFINITIONS.map(async (def): Promise<Route> => {
          const result = await fetchRouteGeometry(def.type, toCoords(def.stops));
          const factor = inefficiencyFactor(def.type);
          const fuelCost =
            def.type === "truck" ? truckFuelCost(result.distanceKm, price.pricePerGallon) : 0;
          const co2 = def.type === "truck" ? result.distanceKm * TRUCK_CO2_PER_KM : 0;

          return {
            ...def,
            distance: result.distanceKm,
            duration: result.durationMin,
            fuelCost,
            co2,
            geometry: result.geometry,
            isFallbackGeometry: result.isFallback,
            savings: {
              time: result.durationMin * factor,
              fuel: fuelCost * factor,
              co2: co2 * factor,
            },
          };
        }),
      );
      if (!cancelled) setRoutes(withMetrics);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleRoute(id: string) {
    setRoutes((rs) => rs?.map((r) => (r.id === id ? { ...r, active: !r.active } : r)) ?? rs);
  }

  return { routes, toggleRoute, gasPrice };
}
