import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OpsShell } from "@/components/ops-shell";
import type { TrendDirection } from "@/lib/ai-analysis-mock";
import { hasDemoSession } from "@/lib/auth-mock";
import {
  INSIGHTS_COPY,
  RISK_LABELS_BY_LANG,
  TREND_LABELS_BY_LANG,
} from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { DAY_WINDOWS, parseDays } from "@/lib/insights-days";
import {
  employeesAtRisk,
  frequentLatenessPatterns,
  reliabilityRanking,
  signalTypeBreakdown,
} from "@/lib/insights-queries";
import { AiSummaryCard, AiSummaryCardSkeleton } from "./ai-summary-card";

export const metadata: Metadata = {
  title: "AI Attendance Analysis",
};

const RELIABILITY_LIMIT = 10;

function trendTone(trend: TrendDirection): string {
  if (trend === "improving") return "text-accent-deep";
  if (trend === "worsening") return "text-danger-soft";
  return "text-slate/65";
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams?: Promise<{ days?: string }>;
}) {
  const signedIn = await hasDemoSession();
  if (!signedIn) {
    redirect("/login");
  }

  const lang = await getLang();
  const copy = INSIGHTS_COPY[lang];
  const riskLabels = RISK_LABELS_BY_LANG[lang];
  const trendLabels = TREND_LABELS_BY_LANG[lang];
  const CAPABILITIES = [
    copy.capability1,
    copy.capability2,
    copy.capability3,
    copy.capability4,
    copy.capability5,
  ] as const;

  const days = parseDays((await searchParams)?.days);

  // Deterministic sections read straight from Neon (src/lib/insights-queries.ts) —
  // fast queries, awaited directly. Only the AI summary (below) is
  // isolated behind its own <Suspense> boundary, since that's the call
  // with real network/latency risk (OpenAI).
  const [lateness, causes, atRisk, ranking] = await Promise.all([
    frequentLatenessPatterns(days, 3),
    signalTypeBreakdown(days),
    employeesAtRisk(days),
    reliabilityRanking(days, RELIABILITY_LIMIT),
  ]);
  const maxCauseCount = causes[0]?.count ?? 1;

  return (
    <OpsShell active="insights">
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-6 py-8 sm:px-8 sm:py-10">
        <div className="animate-fade-up">
          <div className="live-pulse mb-4 h-[3px] w-14 sm:w-20" aria-hidden />
          <p className="text-sm font-semibold tracking-[0.16em] text-slate/55 uppercase">
            {copy.eyebrow}
          </p>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {copy.heading}
            </h1>
            <nav
              className="flex items-center gap-1 border border-line bg-white/60 p-1 text-sm"
              aria-label="Time window"
            >
              {DAY_WINDOWS.map((window) => (
                <Link
                  key={window}
                  href={`/insights?days=${window}`}
                  className={`px-3 py-1.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    window === days
                      ? "bg-accent-deep text-white"
                      : "text-slate/65 hover:text-ink"
                  }`}
                  aria-current={window === days ? "true" : undefined}
                >
                  {window}d
                </Link>
              ))}
            </nav>
          </div>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate/75">
            {copy.intro}
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {CAPABILITIES.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2.5 text-sm text-slate/75"
              >
                <span className="h-1.5 w-1.5 shrink-0 bg-accent" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* AI-generated executive summary — streams in independently */}
        <Suspense fallback={<AiSummaryCardSkeleton />}>
          <AiSummaryCard days={days} copy={copy} />
        </Suspense>

        {/* Frequent lateness patterns */}
        <section
          className="animate-fade-up-delay-1 mt-10"
          aria-labelledby="lateness-heading"
        >
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2
              id="lateness-heading"
              className="font-display text-lg font-semibold tracking-tight text-ink"
            >
              {copy.latenessHeading}
            </h2>
            <p className="text-sm tracking-wide text-slate/55 uppercase">
              {copy.latenessSubLead} {days} {copy.daysWord}
            </p>
          </div>
          {lateness.length === 0 ? (
            <div className="border border-line bg-white/60 px-5 py-6 text-sm text-slate/65">
              {copy.latenessEmpty}
            </div>
          ) : (
            <ul className="divide-y divide-line/70 border border-line bg-white/65">
              {lateness.map((row) => (
                <li key={row.employeeId} className="px-4 py-4 sm:px-5">
                  <Link
                    href={`/dashboard/people/${row.employeeId}`}
                    className="font-medium text-ink transition-colors hover:text-accent-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                  >
                    {row.name}
                  </Link>
                  <p className="mt-1 text-sm text-slate/70">
                    &ldquo;{row.narrative}&rdquo;
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="animate-fade-up-delay-2 mt-10 grid gap-8 lg:grid-cols-2">
          {/* Common causes */}
          <section aria-labelledby="causes-heading">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2
                id="causes-heading"
                className="font-display text-lg font-semibold tracking-tight text-ink"
              >
                {copy.causesHeading}
              </h2>
            </div>
            <ul className="divide-y divide-line/70 border border-line bg-white/65">
              {causes.map((row) => (
                <li key={row.type} className="px-4 py-3 sm:px-5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-slate/80">{row.type}</span>
                    <span className="font-display font-semibold tabular-nums text-ink">
                      {row.count}
                    </span>
                  </div>
                  <div className="mt-2 h-1 bg-surface-2">
                    <div
                      className="h-full bg-accent-deep/70"
                      style={{
                        width: `${(row.count / maxCauseCount) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* At-risk employees */}
          <section aria-labelledby="at-risk-heading">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2
                id="at-risk-heading"
                className="font-display text-lg font-semibold tracking-tight text-ink"
              >
                {copy.atRiskHeading}
              </h2>
              <p className="text-sm tracking-wide text-slate/55 uppercase">
                {atRisk.length} {copy.atRiskFlagged}
              </p>
            </div>
            {atRisk.length === 0 ? (
              <div className="border border-line bg-white/60 px-5 py-6 text-sm text-slate/65">
                {copy.atRiskEmpty}
              </div>
            ) : (
              <ul className="divide-y divide-line/70 border border-line bg-white/65">
                {atRisk.map((row) => (
                  <li key={row.employeeId}>
                    <Link
                      href={`/dashboard/people/${row.employeeId}`}
                      className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-surface-2/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:px-5"
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="block truncate font-medium text-ink">
                            {row.name}
                          </span>
                          {row.isPipFlag && (
                            <span className="shrink-0 border border-danger-soft/40 bg-danger-soft/10 px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.08em] text-danger-soft uppercase">
                              {copy.onPipBadge}
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-sm text-slate/55">
                          {row.reason}
                        </span>
                      </span>
                      <span className="font-display shrink-0 text-sm font-semibold tabular-nums text-danger-soft">
                        {row.points} pts
                        <span className="ml-1.5 font-sans text-sm font-medium text-slate/55">
                          · {riskLabels[row.riskLevel]}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Attendance points & improvement trends */}
        <section
          className="animate-fade-up-delay-3 mt-10"
          aria-labelledby="reliability-heading"
        >
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2
              id="reliability-heading"
              className="font-display text-lg font-semibold tracking-tight text-ink"
            >
              {copy.reliabilityHeading}
            </h2>
            <p className="text-sm tracking-wide text-slate/55 uppercase">
              {copy.reliabilityTop} {RELIABILITY_LIMIT} · {copy.reliabilityVsPrior} {days} {copy.daysWord}
            </p>
          </div>
          <div className="overflow-x-auto border border-line bg-white/65">
            <table className="w-full min-w-[24rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line/80 text-sm tracking-[0.12em] text-slate/60 uppercase">
                  <th className="px-4 py-2.5 font-semibold sm:px-5">
                    {copy.thEmployee}
                  </th>
                  <th className="px-2 py-2.5 text-right font-semibold">
                    {copy.thPointsStatus}
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold sm:px-5">
                    {copy.thTrend}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((row) => (
                  <tr
                    key={row.employeeId}
                    className="border-b border-line/70 last:border-b-0"
                  >
                    <td className="px-4 py-3 sm:px-5">
                      <Link
                        href={`/dashboard/people/${row.employeeId}`}
                        className="font-medium text-ink transition-colors hover:text-accent-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-2 py-3 text-right font-display font-semibold tabular-nums text-ink">
                      {row.points} pts
                      <span className="ml-1.5 font-sans text-sm font-medium text-slate/55">
                        · {riskLabels[row.riskLevel]}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium sm:px-5 ${trendTone(row.trend)}`}
                    >
                      {trendLabels[row.trend]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-10 border-t border-line/70 pt-5 text-sm tracking-wide text-slate/50">
          {copy.footer}
        </p>
      </main>
    </OpsShell>
  );
}
