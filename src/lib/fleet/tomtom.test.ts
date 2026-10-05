import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAlternatives } from "./osrm";
import { originNodesForScope } from "./scoped-routes";
import {
  attachBlockers,
  bboxAreaKm2,
  consumeQuota,
  DAILY_CALL_BUDGET,
  parseIncidents,
  parsePlaces,
  parseRoutes,
  resetQuota,
} from "./tomtom";

// Shapes trimmed from real TomTom responses (2026-10-05).
const SEARCH = {
  results: [
    {
      id: "9BeMy4nk23TlEqQG35hjXg",
      poi: { name: "BURGER KING" },
      address: { freeformAddress: "944 Bennington Street, East Boston, MA 02128" },
      position: { lat: 42.386228, lon: -71.009692 },
    },
    { id: "no-position", poi: { name: "Broken" }, address: {} },
  ],
};

const LINE_A: [number, number][] = [
  [42.4, -71.0],
  [42.39, -71.0],
  [42.38, -71.0],
];
const LINE_B: [number, number][] = [
  [42.4, -71.0],
  [42.39, -71.02],
  [42.38, -71.0],
];

const toPoints = (line: [number, number][]) =>
  line.map(([latitude, longitude]) => ({ latitude, longitude }));

const ROUTES = {
  routes: [
    {
      summary: {
        lengthInMeters: 18509,
        travelTimeInSeconds: 2400,
        trafficDelayInSeconds: 125,
        noTrafficTravelTimeInSeconds: 1734,
      },
      legs: [{ points: toPoints(LINE_A) }],
      sections: [
        { sectionType: "TRAVEL_MODE" },
        {
          sectionType: "TRAFFIC",
          simpleCategory: "JAM",
          startPointIndex: 1,
          endPointIndex: 2,
          delayInSeconds: 125,
          effectiveSpeedInKmh: 9,
        },
      ],
    },
    {
      summary: { lengthInMeters: 24691, travelTimeInSeconds: 2300, trafficDelayInSeconds: 0 },
      legs: [{ points: toPoints(LINE_B) }],
      sections: [],
    },
  ],
};

const INCIDENTS = {
  incidents: [
    {
      geometry: { type: "Point", coordinates: [-71.0, 42.395] }, // on LINE_A
      properties: {
        id: "acc-1",
        iconCategory: 1,
        magnitudeOfDelay: 3,
        events: [{ description: "Accident" }],
        from: "Main St",
        to: "Broadway",
        delay: 300,
        roadNumbers: ["US-1"],
      },
    },
    {
      geometry: {
        type: "LineString",
        // Along LINE_B's first leg, in its direction of travel.
        coordinates: [
          [-71.006, 42.397],
          [-71.008, 42.396],
        ],
      },
      properties: { id: "closed-1", iconCategory: 8, events: [{ description: "Closed" }] },
    },
    {
      // Same stretch as acc-1 but heading north: the opposite carriageway.
      geometry: {
        type: "LineString",
        coordinates: [
          [-71.0, 42.385],
          [-71.0, 42.388],
        ],
      },
      properties: { id: "jam-opposite", iconCategory: 6 },
    },
    {
      // A cross street meeting LINE_A at right angles.
      geometry: {
        type: "LineString",
        coordinates: [
          [-71.003, 42.392],
          [-71.0, 42.392],
          [-70.997, 42.392],
        ],
      },
      properties: { id: "jam-cross", iconCategory: 6 },
    },
    { geometry: { type: "Polygon", coordinates: [] }, properties: { id: "skip" } },
  ],
};

