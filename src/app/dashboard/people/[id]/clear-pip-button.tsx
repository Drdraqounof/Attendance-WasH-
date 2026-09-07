"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Manual status-change action — moves an employee off a PIP back to
 * "Clear" by calling the real reset endpoint (src/app/api/warnings,
 * src/lib/policy-queries.ts::resetEmployeeStatus). See
 * docs/employee-track-record-plan.md §4.
 */
export function ClearPipButton({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Reset failed.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex h-9 items-center border border-accent-deep/40 bg-accent-deep/10 px-3.5 text-sm font-semibold text-accent-deep transition-colors hover:bg-accent-deep/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Clearing…" : "Clear PIP status"}
      </button>
      {error ? <p className="text-sm text-danger-soft">{error}</p> : null}
    </div>
  );
}
