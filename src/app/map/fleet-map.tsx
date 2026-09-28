"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { BOSTON_CENTER, NODES } from "@/lib/fleet/nodes";
import { ROUTE_COLOR } from "@/lib/fleet/theme";
import type { NodeType, Route } from "@/lib/fleet/types";

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

function FitBounds({ selectedRoute }: { selectedRoute?: Route }) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = selectedRoute?.geometry?.length
      ? selectedRoute.geometry
      : Object.values(NODES).map((n) => [n.lat, n.lng]);
    const bounds = L.latLngBounds(points);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, selectedRoute]);

  return null;
}

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
}: {
  routes: Route[];
  hovered: string | null;
  selected: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}) {
  const selectedRoute = routes.find((r) => r.id === selected);
  const selectedStops = useMemo(() => new Set(selectedRoute?.stops ?? []), [selectedRoute]);

  return (
    <MapContainer center={BOSTON_CENTER} zoom={13} className="fleet-map h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds selectedRoute={selectedRoute} />
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
