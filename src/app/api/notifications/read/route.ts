import { NextResponse } from "next/server";
import { hasDemoSession } from "@/lib/auth-mock";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications-queries";

/**
 * POST { id: number } | { all: true } -> marks one or all notifications
 * read. Same gating/shape as src/app/api/warnings/route.ts — any
 * signed-in user (hasDemoSession()), no manager/admin role system yet.
 */
export async function POST(request: Request) {
  const signedIn = await hasDemoSession();
  if (!signedIn) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

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
      const count = await markAllNotificationsRead();
      return NextResponse.json({ ok: true, count });
    }

    if (typeof id === "number" && Number.isInteger(id)) {
      await markNotificationRead(id);
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
