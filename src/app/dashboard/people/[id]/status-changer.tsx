"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { PEOPLE_COPY, RISK_LABELS_BY_LANG } from "@/lib/i18n";
import type { RiskLevel } from "@/lib/policy-engine";

const STATUS_OPTIONS: RiskLevel[] = [
  "clear",
  "low",
  "elevated",
  "at_risk",
  "critical",
  "termination",
];

/**
 * Lets a manager move an employee to any status (not just clearing a
 * PIP) — adds or deducts whatever points that takes, logged as an
 * auditable ledger entry. See docs/planning/employee-track-record-plan.md and
 * src/lib/policy-queries.ts::setEmployeeStatus.
 *
 * Picking a target status and pressing "Change status" opens a modal
 * with a full-size textarea for the reason, rather than a cramped
 * inline text box — there's real room to write a proper explanation.
 * The reason is required — checked here before the request goes out,
 * and re-checked by the API route (src/app/api/warnings/route.ts)
 * since a manual status change is a historical artifact worth being
 * able to explain later.
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
  const modalHeadingId = useId();
  const noteId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [targetStatus, setTargetStatus] = useState<RiskLevel>(currentStatus);
  const [modalOpen, setModalOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unchanged = targetStatus === currentStatus;

  useEffect(() => {
    if (!modalOpen) return;
    textareaRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);

  function openModal() {
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (pending) return;
    setModalOpen(false);
    setError(null);
  }

  async function handleConfirm() {
    if (note.trim().length === 0) {
      setError(copy.errorNoteRequired);
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
          note: note.trim(),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? copy.errorStatusChangeFailed);
      }
      setNote("");
      setModalOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorStatusChangeFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
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
          onClick={openModal}
          disabled={unchanged}
          className="inline-flex h-9 items-center border border-accent-deep/40 bg-accent-deep/10 px-3.5 text-sm font-semibold text-accent-deep transition-colors hover:bg-accent-deep/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {copy.changeStatus}
        </button>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4 sm:p-8"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalHeadingId}
            onClick={(e) => e.stopPropagation()}
            className="flex h-[88vh] w-full max-w-4xl flex-col border border-line bg-white p-8 shadow-xl sm:p-10"
          >
            <h2
              id={modalHeadingId}
              className="font-display text-2xl font-semibold tracking-tight text-ink"
            >
              {copy.changeStatusModalHeading}
            </h2>
            <p className="mt-2 text-base text-slate/70">
              {copy.confirmChangeLead} {riskLabels[currentStatus]}{" "}
              {copy.confirmChangeMid} {riskLabels[targetStatus]}
              {copy.confirmChangeTrail}
            </p>

            <label
              htmlFor={noteId}
              className="mt-6 block text-base font-medium text-ink"
            >
              {copy.noteLabel}
            </label>
            <textarea
              ref={textareaRef}
              id={noteId}
              required
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (error) setError(null);
              }}
              placeholder={copy.notePlaceholder}
              aria-required="true"
              aria-invalid={Boolean(error)}
              className="mt-3 w-full flex-1 resize-none border border-line bg-white px-5 py-4 text-lg leading-relaxed text-ink placeholder:text-slate/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-invalid:border-danger-soft"
            />
            <p className="mt-2 text-sm text-slate/50">{copy.noteHint}</p>
            {error ? (
              <p className="mt-2 text-sm text-danger-soft">{error}</p>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={pending}
                className="px-4 py-2.5 text-sm font-medium text-slate/70 transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy.cancelButton}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending}
                className="inline-flex h-11 items-center bg-accent-deep px-5 text-sm font-semibold text-white transition-colors hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? copy.applying : copy.confirmButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
