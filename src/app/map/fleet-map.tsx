"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { BOSTON_CENTER, NODES } from "@/lib/fleet/nodes";
import { INCIDENT_PRIORITY, INCIDENT_STYLE, ROUTE_COLOR } from "@/lib/fleet/theme";
import type { Incident, NodeType, PlaceResult, Route, RouteOption } from "@/lib/fleet/types";

/**
 * Leaflet map for /map. Browser-only (Leaflet touches `window`), so
 * fleet-dashboard.tsx loads it via next/dynamic with ssr: false.
 */

const NODE_COLOR: Record<NodeType, string> = {
  depot: "#0f1c24", // --ink
  hub: "#0d9488", // --accent
  stop: "#ffffff",
};

function nodeIcon(type: NodeType, inSelectedRoute: boolean, isHovered: boolean) {
  const color = NODE_COLOR[type];
  const size = type === "depot" ? 16 : type === "hub" ? 14 : inSelectedRoute ? 12 : 10;
  const ring = isHovered
    ? "2px solid #0f766e"
    : inSelectedRoute
      ? "2px solid #0f1c24"
      : "1.5px solid #1a2b36";
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:${ring};box-shadow:0 1px 3px rgba(15,28,36,0.35);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const ALL_NODE_POINTS: [number, number][] = Object.values(NODES).map((n) => [n.lat, n.lng]);

/** Zooms to `points` whenever `focusKey` changes (not on every refresh). */
function FitBounds({ points, focusKey }: { points: [number, number][]; focusKey: string }) {
  const map = useMap();
  const latest = useRef(points);
  useEffect(() => {
    latest.current = points;
  }, [points]);

  useEffect(() => {
    const bounds = L.latLngBounds(latest.current.length ? latest.current : ALL_NODE_POINTS);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, focusKey]);

  return null;
}

const incidentIcons = new Map<string, L.DivIcon>();

/** Square badge per incident kind; cached so refreshes don't rebuild icons. */
function incidentIcon(incident: Incident, onRoute: boolean): L.DivIcon {
  const cacheKey = `${incident.kind}-${onRoute}`;
  const cached = incidentIcons.get(cacheKey);
  if (cached) return cached;
  const { color, glyph } = INCIDENT_STYLE[incident.kind];
  const size = onRoute || incident.kind === "accident" ? 22 : 16;
  const icon = L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font:700 ${size - 8}px/1 system-ui,sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(15,28,36,0.45);">${glyph}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  incidentIcons.set(cacheKey, icon);
  return icon;
}

const destinationIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:9999px 9999px 9999px 0;transform:rotate(-45deg);background:#0d9488;border:2px solid #fff;box-shadow:0 1px 4px rgba(15,28,36,0.45);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 18],
});

export type TripLayer = {
  options: RouteOption[];
  selectedId: string | null;
  destination: PlaceResult;
  onSelect: (id: string) => void;
};

/**
 * Leaflet caches its container size, so after the panel grows (full
 * screen, window resize) it would leave grey, unloaded tiles. Re-measure
 * whenever the container's size changes.
 */
function ResizeWatcher() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

