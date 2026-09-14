import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OpsShell } from "@/components/ops-shell";
import { generateInsightsNarrative } from "@/lib/ai-narrative";
import { hasDemoSession } from "@/lib/auth-mock";
import { INSIGHTS_REPORT_COPY } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { parseDays } from "@/lib/insights-days";
import { ReportBuilder } from "./report-builder";

export const metadata: Metadata = {
  title: "Build Attendance Report",
};

/**
 * Full page version of the "Build report" flow — previously an overlay
 * panel anchored to the "Build report" button on /insights
 * (src/app/insights/ai-summary-card.tsx), which clipped/scrolled
 * awkwardly inside the card. Now its own route so the review → refine
 * → download flow gets the whole viewport.
 */
export default async function ReportBuilderPage({
  searchParams,
}: {
  searchParams?: Promise<{ days?: string }>;
}) {
  const signedIn = await hasDemoSession();
  if (!signedIn) {
    redirect("/login");
  }

  const days = parseDays((await searchParams)?.days);
  const narrative = await generateInsightsNarrative(days);
  const lang = await getLang();
  const copy = INSIGHTS_REPORT_COPY[lang];

  return (
    <OpsShell active="insights">
      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-6 py-8 sm:px-8 sm:py-10">
        <div className="animate-fade-up">
          <Link
            href={`/insights?days=${days}`}
            className="text-sm font-medium text-slate/60 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <span aria-hidden>←</span> {copy.backToInsights}
          </Link>
          <p className="mt-4 text-sm font-semibold tracking-[0.16em] text-slate/55 uppercase">
            {copy.eyebrow}
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {copy.heading}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate/75">
            {copy.lastWord} {days} {copy.daysWord} · {copy.subheadingRest}
          </p>
        </div>

        <div className="animate-fade-up-delay-1 mt-8">
          <ReportBuilder
            days={days}
            initialSummary={narrative.text}
            initialSource={narrative.source}
            copy={copy}
          />
        </div>
      </main>
    </OpsShell>
  );
}
