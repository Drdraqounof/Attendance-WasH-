import { describe, expect, it } from "vitest";
import {
  canVoidEvent,
  filterToScope,
  findAssignment,
  inScope,
  isSameOrigin,
  isValidAssignment,
  pickDefaultAssignment,
  stationScope,
  type RoleAssignment,
} from "./access";
import { localizedRoster } from "./dashboard-mock";
import { getAllPeople, isPersonInScope } from "./people-mock";

const DRIVERS = { id: 1, name: "Delivery Drivers" };
const FIRST_SHIFT = { id: 2, name: "Laundry Team Members – First Shift" };

const hrAll: RoleAssignment = { role: "hr", station: null };
const supDrivers: RoleAssignment = { role: "supervisor", station: DRIVERS };
const supFirst: RoleAssignment = { role: "supervisor", station: FIRST_SHIFT };

describe("access — station scope", () => {
  it("gives all-station HR an unrestricted scope", () => {
    expect(stationScope(hrAll)).toEqual({ all: true });
  });

  it("limits a supervisor to their active station only", () => {
    const scope = stationScope(supDrivers);
    expect(inScope(scope, "Delivery Drivers")).toBe(true);
    expect(inScope(scope, "Team Leads")).toBe(false);
  });

  it("treats no active workspace as seeing nothing", () => {
    const scope = stationScope(null);
    expect(inScope(scope, "Delivery Drivers")).toBe(false);
    expect(filterToScope([{ team: "Delivery Drivers" }], scope, (r) => r.team)).toEqual([]);
  });

  it("filters the mock roster by untranslated team, even in Spanish", () => {
    const scope = stationScope(supDrivers);
    const en = localizedRoster("en", scope);
    const es = localizedRoster("es", scope);
    expect(en.length).toBeGreaterThan(0);
    expect(en.every((row) => row.team === "Delivery Drivers")).toBe(true);
    expect(es.map((row) => row.id)).toEqual(en.map((row) => row.id));
    expect(getAllPeople("es", scope).map((p) => p.id)).toEqual(en.map((row) => row.id));
  });

  it("hides out-of-station people from the person page lookup", () => {
    const scope = stationScope(supDrivers);
    const everyone = getAllPeople();
    const driver = everyone.find((p) => p.team === "Delivery Drivers")!;
    const other = everyone.find((p) => p.team !== "Delivery Drivers")!;
    expect(isPersonInScope(driver.id, scope)).toBe(true);
    expect(isPersonInScope(other.id, scope)).toBe(false);
    expect(isPersonInScope("does-not-exist", { all: true })).toBe(false);
  });
});

describe("access — assignments", () => {
  it("rejects a supervisor assignment with no station", () => {
    expect(isValidAssignment({ role: "supervisor", station: null })).toBe(false);
    expect(isValidAssignment(hrAll)).toBe(true);
  });

  it("only finds workspaces the user was actually assigned", () => {
    const mine = [supDrivers, supFirst];
    expect(findAssignment(mine, "supervisor", DRIVERS.id)).toEqual(supDrivers);
    expect(findAssignment(mine, "hr", null)).toBeNull();
    expect(findAssignment(mine, "supervisor", 999)).toBeNull();
    // A bad supervisor-without-station row can never be selected.
    expect(findAssignment([{ role: "supervisor", station: null }], "supervisor", null)).toBeNull();
  });

  it("auto-picks only when there is exactly one valid choice", () => {
    expect(pickDefaultAssignment([supDrivers])).toEqual(supDrivers);
    expect(pickDefaultAssignment([supDrivers, supFirst])).toBeNull();
    expect(pickDefaultAssignment([])).toBeNull();
    expect(
      pickDefaultAssignment([hrAll, { role: "supervisor", station: null }]),
    ).toEqual(hrAll);
  });
});

describe("access — voiding point events", () => {
  const supervisor = { email: "sup@example.com", active: supDrivers };
  const hr = { email: "hr@example.com", active: hrAll };

  it("lets a supervisor void only their own events at their station", () => {
    expect(
      canVoidEvent(supervisor, { createdBy: "sup@example.com", team: "Delivery Drivers" }),
    ).toBe(true);
    expect(
      canVoidEvent(supervisor, { createdBy: "other@example.com", team: "Delivery Drivers" }),
    ).toBe(false);
    expect(canVoidEvent(supervisor, { createdBy: null, team: "Delivery Drivers" })).toBe(false);
    expect(
      canVoidEvent(supervisor, { createdBy: "sup@example.com", team: "Team Leads" }),
    ).toBe(false);
  });

  it("lets HR void any in-scope event", () => {
    expect(canVoidEvent(hr, { createdBy: null, team: "Team Leads" })).toBe(true);
    expect(
      canVoidEvent(
        { email: "hr@example.com", active: { role: "hr", station: DRIVERS } },
        { createdBy: null, team: "Team Leads" },
      ),
    ).toBe(false);
  });
});

describe("access — same-origin check", () => {
  it("accepts matching origins and missing Origin headers", () => {
    expect(isSameOrigin("https://app.example.com", "app.example.com")).toBe(true);
    expect(isSameOrigin(null, "app.example.com")).toBe(true);
  });

  it("rejects other origins and garbage", () => {
    expect(isSameOrigin("https://evil.example.com", "app.example.com")).toBe(false);
    expect(isSameOrigin("not a url", "app.example.com")).toBe(false);
  });
});
