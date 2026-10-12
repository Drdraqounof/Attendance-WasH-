import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearRecentProblems,
  createLogger,
  recentProblems,
  redact,
  serializeError,
} from "./log";

describe("log", () => {
  afterEach(() => {
    clearRecentProblems();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("redacts keys, tokens and passwords", () => {
    expect(redact("https://api.tomtom.com/x?key=abc123&lat=1")).toBe(
      "https://api.tomtom.com/x?key=***&lat=1",
    );
    expect(redact("api_key=zzz token=t0k password=hunter2")).toBe(
      "api_key=*** token=*** password=***",
    );
  });

  it("serializes errors with their cause, redacted", () => {
    const err = new Error("GET ?key=secret failed", { cause: new TypeError("socket hang up") });
    expect(serializeError(err)).toMatchObject({
      name: "Error",
      message: "GET ?key=*** failed",
      cause: { name: "TypeError", message: "socket hang up" },
    });
  });

  it("writes one line with scope, level and fields, and respects LOG_LEVEL", () => {
    vi.stubEnv("LOG_LEVEL", "info");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const log = createLogger("fleet/test").child({ requestId: "ab12" });

    log.info("request done", { status: 200, url: "/x?key=leak" });
    log.debug("hidden at info level");

    expect(debug).not.toHaveBeenCalled();
    const line = info.mock.calls[0]![0] as string;
    expect(line).toMatch(/INFO  \[fleet\/test\] request done /);
    expect(line).toContain('"requestId":"ab12"');
    expect(line).toContain("key=***");
    expect(line).not.toContain("leak");
  });

  it("emits JSON lines with LOG_FORMAT=json", () => {
    vi.stubEnv("LOG_FORMAT", "json");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    createLogger("tomtom").warn("routing call failed", { status: 429 });
    expect(JSON.parse(warn.mock.calls[0]![0] as string)).toMatchObject({
      level: "warn",
      scope: "tomtom",
      message: "routing call failed",
      fields: { status: 429 },
    });
  });

  it("keeps recent warnings/errors (even below LOG_LEVEL), newest first", () => {
    vi.stubEnv("LOG_LEVEL", "error");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const log = createLogger("tomtom");
    log.info("not kept");
    log.warn("first");
    log.error("second");
    expect(recentProblems().map((p) => p.message)).toEqual(["second", "first"]);
    expect(recentProblems("osrm")).toEqual([]);
  });
});
