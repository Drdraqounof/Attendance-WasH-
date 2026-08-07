import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OpsShell } from "@/components/ops-shell";
import { hasDemoSession } from "@/lib/auth-mock";
import { RISK_THRESHOLDS } from "@/lib/dashboard-mock";
import {
  DEDUCTION_RULES,
  POSITIVE_POINT_RULES,
  type PointRule,
} from "@/lib/settings-mock";
import { AutomationToggles } from "./automation-toggles";

export const metadata: Metadata = {
  title: "Settings & automation",
};

function RuleTable({
  title,
  rules,
  toneClass,
}: {
  title: string;
  rules: PointRule[];
  toneClass: string;
}) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
        {title}
      </h2>
      <ul className="mt-3 divide-y divide-line/70 border border-line bg-white/65">
        {rules.map((rule) => (
          <li
            key={rule.label}
            className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5"
          >
            <span className="text-sm text-slate/80">{rule.label}</span>
            <span
              className={`font-display shrink-0 text-sm font-semibold tabular-nums ${toneClass}`}
            >
              {rule.value}
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

        {/* Risk thresholds */}
        <section
          className="animate-fade-up-delay-2 mt-10"
          aria-labelledby="thresholds-heading"
        >
          <h2
            id="thresholds-heading"
            className="font-display text-lg font-semibold tracking-tight text-ink"
          >
            Risk thresholds
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
            <div className="bg-white/80 px-5 py-4">
              <p className="text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
                Clear
              </p>
              <p className="font-display mt-1 text-xl font-bold text-ink">
                0 – {RISK_THRESHOLDS.watch - 1} pts
              </p>
            </div>
            <div className="bg-white/80 px-5 py-4">
              <p className="text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
                Watch
              </p>
              <p className="font-display mt-1 text-xl font-bold text-ink">
                {RISK_THRESHOLDS.watch} – {RISK_THRESHOLDS.atRisk - 1} pts
              </p>
            </div>
            <div className="bg-white/80 px-5 py-4">
              <p className="text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
                At risk
              </p>
              <p className="font-display mt-1 text-xl font-bold text-ink">
                {RISK_THRESHOLDS.atRisk}+ pts
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate/65">
            These bands drive the dashboard, analytics, and alert severity
            across the app.
          </p>
        </section>

        {/* Point rule tables */}
        <div className="animate-fade-up-delay-3 mt-10 grid gap-8 lg:grid-cols-2">
          <RuleTable
            title="Positive attendance points"
            rules={POSITIVE_POINT_RULES}
            toneClass="text-accent-deep"
          />
          <RuleTable
            title="Attendance deductions"
            rules={DEDUCTION_RULES}
            toneClass="text-danger-soft"
          />
        </div>

        <p className="mt-10 border-t border-line/70 pt-5 text-sm tracking-wide text-slate/50">
          Demo data · toggles persist to this browser only, not a backend ·
          SMS intake not connected
        </p>
      </main>
    </OpsShell>
  );
}
