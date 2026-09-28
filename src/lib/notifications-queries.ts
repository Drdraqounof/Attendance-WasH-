import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { employees, notificationReads, notifications } from "@/db/schema";
import type { StationScope } from "@/lib/access";
import { employeeScopeFilter as scopeFilter } from "@/lib/scope-sql";

/**
 * Drizzle read/write layer for the in-app notification feed — follows
 * the same conventions as policy-queries.ts. Rows are inserted by
 * notifyIfTerminationCrossed() in policy-queries.ts whenever an
 * employee crosses the termination threshold (automated infraction or
 * manual setEmployeeStatus override).
 *
 * Visibility is scoped to the reader's station (via employees.team),
 * and read state is per user (`notification_reads`), so one person
 * marking a notification read never hides it from anyone else. The
 * legacy global `notifications.status` column is no longer written.
 * See docs/auth/roles-and-stations.md.
 */

export type NotificationReader = { email: string; scope: StationScope };

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

/** Most recent notifications in the reader's scope, newest first, with their own read state. */
export async function getNotifications(
  reader: NotificationReader,
  limit = 10,
): Promise<NotificationRow[]> {
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
      readAt: notificationReads.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .innerJoin(employees, eq(notifications.employeeId, employees.id))
    .leftJoin(
      notificationReads,
      and(
        eq(notificationReads.notificationId, notifications.id),
        eq(notificationReads.email, reader.email),
      ),
    )
    .where(scopeFilter(reader.scope))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return rows.map(({ readAt, ...row }) => ({
    ...row,
    status: readAt ? "read" : "unread",
    createdAt: row.createdAt.toISOString(),
  }));
}

/** Ids of in-scope notifications this reader hasn't read yet. */
async function unreadIds(reader: NotificationReader): Promise<number[]> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .innerJoin(employees, eq(notifications.employeeId, employees.id))
    .leftJoin(
      notificationReads,
      and(
        eq(notificationReads.notificationId, notifications.id),
        eq(notificationReads.email, reader.email),
      ),
    )
    .where(and(isNull(notificationReads.notificationId), scopeFilter(reader.scope)));
  return rows.map((row) => row.id);
}

/** Count of this reader's unread notifications, for the bell badge. */
export async function getUnreadNotificationCount(
  reader: NotificationReader,
): Promise<number> {
  return (await unreadIds(reader)).length;
}

/**
 * Marks one notification read for this reader only. No-op (not an
 * error) if already read, missing, or outside their scope.
 */
export async function markNotificationRead(
  reader: NotificationReader,
  id: number,
): Promise<void> {
  const [visible] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .innerJoin(employees, eq(notifications.employeeId, employees.id))
    .where(and(eq(notifications.id, id), scopeFilter(reader.scope)))
    .limit(1);
  if (!visible) return;

  await db
    .insert(notificationReads)
    .values({ notificationId: id, email: reader.email })
    .onConflictDoNothing();
}

/** Marks every in-scope unread notification read for this reader. Returns the count. */
export async function markAllNotificationsRead(
  reader: NotificationReader,
): Promise<number> {
  const ids = await unreadIds(reader);
  if (ids.length === 0) return 0;
  await db
    .insert(notificationReads)
    .values(ids.map((notificationId) => ({ notificationId, email: reader.email })))
    .onConflictDoNothing();
  return ids.length;
}
