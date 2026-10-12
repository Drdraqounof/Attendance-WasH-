import type { MapNode } from "@/lib/fleet/types";

/**
 * Map nodes (lat, lng) for /map. `wcl_lynn` is Wash Cycle Laundry's real
 * Boston-area plant (626 Lynnway, Lynn, MA). Every other node is demo data:
 * Boston-area neighborhood centroids, not tied to any WCL system yet — see
 * docs/fleet/map-integration.md.
 */
export const NODES: Record<string, MapNode> = {
  wcl_lynn: { lat: 42.4531, lng: -70.9615, label: "Wash Cycle Laundry — Lynn Plant", type: "depot" },
  depot_east: { lat: 42.352, lng: -71.041, label: "Seaport Hub", type: "hub" },
  downtown: { lat: 42.3554, lng: -71.0605, label: "Downtown Crossing", type: "stop" },
  back_bay: { lat: 42.3503, lng: -71.081, label: "Back Bay", type: "stop" },
  fenway: { lat: 42.3467, lng: -71.0972, label: "Fenway", type: "stop" },
  cambridge: { lat: 42.3736, lng: -71.1097, label: "Cambridge", type: "hub" },
  charlestown: { lat: 42.3782, lng: -71.0602, label: "Charlestown", type: "stop" },
  north_end: { lat: 42.3647, lng: -71.0542, label: "North End", type: "stop" },
  east_boston: { lat: 42.3751, lng: -71.0392, label: "East Boston", type: "stop" },
  south_boston: { lat: 42.3381, lng: -71.0476, label: "South Boston", type: "stop" },
  roxbury: { lat: 42.3151, lng: -71.085, label: "Roxbury", type: "stop" },
  jamaica_plain: { lat: 42.3097, lng: -71.115, label: "Jamaica Plain", type: "stop" },
  dorchester: { lat: 42.3016, lng: -71.0676, label: "Dorchester", type: "stop" },
  allston: { lat: 42.3529, lng: -71.1317, label: "Allston", type: "stop" },
  waterfront: { lat: 42.36, lng: -71.049, label: "Waterfront", type: "stop" },
};

export const BOSTON_CENTER: [number, number] = [42.3453, -71.0857];
