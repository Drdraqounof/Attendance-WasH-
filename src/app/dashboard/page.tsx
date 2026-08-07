import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OpsShell } from "@/components/ops-shell";
import { generateAttendanceAlerts } from "@/lib/alerts-mock";
import { hasDemoSession } from "@/lib/auth-mock";
import {
  DEMO_SHIFT_META,
  interventionTargets,
  summarizeRoster,
} from "@/lib/dashboard-mock";
import { employeeOfTheMonth } from "@/lib/people-mock";
import { AttendanceAlerts } from "./attendance-alerts";
import {
  dashboardRoster,
  InterveneNow,
  PriorityRoster,
} from "./priority-roster";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const signedIn = await hasDemoSession();
  if (!signedIn) {
    redirect("/login");
  }

  const summary = summarizeRoster(dashboardRoster);
  const intervene = interventionTargets(dashboardRoster, 3);
  const alerts = generateAttendanceAlerts();
  const nominee = employeeOfTheMonth();

  const metrics = [
    {
      label: "At risk",
      value: summary.atRisk,
      tone: "text-danger-soft",
    },
    {
      label: "Watch",
      value: summary.watch,
      tone: "text-danger-soft/80",
    },
    {
      label: "Clear",
      value: summary.clear,
      tone: "text-accent-deep",
    },
    {
      label: "Open points today",
      value: summary.openPointsToday,
      tone: "text-ink",
    },
  ] as const;

  return (
    <OpsShell active="dashboard">
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-6 py-8 sm:px-8 sm:py-10">
        <div className="animate-fade-up">
          <div className="flex flex-wrap items-center gap-3">
            <div className="live-pulse h-[3px] w-14 sm:w-20" aria-hidden />
            <p className="flex items-center gap-2 text-sm font-semibold tracking-[0.16em] text-accent-deep uppercase">
              <span
                className="inline-block h-1.5 w-1.5 bg-accent"
                aria-hidden
              />
              Live · Shift open
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="text-sm font-semibold tracking-[0.16em] text-slate/55 uppercase">
                Live attendance risk
              </p>
              <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Shift risk console
              </h1>
              <p className="mt-3 max-w-lg text-base leading-relaxed text-slate/75">
                SMS signals scored against policy — act before the floor slips.
                Select a name for schedule and points detail.
              </p>
            </div>
            <p className="shrink-0 text-sm text-slate/55">
              {DEMO_SHIFT_META.floor}
              <span className="mx-2 text-line" aria-hidden>
                ·
              </span>
              {DEMO_SHIFT_META.shift}
              <span className="mx-2 text-line" aria-hidden>
                ·
              </span>
              {DEMO_SHIFT_META.updated}
            </p>
          </div>
        </div>

        <div
          className="animate-fade-up-delay-1 mt-8 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4"
          role="group"
          aria-label="Shift risk summary"
        >
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="bg-white/80 px-4 py-4 sm:px-5 sm:py-5"
            >
              <p className="text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
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

        <div className="animate-fade-up-delay-2 mt-8">
          <PriorityRoster roster={dashboardRoster} />
        </div>

        <div className="animate-fade-up-delay-3 mt-8">
          <InterveneNow targets={intervene} />
        </div>

        <div className="animate-fade-up-delay-3 mt-8">
          <AttendanceAlerts alerts={alerts} />
        </div>

        <section
          className="animate-fade-up-delay-3 mt-8 border border-line bg-white/70 px-5 py-5 sm:px-6"
          aria-labelledby="recognition-heading"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2
              id="recognition-heading"
              className="font-display text-lg font-semibold tracking-tight text-ink"
            >
              Employee of the month
            </h2>
            <Link
              href="/analytics"
              className="text-sm font-medium tracking-wide text-accent-deep uppercase transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              Full recognition list
            </Link>
          </div>
          {nominee ? (
            <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <Link
                href={`/dashboard/people/${nominee.person.id}`}
                className="font-medium text-ink transition-colors hover:text-accent-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                {nominee.person.name}
              </Link>
              <p className="min-w-0 flex-1 text-sm text-slate/65">
                {nominee.reason}
              </p>
              <p className="font-display shrink-0 text-sm font-semibold tabular-nums text-accent-deep">
                {nominee.score}/100
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate/65">
              No nominee yet this cycle.
            </p>
          )}
        </section>

        <p className="mt-10 border-t border-line/70 pt-5 text-sm tracking-wide text-slate/50">
          Demo data · SMS intake not connected
        </p>
      </main>
    </OpsShell>
  );
}
