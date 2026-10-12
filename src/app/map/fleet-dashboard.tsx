"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { NODES } from "@/lib/fleet/nodes";
import type { PlaceResult, RouteType, ScopedRouteDefinition } from "@/lib/fleet/types";
import { RouteDetailPanel } from "./route-detail-panel";
import { RouteSidebar, type RouteFilter } from "./route-sidebar";
import { formatTime, TripControls, TripDetail } from "./trip-planner";
import { useIncidents, usePlaceSearch, useTrip, type BBox } from "./use-live";
import { useRoutes } from "./use-routes";

type MapMode = "fleet" | "trip";

const MODE_LABELS: Record<MapMode, string> = {
  fleet: "Fleet routes",
  trip: "Plan a trip",
};

/** Every node, padded ~3 km — the default live-incidents area. */
function nodesBbox(extra: [number, number][] = []): BBox {
  const points: [number, number][] = [
    ...Object.values(NODES).map((n): [number, number] => [n.lat, n.lng]),
    ...extra,
  ];
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const pad = 0.03;
  return [
    Math.min(...lngs) - pad,
    Math.min(...lats) - pad,
    Math.max(...lngs) + pad,
    Math.max(...lats) + pad,
  ];
}

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

function Legend({ mode }: { mode: MapMode }) {
  if (mode === "trip") {
    return (
      <span className="flex flex-wrap items-center gap-4">
        <span className="flex items-center gap-2">
          <span className="inline-block h-1 w-4 bg-accent-deep" aria-hidden />
          Selected route
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-1 w-4 bg-slate/35" aria-hidden />
          Alternates
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-1 w-4 bg-[#c2410c]" aria-hidden />
          Slow traffic
        </span>
      </span>
    );
  }
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

export function FleetDashboard({
  definitions,
  origins,
  noRoutesNote,
}: {
  definitions: ScopedRouteDefinition[];
  /** Depots/hubs the viewer may plan trips from (originNodesForScope). */
  origins: string[];
  /** Shown in Fleet routes mode when this station has no routes. */
  noRoutesNote: string;
}) {
  const { routes, toggleRoute, gasPrice } = useRoutes(definitions);
  const hasRoutes = definitions.length > 0;
  // Stations without fleet routes land on the part of the map they can use.
  const [mode, setMode] = useState<MapMode>(hasRoutes ? "fleet" : "trip");
  const [showIncidents, setShowIncidents] = useState(true);
  const [tripOrigin, setTripOrigin] = useState(
    origins.includes("wcl_lynn") ? "wcl_lynn" : (origins[0] ?? ""),
  );
  const [tripMode, setTripMode] = useState<RouteType>("truck");
  const [destination, setDestination] = useState<PlaceResult | null>(null);
  const [chosenOption, setChosenOption] = useState<string | null>(null);
  const search = usePlaceSearch();
  const trip = useTrip(tripOrigin, destination, tripMode);
  const tripOptions = useMemo(() => trip.data?.options ?? [], [trip.data]);
  // Keep the user's pick across refreshes; otherwise default to the fastest.
  const selectedOptionId =
    tripOptions.find((o) => o.id === chosenOption)?.id ??
    tripOptions.find((o) => o.isFastest)?.id ??
    null;
  const selectedOption = tripOptions.find((o) => o.id === selectedOptionId);

  const incidentsBbox = useMemo(
    () => nodesBbox(mode === "trip" && destination ? [[destination.lat, destination.lng]] : []),
    [mode, destination],
  );
  const incidents = useIncidents(incidentsBbox, showIncidents);
  const accidentCount =
    incidents.data?.incidents.filter((i) => i.kind === "accident").length ?? 0;

  function chooseDestination(place: PlaceResult | null) {
    setDestination(place);
    setChosenOption(null);
    if (!place) search.setQuery("");
  }
  const [filter, setFilter] = useState<RouteFilter>("all");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(definitions[0]?.id ?? null);
  const mapPanelRef = useRef<HTMLDivElement>(null);
  const mapSlotRef = useRef<HTMLDivElement>(null);
  const fullscreen = useMapFullscreen(mapPanelRef);
  const mapHost = useMovableHost(mapSlotRef, fullscreen.overlay);

  const totalRouteCounts = useMemo(
    () => ({
      truck: definitions.filter((r) => r.type === "truck").length,
      bike: definitions.filter((r) => r.type === "bike").length,
    }),
    [definitions],
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
        <Legend mode={mode} />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-px border border-line bg-line" role="tablist" aria-label="Map mode">
          {(["fleet", "trip"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                mode === m ? "bg-ink text-white" : "bg-white/90 text-slate/70 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate/65">
          {showIncidents && incidents.data && (
            <span aria-live="polite">
              {incidents.data.isLive ? (
                <>
                  <span
                    className={accidentCount > 0 ? "font-semibold text-[#b91c1c]" : "font-semibold text-ink"}
                  >
                    {accidentCount} {accidentCount === 1 ? "accident" : "accidents"}
                  </span>
                  {" · "}
                  {incidents.data.incidents.length} live incidents · updated{" "}
                  {formatTime(incidents.data.fetchedAt)}
                </>
              ) : (
                "Live incidents unavailable"
              )}
            </span>
          )}
          <label className="flex cursor-pointer items-center gap-2 font-medium text-ink">
            <input
              type="checkbox"
              checked={showIncidents}
              onChange={(e) => setShowIncidents(e.target.checked)}
              className="h-4 w-4 accent-[#0f766e]"
            />
            Live incidents
          </label>
        </div>
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
                routes={mode === "fleet" ? visibleRoutes : []}
                hovered={hovered}
                selected={mode === "fleet" ? selected : null}
                onHover={setHovered}
                onSelect={setSelected}
                incidents={showIncidents ? (incidents.data?.incidents ?? []) : []}
                trip={
                  mode === "trip" && destination
                    ? {
                        options: tripOptions,
                        selectedId: selectedOptionId,
                        destination,
                        onSelect: setChosenOption,
                      }
                    : undefined
                }
              />
            ) : (
              <MapPlaceholder label="Loading routes…" />
            )}

            <div className="pointer-events-none absolute top-3 right-3 z-[1000] flex items-start gap-2">
              {fullscreen.isFullscreen && mode === "trip" && selectedOption && destination ? (
                <p className="pointer-events-auto border border-line bg-white/95 px-3 py-2 text-sm text-ink shadow-sm">
                  <span className="font-semibold">To {destination.name}</span>
                  <span className="text-slate/60">
                    {" "}
                    · {Math.round(selectedOption.durationMin)} min ·{" "}
                    {selectedOption.blockers.length} blockers
                  </span>
                </p>
              ) : fullscreen.isFullscreen && mode === "fleet" && selectedRoute ? (
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
                <Legend mode={mode} />
              </div>
            ) : null}
          </div>,
          mapHost,
        )}

      {/* Route list + details, side by side under the map. */}
      {mode === "trip" ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="lg:max-h-[36rem] lg:min-h-0 lg:[&>aside]:h-full">
            <TripControls
              origins={origins}
              origin={tripOrigin}
              onOriginChange={(id) => {
                setTripOrigin(id);
                setChosenOption(null);
              }}
              mode={tripMode}
              onModeChange={(m) => {
                setTripMode(m);
                setChosenOption(null);
              }}
              search={search}
              destination={destination}
              onDestinationChange={chooseDestination}
              trip={trip}
              selectedOption={selectedOptionId}
              onSelectOption={setChosenOption}
            />
          </div>
          <div className="lg:max-h-[36rem] lg:min-h-0 lg:[&>aside]:h-full">
            <TripDetail
              option={selectedOption}
              destination={destination}
              isLive={trip.data?.isLive ?? false}
            />
          </div>
        </div>
      ) : !hasRoutes ? (
        <p className="mt-4 border border-line bg-white/70 px-5 py-4 text-sm leading-relaxed text-slate/70">
          {noRoutesNote}
        </p>
      ) : routes ? (
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