export default function FleetMap({
  routes,
  hovered,
  selected,
  onHover,
  onSelect,
  incidents = [],
  trip,
}: {
  routes: Route[];
  hovered: string | null;
  selected: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  /** Live incidents layer; empty when switched off. */
  incidents?: Incident[];
  /** "Plan a trip" mode: draws route options instead of fleet routes. */
  trip?: TripLayer;
}) {
  const selectedRoute = routes.find((r) => r.id === selected);
  const selectedStops = useMemo(() => new Set(selectedRoute?.stops ?? []), [selectedRoute]);
  const selectedOption = trip?.options.find((o) => o.id === trip.selectedId);
  const blockerIds = useMemo(
    () => new Set(selectedOption?.blockers.map((b) => b.id) ?? []),
    [selectedOption],
  );
  // The selected option's blockers always show, even with the layer off.
  const shownIncidents = useMemo(() => {
    const byId = new Map(incidents.map((i) => [i.id, i]));
    for (const b of selectedOption?.blockers ?? []) byId.set(b.id, b);
    // Most serious drawn last, so it sits on top.
    return [...byId.values()].sort(
      (a, b) => INCIDENT_PRIORITY.indexOf(b.kind) - INCIDENT_PRIORITY.indexOf(a.kind),
    );
  }, [incidents, selectedOption]);

  const focusPoints: [number, number][] = trip
    ? [
        ...(selectedOption?.geometry ?? trip.options.flatMap((o) => o.geometry)),
        [trip.destination.lat, trip.destination.lng],
      ]
    : (selectedRoute?.geometry ?? ALL_NODE_POINTS);
  const focusKey = trip
    ? `trip:${trip.destination.id}:${trip.options.length > 0}:${trip.selectedId}`
    : `fleet:${selectedRoute?.id ?? "all"}:${selectedRoute?.geometry.length ?? 0}`;

  return (
    <MapContainer center={BOSTON_CENTER} zoom={13} className="fleet-map h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={focusPoints} focusKey={focusKey} />
      <ResizeWatcher />

      {routes.map((route) => {
        const isSelected = route.id === selected;
        return (
          <Polyline
            key={route.id}
            positions={route.geometry}
            pathOptions={{
              color: ROUTE_COLOR[route.type],
              weight: isSelected ? 5 : 3,
              opacity: isSelected ? 0.95 : 0.45,
              dashArray: route.type === "bike" ? "6 6" : undefined,
            }}
            eventHandlers={{ click: () => onSelect(route.id) }}
          />
        );
      })}

      {trip &&
        // Alternates first (thin, grey), selected option last so it draws on top.
        [...trip.options]
          .sort((a, b) => Number(a.id === trip.selectedId) - Number(b.id === trip.selectedId))
          .map((option) => {
            const isSelected = option.id === trip.selectedId;
            return (
              <Polyline
                key={option.id}
                positions={option.geometry}
                pathOptions={{
                  color: isSelected ? "#0f766e" : "#1a2b36",
                  weight: isSelected ? 6 : 4,
                  opacity: isSelected ? 0.95 : 0.35,
                }}
                eventHandlers={{ click: () => trip.onSelect(option.id) }}
              >
                <Tooltip sticky>
                  {option.isFastest ? "Fastest now" : "Alternate"} · {Math.round(option.durationMin)} min
                </Tooltip>
              </Polyline>
            );
          })}

      {selectedOption?.trafficSections.map((section, i) => (
        <Polyline
          key={`section-${i}`}
          positions={section.path}
          pathOptions={{ color: "#c2410c", weight: 7, opacity: 0.85 }}
        />
      ))}

      {trip && (
        <Marker position={[trip.destination.lat, trip.destination.lng]} icon={destinationIcon}>
          <Tooltip direction="top" offset={[0, -16]}>
            <span className="block text-sm font-semibold text-ink">{trip.destination.name}</span>
            <span className="block text-xs text-slate/60">{trip.destination.address}</span>
          </Tooltip>
        </Marker>
      )}

      {shownIncidents.map((incident) => (
        <Marker
          key={incident.id}
          position={incident.position}
          icon={incidentIcon(incident, blockerIds.has(incident.id))}
          zIndexOffset={incident.kind === "accident" ? 1000 : 0}
        >
          <Tooltip direction="top" offset={[0, -10]}>
            <span className="block text-sm font-semibold text-ink">
              {INCIDENT_STYLE[incident.kind].label}
              {blockerIds.has(incident.id) ? " · on your route" : ""}
            </span>
            <span className="block text-xs text-slate/70">{incident.description}</span>
            {incident.road && <span className="block text-xs text-slate/55">{incident.road}</span>}
          </Tooltip>
        </Marker>
      ))}

      {Object.entries(NODES).map(([id, node]) => (
        <Marker
          key={id}
          position={[node.lat, node.lng]}
          icon={nodeIcon(node.type, selectedStops.has(id), hovered === id)}
          eventHandlers={{
            mouseover: () => onHover(id),
            mouseout: () => onHover(null),
          }}
        >
          <Tooltip direction="right" offset={[10, 0]}>
            <span className="block text-sm font-semibold text-ink">{node.label}</span>
            <span className="block text-xs tracking-[0.12em] text-slate/60 uppercase">
              {node.type}
            </span>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
