import { NextResponse } from "next/server";
import { canVoidEvent, inScope } from "@/lib/access";
import {
  getPointEventForAccess,
  restorePointEvent,
  voidPointEvent,
} from "@/lib/policy-queries";
import { requireApiSession, writeAudit, type ActiveSession } from "@/lib/session";

/**
 * Soft delete for point-ledger events.
 *
 * POST   -> void the event: it stays in the ledger (marked voided) but
 *           stops counting toward points.
 * DELETE -> undo the void.
 *
 * HR may void any event in scope; a supervisor only events they
 * recorded themselves at their own station (src/lib/access.ts
 * ::canVoidEvent). Both actions are written to audit_log.
 */

type RouteContext = { params: Promise<{ id: string }> };

async function authorize(
  request: Request,
  context: RouteContext,
): Promise<{ session: ActiveSession; id: string } | NextResponse> {
  const session = await requireApiSession(request, { mutating: true });
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const event = await getPointEventForAccess(id);
  // Same 404 for missing and out-of-station, so other stations' data isn't revealed.
  if (!event || !inScope(session.scope, event.team)) {
    return NextResponse.json({ error: "Point event not found." }, { status: 404 });
  }
  if (!canVoidEvent(session, event)) {
    return NextResponse.json(
      { error: "Supervisors can only void events they recorded themselves." },
      { status: 403 },
    );
  }
  return { session, id };
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await authorize(request, context);
  if (auth instanceof NextResponse) return auth;

  const changed = await voidPointEvent(auth.id, auth.session.email);
  if (changed) {
    await writeAudit(auth.session, { action: "void", entity: "point_event", entityId: auth.id });
  }
  return NextResponse.json({ ok: true, changed });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await authorize(request, context);
  if (auth instanceof NextResponse) return auth;

  const changed = await restorePointEvent(auth.id);
  if (changed) {
    await writeAudit(auth.session, { action: "restore", entity: "point_event", entityId: auth.id });
  }
  return NextResponse.json({ ok: true, changed });
}
