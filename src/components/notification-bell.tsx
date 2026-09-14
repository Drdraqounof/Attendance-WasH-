"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CHROME_COPY } from "@/lib/i18n";
import type { NotificationRow } from "@/lib/notifications-queries";

const MAX_VISIBLE = 5;

function severityDot(severity: NotificationRow["severity"]): string {
  return severity === "critical" ? "bg-danger-soft" : "bg-danger-soft/55";
}

async function markRead(payload: { id: number } | { all: true }) {
  try {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Best-effort — a failed mark-read shouldn't block navigation or
    // the dropdown from closing.
  }
}

/**
 * Header notification bell — DB-backed via notifications-queries.ts
 * (see src/lib/policy-queries.ts::notifyIfPipCrossed for how rows get
 * created). Renders a floating overlay panel — it's `absolute` inside
 * a `relative` wrapper with a high z-index, so it layers on top of the
 * page instead of pushing content down, and closes on outside click,
 * Escape, or picking a notification.
 */
export function NotificationBell({
  notifications,
  unreadCount,
  copy = CHROME_COPY.en,
}: {
  notifications: NotificationRow[];
  unreadCount: number;
  copy?: (typeof CHROME_COPY)[keyof typeof CHROME_COPY];
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const severityLabels: Record<NotificationRow["severity"], string> = {
    critical: copy.notificationsSeverityCritical,
    warning: copy.notificationsSeverityWarning,
  };

  const visible = notifications.slice(0, MAX_VISIBLE);

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

  async function handleMarkAllRead() {
    await markRead({ all: true });
    router.refresh();
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${copy.notificationsLabel}${unreadCount > 0 ? `, ${unreadCount} ${copy.notificationsUnread}` : ""}`}
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
        {unreadCount > 0 ? (
          <span
            className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center bg-danger-soft px-1 text-[10px] font-semibold text-white tabular-nums"
            aria-hidden
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={copy.notificationsLabel}
          className="absolute top-full right-0 z-50 mt-3 w-80 border border-line bg-white shadow-lg sm:w-96"
        >
          <div className="flex items-baseline justify-between gap-3 border-b border-line/70 px-4 py-3">
            <p className="font-display text-sm font-semibold tracking-tight text-ink">
              {copy.notificationsLabel}
            </p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-sm font-medium text-accent-deep transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {copy.notificationsMarkAllRead}
              </button>
            ) : (
              <p className="text-sm tracking-wide text-slate/55 uppercase">
                {copy.notificationsAllRead}
              </p>
            )}
          </div>

          {visible.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate/65">
              {copy.notificationsEmpty}
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-line/70 overflow-y-auto">
              {visible.map((notification) => (
                <li key={notification.id}>
                  <Link
                    href={`/dashboard/people/${notification.employeeId}`}
                    onClick={() => {
                      setOpen(false);
                      if (notification.status === "unread") {
                        void markRead({ id: notification.id });
                      }
                    }}
                    className="block px-4 py-3 transition-colors hover:bg-surface-2/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 ${
                          notification.status === "unread"
                            ? severityDot(notification.severity)
                            : "bg-slate/25"
                        }`}
                        aria-hidden
                      />
                      <span
                        className={`truncate ${
                          notification.status === "unread"
                            ? "font-medium text-ink"
                            : "text-slate/60"
                        }`}
                      >
                        {notification.employeeName}
                      </span>
                      <span className="ml-auto shrink-0 text-sm font-medium text-danger-soft">
                        {severityLabels[notification.severity]}
                      </span>
                    </div>
                    <p className="mt-1 truncate pl-4 text-sm text-slate/65">
                      {notification.title}
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
            {copy.notificationsViewAll}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
