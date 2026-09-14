"use client";

import { useState } from "react";
import { INSIGHTS_REPORT_COPY } from "@/lib/i18n";

type Narrative = { text: string; source: "openai" | "fallback" };
type ReportCopy = (typeof INSIGHTS_REPORT_COPY)[keyof typeof INSIGHTS_REPORT_COPY];

/**
 * Body of the /insights/report page: shows the summary that will lead
 * the PDF, lets the manager request changes (POST
 * /api/insights/summary/refine), and downloads the report (POST
 * /api/insights/report with whichever summary text is showing, so the
 * PDF always matches what was reviewed on screen).
 *
 * Previously rendered as an overlay panel anchored to the "Build
 * report" button on /insights — moved to its own page
 * (src/app/insights/report/page.tsx) since the panel clipped/scrolled
 * awkwardly inside the AI summary card.
 */
export function ReportBuilder({
  days,
  initialSummary,
  initialSource,
  copy = INSIGHTS_REPORT_COPY.en,
}: {
  days: number;
  initialSummary: string;
  initialSource: "openai" | "fallback";
  copy?: ReportCopy;
}) {
  const [summary, setSummary] = useState<Narrative>({
    text: initialSummary,
    source: initialSource,
  });
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState<"idle" | "refining" | "downloading">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleRefine() {
    if (!feedback.trim()) return;
    setStatus("refining");
    setError(null);
    try {
      const res = await fetch("/api/insights/summary/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentText: summary.text, feedback }),
      });
      if (!res.ok) throw new Error(copy.errorRefine);
      const data = (await res.json()) as { narrative: Narrative };
      setSummary(data.narrative);
      setFeedback("");
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorGeneric);
    } finally {
      setStatus("idle");
    }
  }

  async function handleDownload() {
    setStatus("downloading");
    setError(null);
    try {
      const res = await fetch("/api/insights/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, narrative: summary }),
      });
      if (!res.ok) throw new Error(copy.errorDownload);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance-insights-${days}d.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorGeneric);
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="border border-line bg-white p-5 sm:p-6">
      <p className="text-sm font-semibold tracking-wide text-slate/55 uppercase">
        {copy.summaryLabel}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate/80">
        {summary.text}
      </p>

      <p className="mt-6 text-sm font-medium text-ink">
        {copy.improveLabel}
      </p>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder={copy.placeholder}
        rows={4}
        className="mt-2 w-full resize-none border border-line px-2.5 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      />

      {error && <p className="mt-2 text-sm text-danger-soft">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleRefine}
          disabled={!feedback.trim() || status === "refining"}
          className="px-3 py-1.5 text-sm font-medium text-slate/75 underline decoration-dotted underline-offset-2 transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "refining" ? copy.updating : copy.updateSummary}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={status === "downloading"}
          className="bg-accent-deep px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "downloading" ? copy.building : copy.downloadPdf}
        </button>
      </div>
    </div>
  );
}
