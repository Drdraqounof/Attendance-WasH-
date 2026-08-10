import OpenAI from "openai";

/**
 * Server-only OpenAI client. Reads OPENAI_API_KEY from the environment
 * (see .env, git-ignored). Returns null when the key isn't configured so
 * callers can fall back to the rule-based mock instead of throwing.
 *
 * Never import this from a "use client" component — it must stay
 * server-side so the key is never bundled to the browser.
 */

let cachedClient: OpenAI | null = null;
let cachedForKey: string | null = null;

export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  if (!cachedClient || cachedForKey !== apiKey) {
    cachedClient = new OpenAI({ apiKey });
    cachedForKey = apiKey;
  }
  return cachedClient;
}

export const OPENAI_MODEL = "gpt-4o-mini";
