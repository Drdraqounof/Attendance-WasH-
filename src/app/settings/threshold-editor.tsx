"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PolicyThreshold, PolicyThresholdKey } from "@/lib/policy-engine";

const EDITABLE_KEYS: PolicyThresholdKey[] = ["verbal_warning", "manager_meeting"];

/**
 * Lets a signed-in user retune the verbal-warning and required-manager-
 * meeting thresholds. The PIP threshold is fixed at the policy cap and
 * rendered read-only. See docs/policy-thresholds-editing.md.
 */
export function ThresholdEditor({
  initialThresholds,
}: {
  initialThresholds: PolicyThreshold[];
}) {
  const router = useRouter();
  const [thresholds, setThresholds] = useState(initialThresholds);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialThresholds.map((t) => [t.key, String(t.pointValue)]),
    ),
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(key: PolicyThresholdKey) {
    const draft = drafts[key];
    const pointValue = Number(draft);
    if (!Number.isInteger(pointValue) || pointValue <= 0) {
      setError("Enter a positive whole number of points.");
      return;
    }

    setPendingKey(key);
    setError(null);
    try {
      const response = await fetch("/api/policy-thresholds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, pointValue }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? "Update failed.");
      }
      setThresholds(body.thresholds);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="mt-3 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
      {thresholds.map((threshold) => {
        const editable = EDITABLE_KEYS.includes(threshold.key);
        return (
          <div key={threshold.key} className="bg-white/80 px-5 py-4">
            <p className="text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
              {threshold.label}
            </p>

            {editable ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={drafts[threshold.key] ?? ""}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [threshold.key]: e.target.value }))
                  }
                  className="font-display w-20 border border-line bg-white px-2 py-1 text-xl font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  aria-label={`${threshold.label} point value`}
                />
                <span className="text-sm text-slate/65">pts</span>
                <button
                  type="button"
                  onClick={() => handleSave(threshold.key)}
                  disabled={pendingKey === threshold.key}
                  className="ml-auto inline-flex h-8 items-center border border-accent-deep/40 bg-accent-deep/10 px-3 text-sm font-semibold text-accent-deep transition-colors hover:bg-accent-deep/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingKey === threshold.key ? "Saving…" : "Save"}
                </button>
              </div>
            ) : (
              <p className="font-display mt-1 text-xl font-bold text-ink">
                {threshold.pointValue} pts
              </p>
            )}

            <p className="mt-1 text-sm text-slate/65">{threshold.action}</p>
            {!editable ? (
              <p className="mt-1 text-sm text-slate/50">
                Fixed at the policy cap — not independently editable.
              </p>
            ) : null}
          </div>
        );
      })}
      {error ? (
        <div className="col-span-full bg-danger-soft/10 px-5 py-3 text-sm text-danger-soft">
          {error}
        </div>
      ) : null}
    </div>
  );
}
