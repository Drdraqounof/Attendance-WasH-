"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ROUTE_DEFINITIONS } from "@/lib/fleet/routes";
import { RouteDetailPanel } from "./route-detail-panel";
import { RouteSidebar, type RouteFilter } from "./route-sidebar";
import { useRoutes } from "./use-routes";

// Leaflet needs `window` — render the map on the client only.
const FleetMap = dynamic(() => import("./fleet-map"), {
  ssr: false,
  loading: () => <MapPlaceholder label="Loading map…" />,
});

function MapPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-surface-2/60 text-sm text-slate/60">
      {label}
    </div>
  );
}

export function FleetDashboard() {
  const { routes, toggleRoute, gasPrice } = useRoutes();
  const [filter, setFilter] = useState<RouteFilter>("all");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>("r1");

  const totalRouteCounts = useMemo(
    () => ({
      truck: ROUTE_DEFINITIONS.filter((r) => r.type === "truck").length,
      bike: ROUTE_DEFINITIONS.filter((r) => r.type === "bike").length,
    }),
    [],
  );

  const visibleRoutes = routes?.filter((r) => r.active && (filter === "all" || r.type === filter)) ?? [];
  const selectedRoute = routes?.find((r) => r.id === selected);

  return (
    <div className="animate-fade-up-delay-1 mt-6">
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate/65">
        {gasPrice && (
          <span
            title={
              gasPrice.isFallback
                ? "Live gas price unavailable — using a fixed estimate"
                : `EIA New England average, week of ${gasPrice.period}`
            }
          >
            Gas (New England avg):{" "}
            <span className="font-display font-semibold tabular-nums text-ink">
              ${gasPrice.pricePerGallon.toFixed(2)}/gal
            </span>
            {gasPrice.isFallback && <span className="ml-1 text-slate/50">≈ estimate</span>}
          </span>
        )}
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 bg-accent-deep" aria-hidden />
            Truck routes
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-4 border-t-2 border-dashed border-danger-soft" aria-hidden />
            Bike routes
          </span>
        </span>
      </div>

      <div className="grid gap-4 lg:h-[calc(100vh-17rem)] lg:min-h-[32rem] lg:grid-cols-[18rem_minmax(0,1fr)_19rem]">
        <div className="order-1 h-[55vh] min-h-80 overflow-hidden border border-line lg:order-2 lg:h-auto">
          {routes ? (
            <FleetMap
              routes={visibleRoutes}
              hovered={hovered}
              selected={selected}
              onHover={setHovered}
              onSelect={setSelected}
            />
          ) : (
            <MapPlaceholder label="Loading routes…" />
          )}
        </div>

        <div className="order-2 min-h-0 lg:order-1">
          {routes ? (
            <RouteSidebar
              routes={routes}
              filter={filter}
              selected={selected}
              onFilterChange={setFilter}
              onSelect={setSelected}
              onToggle={toggleRoute}
            />
          ) : null}
        </div>

        <div className="order-3 min-h-0">
          {routes ? (
            <RouteDetailPanel
              routes={routes}
              selectedRoute={selectedRoute}
              totalRouteCounts={totalRouteCounts}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
