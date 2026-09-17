import Link from "next/link";
import type { NotificationRow } from "@/lib/notifications-queries";

/**
 * Prominent callout for recent termination-threshold-crossing
 * notifications, above the (still mock-data-driven, unchanged)
 * AttendanceAlerts section. A narrowly-scoped addition — not a
 * replacement for that section, which is a different concept (a
 * current-risk snapshot vs. this event log).
 */
export function PipNotificationsBanner({
  notifications,
}: {
  notifications: NotificationRow[];
}) {
  if (notifications.length === 0) return null;

  return (
    <section
      className="border-2 border-danger-soft/60 bg-danger-soft/5 px-5 py-5 sm:px-6"
      aria-labelledby="pip-notifications-heading"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2
          id="pip-notifications-heading"
          className="font-display text-lg font-semibold tracking-tight text-danger-soft"
        >
          New termination-threshold flags
        </h2>
        <p className="text-sm tracking-wide text-slate/55 uppercase">
          {notifications.length} recent
        </p>
      </div>
      <ul className="divide-y divide-danger-soft/20">
        {notifications.map((notification) => (
          <li key={notification.id} className="py-2.5 first:pt-0 last:pb-0">
            <Link
              href={`/dashboard/people/${notification.employeeId}`}
              className="flex items-center justify-between gap-4 transition-colors hover:text-accent-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              <span className="min-w-0">
                <span className="font-medium text-ink">
                  {notification.employeeName}
                </span>
                <span className="ml-2 text-sm text-slate/65">
                  {notification.body}
                </span>
              </span>
              {notification.status === "unread" && (
                <span className="shrink-0 border border-danger-soft/40 bg-danger-soft/10 px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.08em] text-danger-soft uppercase">
                  New
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
