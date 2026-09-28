"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Soft delete / undo for one point-ledger event. Voiding keeps the row
 * in the track record (struck through) but removes it from the points
 * total; "Restore" reverses it. Server-side permission and audit
 * logging live in src/app/api/point-events/[id]/void/route.ts.
 */
export function VoidEventButton({
  eventId,
  voided,
}: {
  eventId: string;
  voided: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (!voided && !window.confirm("Void this event? It will stop counting toward points. You can restore it afterwards.")) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/point-events/${encodeURIComponent(eventId)}/void`,
        { method: voided ? "DELETE" : "POST" },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Couldn't update this event.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't update this event — check your connection.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="flex flex-col items-end">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="border border-line bg-white/70 px-2 py-1 text-xs font-medium text-slate/70 transition-colors hover:border-accent/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "…" : voided ? "Restore" : "Void"}
      </button>
      {error ? (
        <span role="alert" className="mt-1 max-w-48 text-right text-xs text-danger-soft">
          {error}
        </span>
      ) : null}
    </span>
  );
}
