import type { Metadata } from "next";
import { MarketingCtaBand } from "@/components/marketing-cta-band";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";
import { ESCALATION_RULES, POLICY_THRESHOLDS } from "@/lib/policy-engine";

export const metadata: Metadata = {
  title: "Capabilities",
  description:
    "What AttendPoint does today: live risk scoring, a configurable policy engine, manager alerts, analytics, and AI insights.",
};

const CORE_CAPABILITIES = [
  {
    title: "Live risk scoring",
    body: "Attendance signals are scored against policy the moment they arrive, so every employee's standing is current — not a end-of-week recalculation.",
    icon: (
      <path
        d="M4 19V5m5 14V9m5 10V7m5 12V11"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Rolling policy engine",
    body: "A configurable escalation schedule and risk-band thresholds evaluate points on a rolling 12-month window — tuned from Settings, not hardcoded.",
    icon: (
      <path
        d="M12 3a9 9 0 1 0 9 9M12 3v6m0-6a9 9 0 0 1 9 9m0 0h-6"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Manager alerts",
    body: "Threshold crossings open an auditable warning and notify the floor, so intervention happens before a pattern becomes a policy action.",
    icon: (
      <path
        d="M12 4a5 5 0 0 0-5 5v3.2c0 .5-.18.99-.5 1.38L5 15.5h14l-1.5-2.02a2.2 2.2 0 0 1-.5-1.38V9a5 5 0 0 0-5-5Zm-2.4 15a2.4 2.4 0 0 0 4.8 0"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Analytics & AI insights",
    body: "Lateness patterns, common causes, and reliability trends surface automatically, with a grounded AI narrative — never invented numbers.",
    icon: (
      <path
        d="M3 3v16a2 2 0 0 0 2 2h16M7 15l4-5 3 3 5-7"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Bulk CSV import",
    body: "Import a batch of attendance events by employee code, date, and rule code. Every row is validated independently — one bad row never drops the rest.",
    icon: (
      <path
        d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Full audit trail",
    body: "Every point event and threshold crossing lands on an employee's track record. Manual status changes require a written reason — nothing is a silent edit.",
    icon: (
      <path
        d="M9 12h6m-6 4h6M8 3.5h8A1.5 1.5 0 0 1 17.5 5v14A1.5 1.5 0 0 1 16 20.5H8A1.5 1.5 0 0 1 6.5 19V5A1.5 1.5 0 0 1 8 3.5Z"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
] as const;

export default function CapabilitiesPage() {
  return (
    <div className="flex min-h-full flex-col">
      <MarketingHeader active="capabilities" />

      <section className="ops-atmosphere relative border-b border-line">
        <div className="ops-grid absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-24">
          <div className="live-pulse mb-5 h-[3px] w-16 sm:w-24" aria-hidden />
          <p className="text-sm font-semibold tracking-[0.18em] text-accent-deep uppercase">
            Capabilities
          </p>
          <h1 className="font-display mt-4 max-w-2xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Everything a floor needs to manage attendance risk.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate/80 sm:text-lg">
            Policy rules, risk bands, and manager workflows live in one
            place — configurable, auditable, and grounded in real numbers
            at every step.
          </p>
        </div>
      </section>

      <section className="relative border-b border-line bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-24">
          <div className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {CORE_CAPABILITIES.map((item) => (
              <div key={item.title} className="bg-white/85 px-6 py-7 sm:px-8">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="h-6 w-6 text-accent-deep"
                  aria-hidden
                >
                  {item.icon}
                </svg>
                <h3 className="font-display mt-4 text-lg font-semibold tracking-tight text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate/70">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-b border-line">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-24">
          <p className="text-sm font-semibold tracking-[0.18em] text-accent-deep uppercase">
            Policy engine
          </p>
          <h2 className="font-display mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            The exact rules, not a black box.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate/80 sm:text-lg">
            Every point value and risk band below is read live from the
            same policy engine the app scores against — retune any of it
            from Settings and both this page's numbers and every
            employee's standing move together.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
                Escalation schedule
              </h3>
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
            </div>

            <div>
              <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
                Risk bands
              </h3>
              <ul className="mt-3 divide-y divide-line/70 border border-line bg-white/65">
                {POLICY_THRESHOLDS.map((threshold) => (
                  <li key={threshold.key} className="px-4 py-3 sm:px-5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium text-ink">
                        {threshold.label}
                      </span>
                      <span className="font-display shrink-0 text-sm font-semibold tabular-nums text-ink">
                        {threshold.pointValue}+ pts
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate/65">
                      {threshold.action}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-b border-line bg-surface-2">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 sm:py-20">
          <p className="text-sm font-semibold tracking-[0.18em] text-accent-deep uppercase">
            On the roadmap
          </p>
          <h2 className="font-display mt-3 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Live SMS and shift-system intake
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-slate/75">
            Today, attendance events reach the policy engine through
            manager entry and CSV import. Live SMS intake and direct
            shift-system ingestion are planned next — worth knowing before
            you sign in to the demo.
          </p>
        </div>
      </section>

      <MarketingCtaBand />
      <MarketingFooter />
    </div>
  );
}
