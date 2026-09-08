import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OpsShell } from "@/components/ops-shell";
import { hasDemoSession } from "@/lib/auth-mock";
import { ESCALATION_RULES, POLICY_THRESHOLDS } from "@/lib/policy-engine";
import { getPolicyThresholds } from "@/lib/policy-queries";
import { AutomationToggles } from "./automation-toggles";
import { ThresholdEditor } from "./threshold-editor";

export const metadata: Metadata = {
  title: "Settings & automation",
};

function EscalationTable() {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
        Attendance escalation schedule
      </h2>
      <ul className="mt-3 divide-y divide-line/70 border border-line bg-white/65">
        {ESCALATION_RULES.map((rule) => (
          <li
            key={rule.code}
            className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5"
          >
            <span className="text-sm text-slate/80">{rule.label}</span>
            <span className="font-display shrink-0 text-sm font-semibold tabular-nums text-danger-soft">
              +{rule.points}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function SettingsPage() {
  const signedIn = await hasDemoSession();
  if (!signedIn) {
    redirect("/login");
  }

  // Thresholds are DB-backed and editable (see
  // docs/policy-thresholds-editing.md) — degrade to the static
  // defaults, read-only, if the DB is unreachable rather than
  // crashing the page.
  let thresholds = POLICY_THRESHOLDS;
  let thresholdsEditable = true;
  try {
    thresholds = await getPolicyThresholds();
  } catch {
    thresholdsEditable = false;
  }

  return (
    <OpsShell active="settings">
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-6 py-8 sm:px-8 sm:py-10">
        <div className="animate-fade-up">
          <div className="live-pulse mb-4 h-[3px] w-14 sm:w-20" aria-hidden />
          <p className="text-sm font-semibold tracking-[0.16em] text-slate/55 uppercase">
            Settings
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Settings &amp; automation
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate/75">
            Policy rules behind the point system, plus which automations are
            active for this floor.
          </p>
        </div>

        {/* Automation toggles */}
        <section
          className="animate-fade-up-delay-1 mt-10"
          aria-labelledby="automation-heading"
        >
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2
              id="automation-heading"
              className="font-display text-lg font-semibold tracking-tight text-ink"
            >
              Automation
            </h2>
            <p className="text-sm tracking-wide text-slate/55 uppercase">
              Saved to this browser
            </p>
          </div>
          <AutomationToggles />
        </section>

        {/* Automated policy thresholds */}
        <section
          className="animate-fade-up-delay-2 mt-10"
          aria-labelledby="thresholds-heading"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2
              id="thresholds-heading"
              className="font-display text-lg font-semibold tracking-tight text-ink"
            >
              Automated policy thresholds
            </h2>
            {!thresholdsEditable && (
              <p className="text-sm tracking-wide text-danger-soft uppercase">
                Read-only — live thresholds unavailable
              </p>
            )}
          </div>

          {thresholdsEditable ? (
            <ThresholdEditor initialThresholds={thresholds} />
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
              {thresholds.map((threshold) => (
                <div key={threshold.key} className="bg-white/80 px-5 py-4">
                  <p className="text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
                    {threshold.label}
                  </p>
                  <p className="font-display mt-1 text-xl font-bold text-ink">
                    {threshold.pointValue} pts
                  </p>
                  <p className="mt-1 text-sm text-slate/65">
                    {threshold.action}
                  </p>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 text-sm text-slate/65">
            0 points is perfect attendance — every employee starts there and
            only accrues points through the escalation schedule below.
            Crossing a threshold above drives the dashboard, analytics, and
            alert severity across the app. All three thresholds are editable
            above — changing PIP also updates every employee's point cap,
            since PIP is defined as the cap.
          </p>
        </section>

        {/* Escalation schedule */}
        <div className="animate-fade-up-delay-3 mt-10">
          <EscalationTable />
        </div>

        <p className="mt-10 border-t border-line/70 pt-5 text-sm tracking-wide text-slate/50">
          Demo data · toggles persist to this browser only, not a backend ·
          SMS intake not connected
        </p>
      </main>
    </OpsShell>
  );
}
