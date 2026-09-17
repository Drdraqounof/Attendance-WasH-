import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { employees, notifications } from "@/db/schema";

/**
 * Drizzle read/write layer for the in-app notification feed — follows
 * the same conventions as policy-queries.ts. Rows are inserted by
 * notifyIfTerminationCrossed() in policy-queries.ts whenever an
 * employee crosses the termination threshold (automated infraction or
 * manual setEmployeeStatus override). Read-state (`status`/`readAt`) is
 * deliberately decoupled from `warnings.status` — this is a UI
 * nag-suppression concern, not the action-plan/analytics state.
 */

export type NotificationRow = {
  id: number;
  employeeId: string;
  employeeName: string;
  thresholdKey: string;
  pointsAtTrigger: number;
  title: string;
  body: string;
  severity: "critical" | "warning";
  status: "unread" | "read";
  createdAt: string;
};

/** Most recent notifications, newest first, joined to employee name. */
export async function getNotifications(limit = 10): Promise<NotificationRow[]> {
  const rows = await db
    .select({
      id: notifications.id,
      employeeId: notifications.employeeId,
      employeeName: employees.name,
      thresholdKey: notifications.thresholdKey,
      pointsAtTrigger: notifications.pointsAtTrigger,
      title: notifications.title,
      body: notifications.body,
      severity: notifications.severity,
      status: notifications.status,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .innerJoin(employees, eq(notifications.employeeId, employees.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** Count of currently-unread notifications, for the bell badge. */
export async function getUnreadNotificationCount(): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(eq(notifications.status, "unread"));
  return rows.length;
}

/** Marks one notification read. No-op (not an error) if already read or missing. */
export async function markNotificationRead(id: number): Promise<void> {
  await db
    .update(notifications)
    .set({ status: "read", readAt: new Date() })
    .where(eq(notifications.id, id));
}

/** Marks every currently-unread notification read. Returns the count updated. */
export async function markAllNotificationsRead(): Promise<number> {
  const updated = await db
    .update(notifications)
    .set({ status: "read", readAt: new Date() })
    .where(eq(notifications.status, "unread"))
    .returning({ id: notifications.id });
  return updated.length;
}
