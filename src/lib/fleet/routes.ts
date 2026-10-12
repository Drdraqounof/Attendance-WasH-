import type { RouteDefinition } from "@/lib/fleet/types";

/**
 * Demo delivery routes over NODES (src/lib/fleet/nodes.ts). Every route
 * belongs to the mock "Delivery Drivers" team, and trucks are assigned
 * mock drivers from DEMO_ROSTER (e03 Devon Briggs, e08 Aisha Rahman).
 * See docs/fleet/map.md.
 */
export const ROUTE_DEFINITIONS: RouteDefinition[] = [
  {
    id: "r1",
    name: "Downtown Loop",
    type: "truck",
    stops: ["wcl_lynn", "back_bay", "downtown", "north_end", "waterfront", "depot_east", "south_boston", "wcl_lynn"],
    active: true,
    team: "Delivery Drivers",
    driverId: "e03",
  },
  {
    id: "r2",
    name: "Cambridge — Charlestown Run",
    type: "truck",
    stops: ["depot_east", "charlestown", "cambridge", "allston", "fenway", "back_bay", "depot_east"],
    active: true,
    team: "Delivery Drivers",
    driverId: "e08",
  },
  {
    id: "r3",
    name: "South Shore Express",
    type: "truck",
    stops: ["wcl_lynn", "roxbury", "jamaica_plain", "dorchester", "south_boston", "wcl_lynn"],
    active: false,
    team: "Delivery Drivers",
    driverId: "e03",
  },
  {
    id: "r4",
    name: "Inner City Bike Circuit",
    type: "bike",
    stops: ["depot_east", "back_bay", "fenway", "allston", "back_bay", "downtown", "depot_east"],
    active: true,
    team: "Delivery Drivers",
    driverId: null,
  },
  {
    id: "r5",
    name: "Waterfront — North End Bike",
    type: "bike",
    stops: ["depot_east", "north_end", "charlestown", "waterfront", "downtown", "depot_east"],
    active: true,
    team: "Delivery Drivers",
    driverId: null,
  },
];
