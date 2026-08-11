"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  AUTOMATION_TOGGLES,
  AUTOMATION_TOGGLES_STORAGE_KEY,
  type AutomationToggleKey,
} from "@/lib/settings-mock";

/**
 * Read-only "Notification preferences" card on the profile page.
 * Two views of the same information:
 *  - short catalog (default): the one-line summary sentence.
 *  - long catalog: every automation toggle, its description, and its
 *    live on/off state (read from the same localStorage key the
 *    settings page writes to, so this never drifts from what's
 *    actually configured).
 * Editing still happens on /settings — this card is read-only summary.
 *
 * Uses useSyncExternalStore (not useState+useEffect) to read
 * localStorage — the React-correct way to subscribe to an external
 * store without a setState-in-effect or an SSR/CSR hydration mismatch.
 */

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getSnapshot(): string {
  try {
    return window.localStorage.getItem(AUTOMATION_TOGGLES_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function getServerSnapshot(): string {
  return "";
}

function defaultToggleState(): Record<AutomationToggleKey, boolean> {
  const defaults = {} as Record<AutomationToggleKey, boolean>;
  for (const toggle of AUTOMATION_TOGGLES) defaults[toggle.key] = toggle.defaultOn;
  return defaults;
}

export function NotificationPreferences() {
  const [catalog, setCatalog] = useState<"short" | "long">("short");
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleState = useMemo<Record<AutomationToggleKey, boolean>>(() => {
    const defaults = defaultToggleState();
    if (!raw) return defaults;
    try {
      return { ...defaults, ...JSON.parse(raw) };
    } catch {
      return defaults;
    }
  }, [raw]);

  const isLong = catalog === "long";

  return (
    <section
      className="animate-fade-up-delay-2 mt-8 border border-line bg-white/70 px-5 py-6 sm:px-6"
      aria-labelledby="notifications-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id="notifications-heading"
          className="font-display text-xl font-semibold tracking-tight text-ink"
        >
          Notification preferences
        </h2>
        <Link
          href="/settings"
          className="text-sm font-medium tracking-wide text-accent-deep uppercase transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          Manage automation
        </Link>
      </div>

      {isLong ? (
        <ul className="mt-4 divide-y divide-line/70 border border-line/70">
          {AUTOMATION_TOGGLES.map((def) => {
            const on = toggleState[def.key];
            return (
              <li
                key={def.key}
                className="flex items-start justify-between gap-4 px-4 py-3.5"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">{def.label}</p>
                  <p className="mt-1 text-sm text-slate/65">
                    {def.description}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-medium tracking-wide uppercase ${
                    def.locked
                      ? "text-slate/45"
                      : on
                        ? "text-accent-deep"
                        : "text-slate/45"
                  }`}
                >
                  {def.locked ? "Not connected" : on ? "On" : "Off"}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate/70">
          Manager alerts, 30-day trend analysis, and recognition
          automations are configured on the settings page and apply across
          every floor you supervise.
        </p>
      )}

      <button
        type="button"
        onClick={() => setCatalog(isLong ? "short" : "long")}
        aria-expanded={isLong}
        className="mt-4 text-sm font-medium text-slate/60 underline decoration-line underline-offset-4 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        {isLong
          ? "Show summary"
          : `Show full catalog (${AUTOMATION_TOGGLES.length} automations)`}
      </button>
    </section>
  );
}
