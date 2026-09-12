"use client";

import { useId, useState } from "react";

type Narrative = { text: string; source: "openai" | "fallback" };

/**
 * "Build report" control for the AI Summary card. Rendered next to
 * the summary heading (src/app/insights/ai-summary-card.tsx) since the
 * report's headline content *is* that summary — this lets the manager
 * see exactly what will be included, ask for changes, and only then
 * download the PDF.
 *
 * Flow: open panel → show current summary → optionally type feedback
 * and refine it (POST /api/insights/summary/refine) → download
 * (POST /api/insights/report with whichever summary text is showing,
 * so the PDF always matches what was reviewed on screen).
 */
export function ReportBuilder({
  days,
  initialSummary,
  initialSource,
}: {
  days: number;
  initialSummary: string;
  initialSource: "openai" | "fallback";
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
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
      if (!res.ok) throw new Error("Couldn't update the summary. Try again.");
      const data = (await res.json()) as { narrative: Narrative };
      setSummary(data.narrative);
      setFeedback("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
      if (!res.ok) throw new Error("Couldn't build the report. Try again.");
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
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="border border-line bg-white/60 px-3 py-1.5 text-sm font-medium text-slate/75 transition-colors hover:bg-ink hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Build report
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 z-20 mt-2 w-[min(24rem,90vw)] border border-line bg-white p-4 shadow-lg"
        >
          <p className="text-sm font-semibold tracking-wide text-slate/55 uppercase">
            This is the summary that will go in the report
          </p>
          <p className="mt-2 max-h-40 overflow-y-auto text-sm leading-relaxed text-slate/80">
            {summary.text}
          </p>

          <p className="mt-4 text-sm font-medium text-ink">
            Want any improvements before you download it?
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g. keep it shorter, lead with the PIP employees, focus on trends…"
            rows={3}
            className="mt-2 w-full resize-none border border-line px-2.5 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          />

          {error && <p className="mt-2 text-sm text-danger-soft">{error}</p>}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleRefine}
              disabled={!feedback.trim() || status === "refining"}
              className="px-3 py-1.5 text-sm font-medium text-slate/75 underline decoration-dotted underline-offset-2 transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "refining" ? "Updating…" : "Update summary"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={status === "downloading"}
              className="bg-accent-deep px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "downloading" ? "Building…" : "Download PDF"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
