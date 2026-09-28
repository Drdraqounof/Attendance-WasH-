import type { RouteDefinition } from "@/lib/fleet/types";

/** Demo delivery routes over NODES (src/lib/fleet/nodes.ts). See docs/fleet/map.md. */
export const ROUTE_DEFINITIONS: RouteDefinition[] = [
  {
    id: "r1",
    name: "Downtown Loop",
    type: "truck",
    stops: ["depot_south", "back_bay", "downtown", "north_end", "waterfront", "depot_east", "south_boston", "depot_south"],
    active: true,
  },
  {
    id: "r2",
    name: "Cambridge — Charlestown Run",
    type: "truck",
    stops: ["depot_east", "charlestown", "cambridge", "allston", "fenway", "back_bay", "depot_east"],
    active: true,
  },
  {
    id: "r3",
    name: "South Shore Express",
    type: "truck",
    stops: ["depot_south", "roxbury", "jamaica_plain", "dorchester", "south_boston", "depot_south"],
    active: false,
  },
  {
    id: "r4",
    name: "Inner City Bike Circuit",
    type: "bike",
    stops: ["depot_south", "back_bay", "fenway", "allston", "back_bay", "downtown", "depot_south"],
    active: true,
  },
  {
    id: "r5",
    name: "Waterfront — North End Bike",
    type: "bike",
    stops: ["depot_east", "north_end", "charlestown", "waterfront", "downtown", "depot_east"],
    active: true,
  },
];
