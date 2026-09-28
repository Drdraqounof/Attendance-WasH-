"use client";

import { useState } from "react";
import {
  ROLE_LABELS,
  sameAssignment,
  type RoleAssignment,
} from "@/lib/access";

export function WorkspacePicker({
  options,
  current,
  next,
}: {
  options: RoleAssignment[];
  current: RoleAssignment | null;
  next: string;
}) {
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function choose(option: RoleAssignment, index: number) {
    setPending(index);
    setError("");
    try {
      const response = await fetch("/api/session/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: option.role,
          stationId: option.station?.id ?? null,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Couldn't switch workspace. Try again.");
        setPending(null);
        return;
      }
      window.location.assign(next);
    } catch {
      setError("Couldn't switch workspace — check your connection and try again.");
      setPending(null);
    }
  }

  if (options.length === 0) {
    return (
      <p className="mt-8 border border-line bg-white/70 px-5 py-6 text-center text-sm text-slate/70">
        Your account doesn&apos;t have a role assigned yet. Ask HR to set one up.
      </p>
    );
  }

  return (
    <div className="animate-fade-up-delay-2 mt-8">
      <ul className="flex flex-col gap-3">
        {options.map((option, index) => {
          const isCurrent = current !== null && sameAssignment(current, option);
          return (
            <li key={`${option.role}-${option.station?.id ?? "all"}`}>
              <button
                type="button"
                onClick={() => choose(option, index)}
                disabled={pending !== null}
                aria-current={isCurrent ? "true" : undefined}
                className="flex w-full items-center justify-between gap-4 border border-line bg-white px-5 py-5 text-left transition-colors hover:border-accent/50 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>
                  <span className="text-sm font-semibold tracking-[0.14em] text-accent-deep uppercase">
                    {ROLE_LABELS[option.role]}
                  </span>
                  <span className="font-display mt-1 block text-lg font-semibold text-ink">
                    {option.station ? option.station.name : "All stations"}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-slate/60">
                  {pending === index ? "Opening…" : isCurrent ? "Current" : "Open"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p role="alert" className="mt-4 min-h-5 text-center text-sm font-medium text-danger-soft">
        {error}
      </p>
    </div>
  );
}
