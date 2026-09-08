import { unstable_cache } from "next/cache";
import { getOpenAIClient, OPENAI_MODEL } from "@/lib/openai-client";
import { recommendedNextStep } from "@/lib/policy-engine";
import { employeesAtRisk, type AtRiskRow } from "@/lib/insights-queries";
import { getPolicyThresholds } from "@/lib/policy-queries";

/**
 * Per-employee "what to do next" recommendations for the /insights
 * "Employees at risk" section.
 *
 * The grounding fact for every recommendation is
 * recommendedNextStep() (src/lib/policy-engine.ts) — a deterministic
 * template built from the same threshold `.action` copy already shown
 * elsewhere in the app. OpenAI, when configured, only rewrites that
 * template into one more direct sentence per employee; it's fed
 * nothing but the already-computed facts and is explicitly told not
 * to invent names, numbers, or dates. If the API is unavailable, or
 * an employee is missing/malformed in its response, that employee's
 * deterministic text is what renders — the feature's correctness
 * never depends on OpenAI being configured.
 *
 * Same unstable_cache pattern as src/lib/ai-narrative.ts, keyed by the
 * `days` window, 1-hour revalidation.
 */

export type RecommendationItem = {
  employeeId: string;
  name: string;
  text: string;
};

export type AtRiskRecommendations = {
  items: RecommendationItem[];
  source: "openai" | "fallback";
};

function deterministicItems(
  atRisk: AtRiskRow[],
  thresholds: Awaited<ReturnType<typeof getPolicyThresholds>>,
): RecommendationItem[] {
  return atRisk.map((row) => ({
    employeeId: row.employeeId,
    name: row.name,
    text: recommendedNextStep(row.points, row.policyCap, thresholds).text,
  }));
}

async function generateAtRiskRecommendationsUncached(
  days: number,
): Promise<AtRiskRecommendations> {
  const atRisk = await employeesAtRisk(days);
  if (atRisk.length === 0) {
    return { items: [], source: "fallback" };
  }

  const thresholds = await getPolicyThresholds();
  const fallbackItems = deterministicItems(atRisk, thresholds);

  const client = getOpenAIClient();
  if (!client) {
    return { items: fallbackItems, source: "fallback" };
  }

  const factLines = atRisk
    .map((row) => {
      const step = recommendedNextStep(row.points, row.policyCap, thresholds);
      return `- employeeId=${row.employeeId} | name=${row.name} | points=${row.points} | crossedThreshold=${step.thresholdKey ?? "none"} | requiredAction=${step.text}`;
    })
    .join("\n");

  try {
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.3,
      max_tokens: Math.min(60 * atRisk.length, 900),
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an attendance operations analyst writing for a manager dashboard. " +
            "For each employee below, rewrite their already-determined required action into " +
            "one direct, specific sentence a manager can act on today. Use only the facts " +
            "given — never invent names, numbers, or dates. Professional, direct tone. " +
            'Respond as JSON: {"recommendations":[{"employeeId":"...","text":"..."}]}.',
        },
        { role: "user", content: factLines },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return { items: fallbackItems, source: "fallback" };
    }

    const parsed = JSON.parse(raw) as {
      recommendations?: { employeeId?: unknown; text?: unknown }[];
    };
    const byEmployeeId = new Map<string, string>();
    for (const entry of parsed.recommendations ?? []) {
      if (typeof entry.employeeId === "string" && typeof entry.text === "string" && entry.text.trim()) {
        byEmployeeId.set(entry.employeeId, entry.text.trim());
      }
    }

    if (byEmployeeId.size === 0) {
      return { items: fallbackItems, source: "fallback" };
    }

    // Per-row fallback: any employee missing/malformed in the response
    // still gets its deterministic text rather than failing the page.
    const items = fallbackItems.map((item) => ({
      ...item,
      text: byEmployeeId.get(item.employeeId) ?? item.text,
    }));
    return { items, source: "openai" };
  } catch (error) {
    console.error("[ai-recommendations] OpenAI request failed:", error);
    return { items: fallbackItems, source: "fallback" };
  }
}

/**
 * Cached entry point — call this from the page. Cache key is
 * ["insights-recommendations", days], revalidated hourly.
 */
export const generateAtRiskRecommendations = unstable_cache(
  generateAtRiskRecommendationsUncached,
  ["insights-recommendations"],
  { revalidate: 3600, tags: ["insights-recommendations"] },
);
