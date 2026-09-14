import { NextResponse } from "next/server";
import type { InsightsNarrative } from "@/lib/ai-narrative";
import { hasDemoSession } from "@/lib/auth-mock";
import { parseDays } from "@/lib/insights-days";
import { generateInsightsReportPdf } from "@/lib/insights-report";

/**
 * Powers the "Build report" button on /insights — streams back the
 * same lateness/causes/at-risk/reliability data (plus the AI summary)
 * shown on the page, rendered as a downloadable PDF by
 * src/lib/insights-report.ts.
 *
 * pdfkit needs Node APIs (streams/Buffer), so this route runs on the
 * Node.js runtime rather than the default edge-compatible one.
 */
export const runtime = "nodejs";

function pdfResponse(pdf: Buffer, days: number): NextResponse {
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="attendance-insights-${days}d.pdf"`,
      "Content-Length": String(pdf.byteLength),
      "Cache-Control": "no-store",
    },
  });
}

/** Quick default download — the report's standard cached AI summary. */
export async function GET(request: Request) {
  const signedIn = await hasDemoSession();
  if (!signedIn) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseDays(searchParams.get("days"));

  const pdf = await generateInsightsReportPdf(days);
  return pdfResponse(pdf, days);
}

/**
 * Used once the manager has reviewed (and optionally refined via
 * /api/insights/summary/refine) the summary in
 * src/app/insights/report/report-builder.tsx — embeds that exact summary in
 * the PDF instead of re-fetching the default cached one.
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

  const rawDays =
    typeof body === "object" && body !== null && "days" in body
      ? (body as { days: unknown }).days
      : undefined;
  const narrative =
    typeof body === "object" && body !== null && "narrative" in body
      ? (body as { narrative: unknown }).narrative
      : undefined;

  const days = parseDays(typeof rawDays === "number" ? String(rawDays) : undefined);

  let narrativeOverride: InsightsNarrative | undefined;
  if (
    typeof narrative === "object" &&
    narrative !== null &&
    "text" in narrative &&
    typeof (narrative as { text: unknown }).text === "string"
  ) {
    const source = (narrative as { source?: unknown }).source;
    narrativeOverride = {
      text: (narrative as { text: string }).text,
      source: source === "openai" ? "openai" : "fallback",
    };
  }

  const pdf = await generateInsightsReportPdf(days, narrativeOverride);
  return pdfResponse(pdf, days);
}
