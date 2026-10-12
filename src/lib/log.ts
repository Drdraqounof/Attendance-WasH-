/**
 * Small structured logger, safe on server and client (no Node imports).
 *
 *   const log = createLogger("fleet/directions");
 *   log.warn("TomTom routing failed — using OSRM", { status: 429, ms: 812 });
 *
 * Server output is one line per event, e.g.
 *   2026-10-05T15:40:00.000Z WARN  [fleet/directions] TomTom routing failed — using OSRM {"status":429,"ms":812}
 * or JSON lines with LOG_FORMAT=json (for log platforms). LOG_LEVEL sets
 * the minimum level (debug | info | warn | error; default info, debug
 * in development). Secrets are redacted: anything shaped like
 * `key=…`, `api_key=…` or `token=…` in messages and fields.
 *
 * Warnings and errors are also kept in a small in-memory ring buffer
 * (per server instance) for the HR-only /api/fleet/status endpoint.
 * See docs/operations/logging.md.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

export type LogEntry = {
  time: string;
  level: LogLevel;
  scope: string;
  message: string;
  fields?: LogFields;
};

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const isServer = typeof window === "undefined";

function envLevel(): LogLevel {
  const raw = (isServer ? process.env.LOG_LEVEL : undefined)?.toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") return raw;
  return process.env.NODE_ENV === "development" ? "debug" : "info";
}

const SECRET_PATTERN = /\b(key|api_key|apikey|token|secret|password)=([^&\s"']+)/gi;

/** Strips secrets from URLs/messages before they reach a log line. */
export function redact(text: string): string {
  return text.replace(SECRET_PATTERN, "$1=***");
}

/** Turns errors (and their causes) into plain, loggable objects. */
export function serializeError(error: unknown): LogFields {
  if (error instanceof Error) {
    const out: LogFields = {
      name: error.name,
      message: redact(error.message),
    };
    if (error.cause !== undefined) out.cause = serializeError(error.cause);
    if (error.stack && isServer && process.env.NODE_ENV !== "production") {
      out.stack = redact(error.stack.split("\n").slice(0, 6).join("\n"));
    }
    return out;
  }
  return { message: redact(String(error)) };
}

function cleanFields(fields: LogFields | undefined): LogFields | undefined {
  if (!fields) return undefined;
  const out: LogFields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (v instanceof Error) out[k] = serializeError(v);
    else if (typeof v === "string") out[k] = redact(v);
    else out[k] = v;
  }
  return out;
}

// -- Recent problems (warn/error) for the status endpoint -----------------------

const RECENT_LIMIT = 50;
const recent: LogEntry[] = [];

/** Most recent warnings/errors, newest first (optionally for one scope prefix). */
export function recentProblems(scopePrefix?: string): LogEntry[] {
  const list = scopePrefix ? recent.filter((e) => e.scope.startsWith(scopePrefix)) : recent;
  return [...list].reverse();
}

/** Test hook. */
export function clearRecentProblems(): void {
  recent.length = 0;
}

// -- Output -----------------------------------------------------------------------

function write(entry: LogEntry): void {
  const consoleFn =
    entry.level === "error"
      ? console.error
      : entry.level === "warn"
        ? console.warn
        : entry.level === "debug"
          ? console.debug
          : console.info;

  if (!isServer) {
    // Browser devtools render objects nicely; keep them as objects.
    const args: unknown[] = [`[${entry.scope}] ${entry.message}`];
    if (entry.fields) args.push(entry.fields);
    consoleFn(...args);
    return;
  }

  if (process.env.LOG_FORMAT === "json") {
    consoleFn(JSON.stringify(entry));
    return;
  }

  const fields = entry.fields && Object.keys(entry.fields).length ? ` ${safeJson(entry.fields)}` : "";
  consoleFn(
    `${entry.time} ${entry.level.toUpperCase().padEnd(5)} [${entry.scope}] ${entry.message}${fields}`,
  );
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

export type Logger = {
  debug: (message: string, fields?: LogFields) => void;
  info: (message: string, fields?: LogFields) => void;
  warn: (message: string, fields?: LogFields) => void;
  error: (message: string, fields?: LogFields) => void;
  /** Same scope, with fields (e.g. a request id) added to every line. */
  child: (fields: LogFields) => Logger;
};

export function createLogger(scope: string, base: LogFields = {}): Logger {
  function emit(level: LogLevel, message: string, fields?: LogFields) {
    const merged = cleanFields({ ...base, ...fields });
    const entry: LogEntry = {
      time: new Date().toISOString(),
      level,
      scope,
      message: redact(message),
      ...(merged && Object.keys(merged).length ? { fields: merged } : {}),
    };
    if (level === "warn" || level === "error") {
      recent.push(entry);
      if (recent.length > RECENT_LIMIT) recent.shift();
    }
    if (LEVEL_ORDER[level] < LEVEL_ORDER[envLevel()]) return;
    write(entry);
  }

  return {
    debug: (m, f) => emit("debug", m, f),
    info: (m, f) => emit("info", m, f),
    warn: (m, f) => emit("warn", m, f),
    error: (m, f) => emit("error", m, f),
    child: (fields) => createLogger(scope, { ...base, ...fields }),
  };
}

/** Milliseconds since `start` (from performance.now / Date.now). */
export function elapsedMs(start: number): number {
  return Math.round(now() - start);
}

export function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/** Short id tying a request's log lines to the `x-request-id` response header. */
export function newRequestId(): string {
  return globalThis.crypto.randomUUID().slice(0, 8);
}
