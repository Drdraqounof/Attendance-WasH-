import Link from "next/link";
import type { AlertSeverity, AttendanceAlert } from "@/lib/alerts-mock";
import type { RiskLevel } from "@/lib/dashboard-mock";
import {
  ALERT_SEVERITY_LABELS_BY_LANG,
  DASHBOARD_COPY,
  RISK_LABELS_BY_LANG,
} from "@/lib/i18n";

function severityTone(severity: AttendanceAlert["severity"]): string {
  return severity === "critical" ? "text-danger-soft" : "text-danger-soft/80";
}

function severityMark(severity: AttendanceAlert["severity"]): string {
  return severity === "critical" ? "bg-danger-soft" : "bg-danger-soft/55";
}

export function AttendanceAlerts({
  alerts,
  copy = DASHBOARD_COPY.en,
  riskLabels = RISK_LABELS_BY_LANG.en,
  severityLabels = ALERT_SEVERITY_LABELS_BY_LANG.en,
}: {
  alerts: AttendanceAlert[];
  copy?: (typeof DASHBOARD_COPY)[keyof typeof DASHBOARD_COPY];
  riskLabels?: Record<RiskLevel, string>;
  severityLabels?: Record<AlertSeverity, string>;
}) {
  if (alerts.length === 0) {
    return (
      <section className="border border-line/80 bg-white/40 px-5 py-6">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
          {copy.alertsHeading}
        </h2>
        <p className="mt-2 text-sm text-slate/65">{copy.alertsEmpty}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="alerts-heading">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2
          id="alerts-heading"
          className="font-display text-lg font-semibold tracking-tight text-ink"
        >
          {copy.alertsHeading}
        </h2>
        <p className="text-sm tracking-wide text-slate/55 uppercase">
          {copy.alertsAutomated} · {alerts.length} {copy.openWord}
        </p>
      </div>
      <ul className="divide-y divide-line/70 border border-line bg-white/65">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <Link
              href={`/dashboard/people/${alert.personId}`}
              className="flex flex-col gap-1.5 px-4 py-4 transition-colors hover:bg-surface-2/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5"
              aria-label={`Open profile for ${alert.employee}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 ${severityMark(alert.severity)}`}
                    aria-hidden
                  />
                  <span className="font-medium text-ink">{alert.employee}</span>
                  <span
                    className={`text-sm font-medium ${severityTone(alert.severity)}`}
                  >
                    {severityLabels[alert.severity]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate/65 sm:pl-6">
                  {alert.issue}
                  <span className="text-slate/40"> · </span>
                  {alert.detail}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-sm font-semibold tabular-nums text-ink">
                  {alert.points} pts
                  <span className="ml-1.5 font-sans text-sm font-medium text-slate/55">
                    · {riskLabels[alert.riskLevel]}
                  </span>
                </p>
                <p className="text-sm font-medium text-accent-deep">
                  {alert.recommendedAction}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
