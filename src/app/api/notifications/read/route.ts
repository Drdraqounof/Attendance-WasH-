import { NextResponse } from "next/server";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications-queries";
import { requireApiSession } from "@/lib/session";

/**
 * POST { id: number } | { all: true } -> marks one or all notifications
 * read *for the signed-in user only* (notification_reads), limited to
 * their active station. Other users' read state is untouched.
 */
export async function POST(request: Request) {
  const session = await requireApiSession(request, { mutating: true });
  if (session instanceof NextResponse) return session;
  const reader = { email: session.email, scope: session.scope };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { id, all } = body as { id?: unknown; all?: unknown };

  try {
    if (all === true) {
      const count = await markAllNotificationsRead(reader);
      return NextResponse.json({ ok: true, count });
    }

    if (typeof id === "number" && Number.isInteger(id)) {
      await markNotificationRead(reader, id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: "Provide either a numeric id or all: true." },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
