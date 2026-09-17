import Link from "next/link";
import type { AtRiskRow } from "@/lib/insights-queries";
import { generateAtRiskRecommendations } from "@/lib/ai-recommendations";
import { INSIGHTS_COPY, RISK_LABELS_BY_LANG } from "@/lib/i18n";
import type { RiskLevel } from "@/lib/policy-engine";

type InsightsCopy = (typeof INSIGHTS_COPY)[keyof typeof INSIGHTS_COPY];
type RiskLabels = Record<RiskLevel, string>;

/**
 * "Employees at risk" section on /insights. Split out of page.tsx so
 * the per-employee AI recommendation line can stream in behind its
 * own <Suspense> boundary — same pattern as AiSummaryCard/ai-narrative.ts.
 *
 * AtRiskCard renders today's markup with no recommendation line (used
 * as the Suspense fallback, and as the empty-state when there's
 * nothing to recommend). AtRiskCardWithRecommendations awaits
 * generateAtRiskRecommendations() and renders the same markup plus
 * one grounded "what to do next" sentence per row.
 */

function AtRiskList({
  atRisk,
  copy,
  riskLabels,
  recommendations,
}: {
  atRisk: AtRiskRow[];
  copy: InsightsCopy;
  riskLabels: RiskLabels;
  recommendations?: Map<string, string>;
}) {
  if (atRisk.length === 0) {
    return (
      <div className="border border-line bg-white/60 px-5 py-6 text-sm text-slate/65">
        {copy.atRiskEmpty}
      </div>
    );
  }

  return (
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
                {row.isTerminationFlag && (
                  <span className="shrink-0 border border-danger-soft/40 bg-danger-soft/10 px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.08em] text-danger-soft uppercase">
                    {copy.terminationBadge}
                  </span>
                )}
              </span>
              <span className="block truncate text-sm text-slate/55">
                {row.reason}
              </span>
              {recommendations?.get(row.employeeId) && (
                <span className="mt-1 block text-sm text-slate/70">
                  {recommendations.get(row.employeeId)}
                </span>
              )}
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
  );
}

function AtRiskHeading({
  count,
  copy,
  sourceLabel,
}: {
  count: number;
  copy: InsightsCopy;
  sourceLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2
        id="at-risk-heading"
        className="font-display text-lg font-semibold tracking-tight text-ink"
      >
        {copy.atRiskHeading}
      </h2>
      <p className="text-sm tracking-wide text-slate/55 uppercase">
        {sourceLabel ? `${sourceLabel} · ` : ""}
        {count} {copy.atRiskFlagged}
      </p>
    </div>
  );
}

/** Sync — today's exact markup, no recommendation line. Used as the Suspense fallback. */
export function AtRiskCard({
  atRisk,
  copy = INSIGHTS_COPY.en,
  riskLabels = RISK_LABELS_BY_LANG.en,
}: {
  atRisk: AtRiskRow[];
  copy?: InsightsCopy;
  riskLabels?: RiskLabels;
}) {
  return (
    <section aria-labelledby="at-risk-heading">
      <AtRiskHeading count={atRisk.length} copy={copy} />
      <AtRiskList atRisk={atRisk} copy={copy} riskLabels={riskLabels} />
    </section>
  );
}

/** Async — awaits per-employee AI recommendations, then renders the enriched list. */
export async function AtRiskCardWithRecommendations({
  atRisk,
  days,
  copy = INSIGHTS_COPY.en,
  riskLabels = RISK_LABELS_BY_LANG.en,
}: {
  atRisk: AtRiskRow[];
  days: number;
  copy?: InsightsCopy;
  riskLabels?: RiskLabels;
}) {
  const recommendations = await generateAtRiskRecommendations(days);
  const byEmployeeId = new Map(
    recommendations.items.map((item) => [item.employeeId, item.text]),
  );

  return (
    <section aria-labelledby="at-risk-heading">
      <AtRiskHeading
        count={atRisk.length}
        copy={copy}
        sourceLabel={
          atRisk.length > 0
            ? recommendations.source === "openai"
              ? copy.sourceOpenAI
              : copy.sourceFallback
            : undefined
        }
      />
      <AtRiskList
        atRisk={atRisk}
        copy={copy}
        riskLabels={riskLabels}
        recommendations={byEmployeeId}
      />
    </section>
  );
}
