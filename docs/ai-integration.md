# AI Integration — OpenAI Narrative Layer

**Date added:** 2026-08-10 · **Updated:** 2026-08-11 (streaming + caching + DB-backed queries)
**Status:** Connected (live), narrative layer only
**Provider:** OpenAI (`gpt-4o-mini`)

## What this is

The `/insights` (AI Attendance Analysis) page previously showed only
rule-based, template-string narratives derived from mock point ledgers
(`src/lib/ai-analysis-mock.ts`). As of 2026-08-10, an OpenAI key was added
and wired in to generate a written **executive summary** on that page.
As of 2026-08-11, that summary streams in independently and is cached,
and both it and the deterministic sections read from Neon instead of
the mock files — see "2026-08-11 changes" below.

The underlying numbers are still 100% rule-based and are the source of
truth:

- Lateness counts, at-risk flags, reliability scores, and trend direction
  all come from `src/lib/insights-queries.ts`, computed with Drizzle
  queries against the live `employees` / `point_events` tables (schema
  in `docs/database.md`).
- OpenAI is **not** used to compute scores, flags, or trends — only to
  turn the already-computed numbers into a readable paragraph.

This keeps the demo's numbers deterministic and testable while adding a
real AI-written summary on top.

## Files

| File | Purpose |
| --- | --- |
| `.env` | Holds `OPENAI_API_KEY` (git-ignored — never committed). |
| `src/lib/openai-client.ts` | Lazily creates a server-only `OpenAI` client from `process.env.OPENAI_API_KEY`. Returns `null` if unset. |
| `src/lib/insights-queries.ts` | Drizzle queries (`frequentLatenessPatterns`, `signalTypeBreakdown`, `employeesAtRisk`, `reliabilityRanking`) that feed both the page's deterministic sections and the AI prompt, parameterized by a `days` window. |
| `src/lib/ai-narrative.ts` | Calls the four query functions above to build a prompt, then calls `gpt-4o-mini` (chat.completions) to produce a 3–5 sentence summary. Wrapped in `unstable_cache` (1-hour revalidate, keyed by `days`). Falls back to a static message on missing key or request failure — never throws. |
| `src/app/insights/ai-summary-card.tsx` | `AiSummaryCard` (calls `generateInsightsNarrative`) + `AiSummaryCardSkeleton`, isolated so the card can stream independently. |
| `src/app/insights/page.tsx` | Reads `?days=` from `searchParams`, awaits the deterministic sections directly, and renders `AiSummaryCard` inside a `<Suspense>` boundary. |

## How the connection works

1. `OPENAI_API_KEY` is read server-side only, from `.env` (Next.js loads
   `.env` automatically; confirmed via `next build` env report).
2. `getOpenAIClient()` in `openai-client.ts` instantiates the `openai` SDK
   client once and caches it.
3. `generateInsightsNarrative(days)` in `ai-narrative.ts` runs the four
   `insights-queries.ts` functions for that window, builds a prompt from
   the results, with an instruction to only use the numbers given (no
   invented data).
4. `AiSummaryCard` (a separate async server component) awaits that call
   and displays the text in a bordered "AI summary" card, inside a
   `<Suspense>` boundary on the page — see "2026-08-11 changes" below.
5. If the key is missing or the OpenAI request fails for any reason
   (network, quota, auth), the page renders a fixed fallback sentence
   instead of erroring — the rest of the page (rule-based sections)
   is unaffected either way.

## 2026-08-11 changes

- **Streaming**: `InsightsPage` no longer awaits the OpenAI call
  directly. `AiSummaryCard` is its own async component, wrapped in
  `<Suspense fallback={<AiSummaryCardSkeleton />}>` — the lateness,
  causes, at-risk, and reliability sections render immediately;
  the AI summary streams in once the (cached) call resolves.
- **Caching**: `generateInsightsNarrative` is wrapped in
  `unstable_cache(fn, ["insights-narrative"], { revalidate: 3600, tags:
  ["insights-narrative"] })`. `next.config.ts` does not set
  `cacheComponents: true`, so `unstable_cache` — not the `"use cache"`
  directive — is the correct API for this Next 16 app; see
  `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`.
  Verified: a repeat request for the same `days` window returned in
  ~0.5s instead of re-running the OpenAI round trip.
- **Real queries, not mocks**: the prompt is now built from
  `insights-queries.ts` (Drizzle/Neon), the same functions the page's
  visible sections use — so the AI summary and the numbers on screen
  can never drift apart.
- **Time window**: `days` (7/30/90, default 30) flows from the page's
  `?days=` query param into both the deterministic queries and the
  cache key, so cached summaries are correctly scoped per window.

## Verification performed

**2026-08-10** (initial connection):
- `npx next build` — compiles and type-checks cleanly with the new files.
- Direct SDK smoke test against the live key (`gpt-4o-mini`, minimal
  prompt) returned a successful completion, confirming the key and
  network path both work before wiring it into the page.

**2026-08-11** (streaming/caching/DB-backed rewrite):
- `npx next build` and `npx vitest run` (29/29) both pass.
- Live `curl` against a running dev server with `?days=7`, `?days=30`,
  `?days=90` — confirmed the lateness/causes/at-risk/reliability
  numbers actually change per window (not a static mock).
- Repeat request for `?days=30` returned in ~0.5s and reported the
  same `narrative.source`, confirming the cache is being hit rather
  than re-calling OpenAI.

## Operational notes

- **Cost**: one small chat completion (`max_tokens: 220`) per unique
  `days` window per hour, thanks to the `unstable_cache` revalidation —
  not per page load.
- **Secrets**: `.env` is git-ignored (`.gitignore` → `.env*`). Never log
  or print `OPENAI_API_KEY` in full; `openai-client.ts` never surfaces it
  to the client bundle since it's only imported from server components.
- **Model**: pinned to `gpt-4o-mini` via `OPENAI_MODEL` in
  `openai-client.ts` — change there if a different model is preferred.
- **Failure mode**: intentionally soft-fails to a static sentence rather
  than breaking the page, since this is a narrative *enhancement*, not
  the source of truth for any number shown.
