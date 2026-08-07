"use client";

import { useEffect, useState } from "react";
import {
  AUTOMATION_TOGGLES,
  type AutomationToggleKey,
} from "@/lib/settings-mock";

const STORAGE_KEY = "ap_automation_toggles";

function defaultState(): Record<AutomationToggleKey, boolean> {
  const state = {} as Record<AutomationToggleKey, boolean>;
  for (const toggle of AUTOMATION_TOGGLES) {
    state[toggle.key] = toggle.defaultOn;
  }
  return state;
}

function loadState(): Record<AutomationToggleKey, boolean> {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

export function AutomationToggles() {
  const [state, setState] = useState<Record<AutomationToggleKey, boolean>>(
    defaultState,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  function toggle(key: AutomationToggleKey) {
    setState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage unavailable — toggle still updates in-memory
      }
      return next;
    });
  }

  return (
    <ul
      className={`divide-y divide-line/70 border border-line bg-white/65 transition-opacity ${
        hydrated ? "opacity-100" : "opacity-0"
      }`}
    >
      {AUTOMATION_TOGGLES.map((def) => {
        const on = state[def.key];
        const disabled = Boolean(def.locked);
        return (
          <li
            key={def.key}
            className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5"
          >
            <div className="min-w-0">
              <p className="font-medium text-ink">
                {def.label}
                {disabled ? (
                  <span className="ml-2 text-sm font-medium tracking-wide text-slate/50 uppercase">
                    Not connected
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-slate/65">{def.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={def.label}
              disabled={disabled}
              onClick={() => toggle(def.key)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${
                on ? "border-accent bg-accent" : "border-line bg-surface-2"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 shrink-0 bg-white transition-transform ${
                  on ? "translate-x-[22px]" : "translate-x-1"
                }`}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