describe("tomtom — parsers", () => {
  it("parses places and title-cases shouting brand names", () => {
    expect(parsePlaces(SEARCH)).toEqual([
      {
        id: "9BeMy4nk23TlEqQG35hjXg",
        name: "Burger King",
        address: "944 Bennington Street, East Boston, MA 02128",
        lat: 42.386228,
        lng: -71.009692,
      },
    ]);
    expect(parsePlaces({})).toEqual([]);
  });

  it("parses route options, traffic sections and the fastest flag", () => {
    const [a, b] = parseRoutes(ROUTES);
    expect(a).toMatchObject({ distanceKm: 18.509, durationMin: 40, isFastest: false });
    expect(a!.noTrafficMin).toBeCloseTo(28.9, 1);
    expect(a!.trafficDelayMin).toBeCloseTo(2.08, 2);
    expect(a!.trafficSections).toEqual([
      { kind: "jam", delaySec: 125, speedKmh: 9, path: LINE_A.slice(1, 3) },
    ]);
    // B is longer but quicker now, so it's the fastest.
    expect(b).toMatchObject({ isFastest: true, noTrafficMin: 2300 / 60 });
  });

  it("maps incident categories, roads and positions", () => {
    const [accident, closure] = parseIncidents(INCIDENTS);
    expect(parseIncidents(INCIDENTS)).toHaveLength(4);
    expect(accident).toMatchObject({
      id: "acc-1",
      kind: "accident",
      description: "Accident",
      road: "US-1 · Main St → Broadway",
      delaySec: 300,
      position: [42.395, -71.0],
    });
    expect(closure).toMatchObject({ kind: "closure", delaySec: null, magnitude: 0 });
  });
});

describe("tomtom — blockers", () => {
  it("attaches incidents only to routes they run along, in the same direction", () => {
    const options = attachBlockers(parseRoutes(ROUTES), parseIncidents(INCIDENTS));
    expect(options[0]!.blockers.map((b) => b.id)).toEqual(["acc-1"]);
    expect(options[1]!.blockers.map((b) => b.id)).toEqual(["closed-1"]);
  });

  it("measures bbox area for the incident-size guard", () => {
    // ~0.3° x 0.22° around Boston ≈ 25 km x 24 km.
    expect(bboxAreaKm2([-71.2, 42.25, -70.9, 42.47])).toBeGreaterThan(500);
    expect(bboxAreaKm2([-71.2, 42.25, -70.9, 42.47])).toBeLessThan(700);
  });
});

describe("tomtom — quota guard", () => {
  afterEach(() => {
    resetQuota();
    vi.restoreAllMocks();
  });

  it("stops at the daily budget and resets the next day", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const day1 = new Date("2026-10-05T12:00:00Z");
    for (let i = 0; i < DAILY_CALL_BUDGET; i++) expect(consumeQuota(day1)).toBe(true);
    expect(consumeQuota(day1)).toBe(false);
    expect(consumeQuota(new Date("2026-10-06T00:00:01Z"))).toBe(true);
  });
});

describe("live routing — access and fallback", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("only lets viewers plan trips from depots/hubs on their own routes", () => {
    expect(originNodesForScope({ all: true })).toEqual(
      expect.arrayContaining(["wcl_lynn", "depot_east", "cambridge"]),
    );
    expect(originNodesForScope({ all: true })).not.toContain("downtown"); // a stop
    expect(originNodesForScope({ all: false, teams: ["Yard"] })).toContain("wcl_lynn");
    expect(originNodesForScope({ all: false, teams: ["Dock A"] })).toEqual([]);
  });

  it("falls back to OSRM alternatives, then a straight line", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          routes: [
            { distance: 5000, duration: 600, geometry: { coordinates: [[-71, 42.4], [-71, 42.38]] } },
            { distance: 6000, duration: 720, geometry: { coordinates: [[-71, 42.4], [-71.02, 42.38]] } },
          ],
        }),
      }),
    );
    const options = await fetchAlternatives([42.4, -71], [42.38, -71]);
    expect(options.map((o) => [o.durationMin, o.isFastest])).toEqual([
      [10, true],
      [12, false],
    ]);
    expect(options[0]!.geometry[0]).toEqual([42.4, -71]);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const fallback = await fetchAlternatives([42.4, -71], [42.38, -71]);
    expect(fallback).toHaveLength(1);
    expect(fallback[0]!.geometry).toEqual([
      [42.4, -71],
      [42.38, -71],
    ]);
  });
});
