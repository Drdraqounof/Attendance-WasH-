"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RISK_LABELS } from "@/lib/dashboard-mock";
import type { RiskLevel } from "@/lib/policy-engine";

const STATUS_OPTIONS: RiskLevel[] = ["clear", "watch", "at_risk", "pip_flag"];

/**
 * Lets a manager move an employee to any status (not just clearing a
 * PIP) — adds or deducts whatever points that takes, logged as an
 * auditable ledger entry. See docs/employee-track-record-plan.md and
 * src/lib/policy-queries.ts::setEmployeeStatus.
 */
export function StatusChanger({
  employeeId,
  currentStatus,
}: {
  employeeId: string;
  currentStatus: RiskLevel;
}) {
  const router = useRouter();
  const [targetStatus, setTargetStatus] = useState<RiskLevel>(currentStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unchanged = targetStatus === currentStatus;

  async function handleApply() {
    if (
      !window.confirm(
        `Change this employee's status from ${RISK_LABELS[currentStatus]} to ${RISK_LABELS[targetStatus]}? Points will be added or deducted to match.`,
      )
    ) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, targetStatus }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? "Status change failed.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status change failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <select
          value={targetStatus}
          onChange={(e) => setTargetStatus(e.target.value as RiskLevel)}
          className="h-9 border border-line bg-white px-2 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label="Target status"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {RISK_LABELS[status]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleApply}
          disabled={pending || unchanged}
          className="inline-flex h-9 items-center border border-accent-deep/40 bg-accent-deep/10 px-3.5 text-sm font-semibold text-accent-deep transition-colors hover:bg-accent-deep/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Applying…" : "Change status"}
        </button>
      </div>
      {error ? <p className="text-sm text-danger-soft">{error}</p> : null}
    </div>
  );
}
