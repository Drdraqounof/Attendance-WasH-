"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ALERT_SEVERITY_LABELS, type AttendanceAlert } from "@/lib/alerts-mock";

const MAX_VISIBLE = 5;

function severityDot(severity: AttendanceAlert["severity"]): string {
  return severity === "critical" ? "bg-danger-soft" : "bg-danger-soft/55";
}

/**
 * Header notification bell. Renders a floating overlay panel — it's
 * `absolute` inside a `relative` wrapper with a high z-index, so it
 * layers on top of the page instead of pushing content down, and
 * closes on outside click, Escape, or picking an alert.
 */
export function NotificationBell({ alerts }: { alerts: AttendanceAlert[] }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const visible = alerts.slice(0, MAX_VISIBLE);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Notifications${alerts.length > 0 ? `, ${alerts.length} open` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center text-slate/70 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          className="h-5 w-5"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 8a6 6 0 1 1 12 0c0 3.2 1 5 1.5 6.2a1 1 0 0 1-.9 1.3H5.4a1 1 0 0 1-.9-1.3C5 13 6 11.2 6 8Z"
          />
          <path strokeLinecap="round" d="M9.5 18.5a2.5 2.5 0 0 0 5 0" />
        </svg>
        {alerts.length > 0 ? (
          <span
            className={`absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center px-1 text-[10px] font-semibold text-white tabular-nums ${
              criticalCount > 0 ? "bg-danger-soft" : "bg-accent-deep"
            }`}
            aria-hidden
          >
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute top-full right-0 z-50 mt-3 w-80 border border-line bg-white shadow-lg sm:w-96"
        >
          <div className="flex items-baseline justify-between gap-3 border-b border-line/70 px-4 py-3">
            <p className="font-display text-sm font-semibold tracking-tight text-ink">
              Notifications
            </p>
            <p className="text-sm tracking-wide text-slate/55 uppercase">
              {alerts.length} open
            </p>
          </div>

          {visible.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate/65">
              No active warnings. All signals within policy.
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-line/70 overflow-y-auto">
              {visible.map((alert) => (
                <li key={alert.id}>
                  <Link
                    href={`/dashboard/people/${alert.personId}`}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 transition-colors hover:bg-surface-2/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 ${severityDot(alert.severity)}`}
                        aria-hidden
                      />
                      <span className="truncate font-medium text-ink">
                        {alert.employee}
                      </span>
                      <span className="ml-auto shrink-0 text-sm font-medium text-danger-soft">
                        {ALERT_SEVERITY_LABELS[alert.severity]}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate/65 pl-4">
                      {alert.issue}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="block border-t border-line/70 px-4 py-3 text-center text-sm font-medium text-accent-deep transition-colors hover:bg-surface-2/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
          >
            View all on dashboard
          </Link>
        </div>
      ) : null}
    </div>
  );
}
