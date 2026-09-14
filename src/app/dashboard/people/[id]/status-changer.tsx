"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PEOPLE_COPY, RISK_LABELS_BY_LANG } from "@/lib/i18n";
import type { RiskLevel } from "@/lib/policy-engine";

const STATUS_OPTIONS: RiskLevel[] = ["clear", "watch", "at_risk", "pip_flag"];

/**
 * Lets a manager move an employee to any status (not just clearing a
 * PIP) — adds or deducts whatever points that takes, logged as an
 * auditable ledger entry. See docs/planning/employee-track-record-plan.md and
 * src/lib/policy-queries.ts::setEmployeeStatus.
 */
export function StatusChanger({
  employeeId,
  currentStatus,
  copy = PEOPLE_COPY.en,
  riskLabels = RISK_LABELS_BY_LANG.en,
}: {
  employeeId: string;
  currentStatus: RiskLevel;
  copy?: (typeof PEOPLE_COPY)[keyof typeof PEOPLE_COPY];
  riskLabels?: Record<RiskLevel, string>;
}) {
  const router = useRouter();
  const [targetStatus, setTargetStatus] = useState<RiskLevel>(currentStatus);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unchanged = targetStatus === currentStatus;

  async function handleApply() {
    if (
      !window.confirm(
        `${copy.confirmChangeLead} ${riskLabels[currentStatus]} ${copy.confirmChangeMid} ${riskLabels[targetStatus]}${copy.confirmChangeTrail}`,
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
        body: JSON.stringify({
          employeeId,
          targetStatus,
          note: note.trim() || undefined,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? copy.errorStatusChangeFailed);
      }
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorStatusChangeFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <label className="sr-only" htmlFor={`${employeeId}-status-note`}>
        {copy.noteLabel}
      </label>
      <input
        id={`${employeeId}-status-note`}
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={copy.notePlaceholder}
        className="h-9 w-56 max-w-full border border-line bg-white px-2 text-sm text-ink placeholder:text-slate/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      <div className="flex items-center gap-2">
        <select
          value={targetStatus}
          onChange={(e) => setTargetStatus(e.target.value as RiskLevel)}
          className="h-9 border border-line bg-white px-2 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label={copy.targetStatusLabel}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {riskLabels[status]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleApply}
          disabled={pending || unchanged}
          className="inline-flex h-9 items-center border border-accent-deep/40 bg-accent-deep/10 px-3.5 text-sm font-semibold text-accent-deep transition-colors hover:bg-accent-deep/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? copy.applying : copy.changeStatus}
        </button>
      </div>
      <p className="max-w-56 text-right text-sm text-slate/50">{copy.noteHint}</p>
      {error ? <p className="text-sm text-danger-soft">{error}</p> : null}
    </div>
  );
}
