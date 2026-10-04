"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
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

function FullscreenIcon({ exit }: { exit: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      {exit ? (
        <path
          d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
        />
      ) : (
        <path
          d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
        />
      )}
    </svg>
  );
}

function Legend() {
  return (
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
  );
}

/**
 * Fullscreen for the map panel. Uses the browser Fullscreen API where
 * available; otherwise (e.g. iPhone Safari) falls back to filling the
 * window with a fixed overlay. Esc exits either way.
 */
function useMapFullscreen(ref: RefObject<HTMLDivElement | null>) {
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [overlay, setOverlay] = useState(false);

  useEffect(() => {
    function sync() {
      setNativeFullscreen(document.fullscreenElement === ref.current);
    }
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, [ref]);

  useEffect(() => {
    if (!overlay) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOverlay(false);
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [overlay]);

  const toggle = useCallback(async () => {
    if (nativeFullscreen) {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    if (overlay) {
      setOverlay(false);
      return;
    }
    const el = ref.current;
    if (el && document.fullscreenEnabled && el.requestFullscreen) {
      try {
        await el.requestFullscreen();
        return;
      } catch {
        // Fall through to the overlay fallback.
      }
    }
    setOverlay(true);
  }, [nativeFullscreen, overlay, ref]);

  return { isFullscreen: nativeFullscreen || overlay, overlay, toggle };
}

/**
 * A DOM node for the map panel that can move between its inline slot and
 * document.body. The overlay fallback has to live outside the page: the
 * fade-up animation leaves a transform on an ancestor and <main> is its
 * own stacking context under the header — either one traps a
 * `position: fixed` child. Moving the node (instead of remounting through
 * a conditional portal) keeps the Leaflet map and its zoom intact.
 */
function useMovableHost(slot: RefObject<HTMLDivElement | null>, detached: boolean) {
  // Null during SSR. A portal renders nothing in its parent's markup, so
  // creating it on the client's first render doesn't break hydration.
  const [host] = useState(() =>
    typeof document === "undefined" ? null : document.createElement("div"),
  );

  useEffect(() => {
    if (!host) return;
    const parent = detached ? document.body : slot.current;
    parent?.appendChild(host);
    return () => host.remove();
  }, [host, detached, slot]);

  return host;
}

export function FleetDashboard() {
  const { routes, toggleRoute, gasPrice } = useRoutes();
  const [filter, setFilter] = useState<RouteFilter>("all");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>("r1");
  const mapPanelRef = useRef<HTMLDivElement>(null);
  const mapSlotRef = useRef<HTMLDivElement>(null);
  const fullscreen = useMapFullscreen(mapPanelRef);
  const mapHost = useMovableHost(mapSlotRef, fullscreen.overlay);

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
        <Legend />
      </div>

      {/* Map — full width and as tall as the viewport allows. Rendered into
          a movable host so the overlay fallback can escape to <body>. */}
      <div ref={mapSlotRef} />
      {mapHost &&
        createPortal(
          <div
            ref={mapPanelRef}
            className={`overflow-hidden bg-surface-2 ${
              fullscreen.overlay
                ? "fixed inset-0 z-[2000]"
                : fullscreen.isFullscreen
                  ? "relative h-full w-full"
                  : "relative h-[70vh] min-h-[26rem] border border-line lg:h-[calc(100vh-15rem)] lg:min-h-[36rem]"
            }`}
          >
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

            <div className="pointer-events-none absolute top-3 right-3 z-[1000] flex items-start gap-2">
              {fullscreen.isFullscreen && selectedRoute ? (
                <p className="pointer-events-auto border border-line bg-white/95 px-3 py-2 text-sm text-ink shadow-sm">
                  <span className="font-semibold">{selectedRoute.name}</span>
                  <span className="text-slate/60">
                    {" "}
                    · {selectedRoute.distance.toFixed(1)} km · {selectedRoute.duration.toFixed(0)}{" "}
                    min
                  </span>
                </p>
              ) : null}
              <button
                type="button"
                onClick={fullscreen.toggle}
                aria-pressed={fullscreen.isFullscreen}
                aria-label={fullscreen.isFullscreen ? "Exit full screen" : "View map full screen"}
                title={fullscreen.isFullscreen ? "Exit full screen (Esc)" : "Full screen"}
                className="pointer-events-auto inline-flex h-10 items-center gap-2 border border-line bg-white/95 px-3 text-sm font-medium text-ink shadow-sm transition-colors hover:border-accent/50 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <FullscreenIcon exit={fullscreen.isFullscreen} />
                <span className="hidden sm:inline">
                  {fullscreen.isFullscreen ? "Exit full screen" : "Full screen"}
                </span>
              </button>
            </div>

            {fullscreen.isFullscreen ? (
              <div className="absolute bottom-6 left-3 z-[1000] border border-line bg-white/95 px-3 py-2 text-sm text-slate/70 shadow-sm">
                <Legend />
              </div>
            ) : null}
          </div>,
          mapHost,
        )}

      {/* Route list + details, side by side under the map. */}
      {routes ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="lg:max-h-[32rem] lg:min-h-0 lg:[&>aside]:h-full">
            <RouteSidebar
              routes={routes}
              filter={filter}
              selected={selected}
              onFilterChange={setFilter}
              onSelect={setSelected}
              onToggle={toggleRoute}
            />
          </div>
          <div className="lg:max-h-[32rem] lg:min-h-0 lg:[&>aside]:h-full">
            <RouteDetailPanel
              routes={routes}
              selectedRoute={selectedRoute}
              totalRouteCounts={totalRouteCounts}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
