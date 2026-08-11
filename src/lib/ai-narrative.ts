import { unstable_cache } from "next/cache";
import { getOpenAIClient, OPENAI_MODEL } from "@/lib/openai-client";
import {
  employeesAtRisk,
  frequentLatenessPatterns,
  reliabilityRanking,
  signalTypeBreakdown,
  type AtRiskRow,
  type LatenessPatternRow,
  type ReliabilityRow,
  type SignalTypeRow,
} from "@/lib/insights-queries";

/**
 * AI narrative layer for the Insights page.
 *
 * The underlying numbers (lateness counts, risk scores, trends) stay
 * rule-based — computed by src/lib/insights-queries.ts straight from
 * Neon. OpenAI only turns those numbers into a written executive
 * summary. Falls back to a static line if the key is missing or the
 * request fails, so the page never breaks on API issues.
 *
 * The whole thing is wrapped in `unstable_cache`, keyed by the `days`
 * window, with a 1-hour revalidation — so repeat page loads for the
 * same window don't re-run the OpenAI call (or the four queries that
 * feed its prompt) every time. next.config.ts doesn't have
 * `cacheComponents` enabled, so `unstable_cache` (not the `"use
 * cache"` directive) is the correct API here — see
 * node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md.
 */

export type InsightsNarrative = {
  text: string;
  source: "openai" | "fallback";
};

const FALLBACK_TEXT =
  "AI-written summary unavailable right now — showing rule-based analysis only below. Configure OPENAI_API_KEY in .env to enable AI-generated summaries.";

function buildPrompt(input: {
  lateness: LatenessPatternRow[];
  causes: SignalTypeRow[];
  atRisk: AtRiskRow[];
  ranking: ReliabilityRow[];
  days: number;
}): string {
  const latenessLines =
    input.lateness
      .map((row) => `- ${row.name}: ${row.lateCount} late arrivals`)
      .join("\n") || "- none flagged";

  const causeLines =
    input.causes.map((row) => `- ${row.type}: ${row.count}`).join("\n") ||
    "- none recorded";

  const atRiskLines =
    input.atRisk
      .map(
        (row) =>
          `- ${row.name}: reliability ${row.reliabilityScore}/100 — ${row.reason}`,
      )
      .join("\n") || "- none flagged";

  const rankingLines =
    input.ranking
      .slice(0, 5)
      .map((row) => `- ${row.name}: ${row.score}/100, trend ${row.trend}`)
      .join("\n") || "- no data";

  return [
    `Frequent lateness patterns (last ${input.days} days):`,
    latenessLines,
    "",
    "Common causes of attendance issues:",
    causeLines,
    "",
    "Employees at risk:",
    atRiskLines,
    "",
    "Top reliability scores (highest 5):",
    rankingLines,
  ].join("\n");
}

async function generateInsightsNarrativeUncached(
  days: number,
): Promise<InsightsNarrative> {
  const client = getOpenAIClient();
  if (!client) {
    return { text: FALLBACK_TEXT, source: "fallback" };
  }

  // Same window the page's deterministic sections use, fetched here too
  // so the prompt and the on-page numbers can never drift apart.
  const [lateness, causes, atRisk, ranking] = await Promise.all([
    frequentLatenessPatterns(days),
    signalTypeBreakdown(days),
    employeesAtRisk(days),
    reliabilityRanking(days),
  ]);

  try {
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.4,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content:
            "You are an attendance operations analyst writing for a manager dashboard. " +
            "Write a concise 3-5 sentence executive summary of the attendance signals given. " +
            "Only use the numbers provided — never invent data. Professional, direct tone.",
        },
        { role: "user", content: buildPrompt({ lateness, causes, atRisk, ranking, days }) },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      return { text: FALLBACK_TEXT, source: "fallback" };
    }
    return { text, source: "openai" };
  } catch (error) {
    console.error("[ai-narrative] OpenAI request failed:", error);
    return { text: FALLBACK_TEXT, source: "fallback" };
  }
}

/**
 * Cached entry point — call this from the page. Cache key is
 * ["insights-narrative", days], revalidated hourly.
 */
export const generateInsightsNarrative = unstable_cache(
  generateInsightsNarrativeUncached,
  ["insights-narrative"],
  { revalidate: 3600, tags: ["insights-narrative"] },
);
