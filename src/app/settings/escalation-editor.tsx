"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SETTINGS_COPY } from "@/lib/i18n";
import type { EscalationRule, EscalationRuleCode } from "@/lib/policy-engine";

/**
 * Lets a signed-in user retune how many points each escalation tier is
 * worth. See docs/policy/policy-thresholds-editing.md.
 */
export function EscalationEditor({
  initialRules,
  copy = SETTINGS_COPY.en,
}: {
  initialRules: EscalationRule[];
  copy?: (typeof SETTINGS_COPY)[keyof typeof SETTINGS_COPY];
}) {
  const router = useRouter();
  const [rules, setRules] = useState(initialRules);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialRules.map((r) => [r.code, String(r.points)])),
  );
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(code: EscalationRuleCode) {
    const draft = drafts[code];
    const points = Number(draft);
    if (!Number.isInteger(points) || points <= 0) {
      setError(copy.errorPositiveInt);
      return;
    }

    setPendingCode(code);
    setError(null);
    try {
      const response = await fetch("/api/escalation-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, points }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? copy.errorUpdateFailed);
      }
      setRules(body.rules);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorUpdateFailed);
    } finally {
      setPendingCode(null);
    }
  }

  return (
    <section>
      <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
        {copy.escalationHeading}
      </h2>
      <ul className="mt-3 divide-y divide-line/70 border border-line bg-white/65">
        {rules.map((rule) => (
          <li
            key={rule.code}
            className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5"
          >
            <span className="text-sm text-slate/80">{rule.label}</span>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-display text-sm font-semibold text-danger-soft">
                +
              </span>
              <input
                type="number"
                min={1}
                value={drafts[rule.code] ?? ""}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [rule.code]: e.target.value }))
                }
                className="font-display w-16 border border-line bg-white px-2 py-1 text-sm font-semibold tabular-nums text-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                aria-label={`${rule.label} points`}
              />
              <button
                type="button"
                onClick={() => handleSave(rule.code)}
                disabled={pendingCode === rule.code}
                className="inline-flex h-8 items-center border border-accent-deep/40 bg-accent-deep/10 px-3 text-sm font-semibold text-accent-deep transition-colors hover:bg-accent-deep/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingCode === rule.code ? copy.saving : copy.save}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error ? (
        <p className="mt-2 text-sm text-danger-soft">{error}</p>
      ) : null}
    </section>
  );
}
