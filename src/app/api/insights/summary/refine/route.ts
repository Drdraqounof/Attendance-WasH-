import { NextResponse } from "next/server";
import { hasDemoSession } from "@/lib/auth-mock";
import { refineInsightsNarrative } from "@/lib/ai-narrative";

/**
 * Powers the "Any improvements before I build the report?" step in
 * src/app/insights/report/report-builder.tsx — takes the summary currently
 * shown on /insights plus free-text feedback from the manager, and
 * returns a revised version to preview (and, if they proceed, embed
 * in the PDF via POST /api/insights/report).
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

  const currentText =
    typeof body === "object" && body !== null && "currentText" in body
      ? (body as { currentText: unknown }).currentText
      : undefined;
  const feedback =
    typeof body === "object" && body !== null && "feedback" in body
      ? (body as { feedback: unknown }).feedback
      : undefined;

  if (typeof currentText !== "string" || typeof feedback !== "string" || !feedback.trim()) {
    return NextResponse.json(
      { error: "currentText (string) and feedback (non-empty string) are required." },
      { status: 400 },
    );
  }

  const narrative = await refineInsightsNarrative({ currentText, feedback });
  return NextResponse.json({ narrative });
}
