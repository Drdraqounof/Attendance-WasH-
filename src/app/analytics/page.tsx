import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OpsShell } from "@/components/ops-shell";
import { hasDemoSession } from "@/lib/auth-mock";
import { DEMO_ROSTER, summarizeRoster } from "@/lib/dashboard-mock";
import {
  ANALYTICS_TREND,
  analyticsSummary,
  attendanceNominees,
  signalTypeBreakdown,
  teamRiskBreakdown,
  topPointHolders,
} from "@/lib/people-mock";

export const metadata: Metadata = {
  title: "Analytics",
};

export default async function AnalyticsPage() {
  const signedIn = await hasDemoSession();
  if (!signedIn) {
    redirect("/login");
  }

  const summary = analyticsSummary(DEMO_ROSTER);
  const risk = summarizeRoster(DEMO_ROSTER);
  const teams = teamRiskBreakdown(DEMO_ROSTER);
  const signals = signalTypeBreakdown();
  const leaders = topPointHolders(5);
  const nominees = attendanceNominees(3);
  const maxTrend = Math.max(...ANALYTICS_TREND.map((d) => d.points), 1);

  const metrics = [
    {
      label: "Open points",
      value: summary.openPoints,
      tone: "text-ink",
    },
    {
      label: "At risk now",
      value: summary.atRisk,
      tone: "text-danger-soft",
    },
    {
      label: "7-day points",
      value: summary.weekPoints,
      tone: "text-ink",
    },
    {
      label: "Avg points / person",
      value: summary.avgPoints,
      tone: "text-accent-deep",
    },
  ] as const;

  return (
    <OpsShell active="analytics">
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:px-8 sm:py-10">
        <div className="animate-fade-up">
          <div className="live-pulse mb-4 h-[3px] w-14 sm:w-20" aria-hidden />
          <p className="text-xs font-semibold tracking-[0.16em] text-slate/55 uppercase">
            Floor analytics
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Attendance analytics
          </h1>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-slate/75">
            Point load, signal mix, and team risk — so supervisors see patterns
            before the next shift.
          </p>
        </div>

        <div
          className="animate-fade-up-delay-1 mt-8 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4"
          role="group"
          aria-label="Analytics summary"
        >
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="bg-white/80 px-4 py-4 sm:px-5 sm:py-5"
            >
              <p className="text-xs font-semibold tracking-[0.14em] text-slate/55 uppercase">
                {metric.label}
              </p>
              <p
                className={`font-display mt-2 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl ${metric.tone}`}
              >
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <div className="animate-fade-up-delay-2 mt-8 grid gap-8 lg:grid-cols-2">
          {/* Trend */}
          <section aria-labelledby="trend-heading">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2
                id="trend-heading"
                className="font-display text-lg font-semibold tracking-tight text-ink"
              >
                Points trend
              </h2>
              <p className="text-xs tracking-wide text-slate/55 uppercase">
                Last 7 days · {summary.weekSignals} signals
              </p>
            </div>
            <div className="border border-line bg-white/65 px-4 py-5 sm:px-5">
              <div
                className="flex h-40 items-end gap-2 sm:gap-3"
                role="img"
                aria-label="Bar chart of daily attendance points over the last seven days"
              >
                {ANALYTICS_TREND.map((day) => (
                  <div
                    key={day.date}
                    className="flex h-full flex-1 flex-col justify-end"
                  >
                    <div
                      className="w-full bg-accent/80 transition-[height] duration-500"
                      style={{
                        height: `${Math.max((day.points / maxTrend) * 100, 4)}%`,
                      }}
                      title={`${day.label}: ${day.points} points`}
                    />
                    <p className="mt-2 text-center text-[10px] tracking-wide text-slate/55 uppercase sm:text-xs">
                      {day.label}
                    </p>
                    <p className="text-center font-display text-xs font-semibold tabular-nums text-ink">
                      {day.points}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Risk distribution */}
          <section aria-labelledby="risk-dist-heading">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2
                id="risk-dist-heading"
                className="font-display text-lg font-semibold tracking-tight text-ink"
              >
                Risk distribution
              </h2>
              <p className="text-xs tracking-wide text-slate/55 uppercase">
                {summary.headcount} on roster
              </p>
            </div>
            <div className="border border-line bg-white/65 px-4 py-5 sm:px-5">
              <div className="flex h-3 w-full overflow-hidden bg-surface-2">
                <div
                  className="bg-danger-soft"
                  style={{
                    width: `${(risk.atRisk / summary.headcount) * 100}%`,
                  }}
                  title={`At risk: ${risk.atRisk}`}
                />
                <div
                  className="bg-danger-soft/50"
                  style={{
                    width: `${(risk.watch / summary.headcount) * 100}%`,
                  }}
                  title={`Watch: ${risk.watch}`}
                />
                <div
                  className="bg-accent"
                  style={{
                    width: `${(risk.clear / summary.headcount) * 100}%`,
                  }}
                  title={`Clear: ${risk.clear}`}
                />
              </div>
              <ul className="mt-5 space-y-3">
                {(
                  [
                    {
                      label: "At risk",
                      value: risk.atRisk,
                      mark: "bg-danger-soft",
                    },
                    {
                      label: "Watch",
                      value: risk.watch,
                      mark: "bg-danger-soft/50",
                    },
                    {
                      label: "Clear",
                      value: risk.clear,
                      mark: "bg-accent",
                    },
                  ] as const
                ).map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="inline-flex items-center gap-2 text-slate/75">
                      <span
                        className={`h-2 w-2 shrink-0 ${row.mark}`}
                        aria-hidden
                      />
                      {row.label}
                    </span>
                    <span className="font-display font-semibold tabular-nums text-ink">
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <div className="animate-fade-up-delay-3 mt-8 grid gap-8 lg:grid-cols-2">
          {/* Team breakdown */}
          <section aria-labelledby="team-heading">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2
                id="team-heading"
                className="font-display text-lg font-semibold tracking-tight text-ink"
              >
                Risk by team
              </h2>
              <p className="text-xs tracking-wide text-slate/55 uppercase">
                Open points
              </p>
            </div>
            <div className="overflow-x-auto border border-line bg-white/65">
              <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line/80 text-xs tracking-[0.12em] text-slate/60 uppercase">
                    <th className="px-4 py-2.5 font-semibold sm:px-5">Team</th>
                    <th className="px-2 py-2.5 font-semibold">At risk</th>
                    <th className="px-2 py-2.5 font-semibold">Watch</th>
                    <th className="px-2 py-2.5 font-semibold">Clear</th>
                    <th className="px-4 py-2.5 text-right font-semibold sm:px-5">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => (
                    <tr
                      key={team.team}
                      className="border-b border-line/70 last:border-b-0"
                    >
                      <td className="px-4 py-3 font-medium text-ink sm:px-5">
                        {team.team}
                      </td>
                      <td className="px-2 py-3 tabular-nums text-danger-soft">
                        {team.atRisk}
                      </td>
                      <td className="px-2 py-3 tabular-nums text-slate/75">
                        {team.watch}
                      </td>
                      <td className="px-2 py-3 tabular-nums text-accent-deep">
                        {team.clear}
                      </td>
                      <td className="px-4 py-3 text-right font-display font-semibold tabular-nums text-ink sm:px-5">
                        {team.openPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Signal types + top holders */}
          <div className="space-y-8">
            <section aria-labelledby="signals-heading">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2
                  id="signals-heading"
                  className="font-display text-lg font-semibold tracking-tight text-ink"
                >
                  Signal mix
                </h2>
                <p className="text-xs tracking-wide text-slate/55 uppercase">
                  From point ledger
                </p>
              </div>
              <ul className="divide-y divide-line/70 border border-line bg-white/65">
                {signals.map((row) => {
                  const max = signals[0]?.count ?? 1;
                  return (
                    <li
                      key={row.type}
                      className="px-4 py-3 sm:px-5"
                    >
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-slate/80">{row.type}</span>
                        <span className="font-display font-semibold tabular-nums text-ink">
                          {row.count}
                        </span>
                      </div>
                      <div className="mt-2 h-1 bg-surface-2">
                        <div
                          className="h-full bg-accent-deep/70"
                          style={{ width: `${(row.count / max) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-labelledby="leaders-heading">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2
                  id="leaders-heading"
                  className="font-display text-lg font-semibold tracking-tight text-ink"
                >
                  Highest open points
                </h2>
                <Link
                  href="/dashboard"
                  className="text-xs font-medium tracking-wide text-accent-deep uppercase transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                >
                  Open console
                </Link>
              </div>
              <ol className="divide-y divide-line/70 border border-line bg-white/65">
                {leaders.map((person, index) => (
                  <li key={person.id}>
                    <Link
                      href={`/dashboard/people/${person.id}`}
                      className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-surface-2/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:px-5"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="font-display text-sm font-semibold tabular-nums text-slate/45">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">
                            {person.name}
                          </span>
                          <span className="block truncate text-xs text-slate/55">
                            {person.team}
                          </span>
                        </span>
                      </span>
                      <span className="font-display shrink-0 text-sm font-semibold tabular-nums text-ink">
                        {person.points} pts
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>

        {/* Recognition */}
        <section
          className="animate-fade-up-delay-3 mt-8"
          aria-labelledby="recognition-heading"
        >
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2
              id="recognition-heading"
              className="font-display text-lg font-semibold tracking-tight text-ink"
            >
              Employee of the month — nominees
            </h2>
            <p className="text-xs tracking-wide text-slate/55 uppercase">
              Recognition · current cycle
            </p>
          </div>
          <ol className="divide-y divide-line/70 border border-line bg-white/65">
            {nominees.map((nominee, index) => (
              <li key={nominee.person.id}>
                <Link
                  href={`/dashboard/people/${nominee.person.id}`}
                  className="flex flex-col gap-1.5 px-4 py-4 transition-colors hover:bg-surface-2/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5"
                  aria-label={`Open profile for ${nominee.person.name}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="font-display text-sm font-semibold tabular-nums text-accent-deep">
                        {index === 0 ? "★" : String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="font-medium text-ink">
                        {nominee.person.name}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate/65 sm:pl-7">
                      {nominee.reason}
                    </p>
                  </div>
                  <p className="font-display shrink-0 text-sm font-semibold tabular-nums text-accent-deep">
                    {nominee.score}/100
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-10 border-t border-line/70 pt-5 text-xs tracking-wide text-slate/50">
          Demo data · SMS intake not connected
        </p>
      </main>
    </OpsShell>
  );
}
