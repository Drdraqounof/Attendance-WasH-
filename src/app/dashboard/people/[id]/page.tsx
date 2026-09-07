import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OpsShell } from "@/components/ops-shell";
import { hasDemoSession } from "@/lib/auth-mock";
import {
  RISK_LABELS,
  riskLevelFromPoints,
} from "@/lib/dashboard-mock";
import {
  attendanceTrendNarrative,
  employeeOfTheMonth,
  getPersonById,
  incidentSummary,
  pointsTowardCap,
  SCHEDULE_STATUS_LABELS,
  type ScheduleStatus,
} from "@/lib/people-mock";
import {
  getEmployeeHistory,
  getEmployeePolicySnapshot,
  type HistoryEntry,
} from "@/lib/policy-queries";
import { ClearPipButton } from "./clear-pip-button";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const person = getPersonById(id);
  return {
    title: person ? person.name : "Person",
  };
}

const WARNING_STATUS_LABELS = {
  open: "Open",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
} as const;

function warningStatusTone(status: "open" | "acknowledged" | "resolved"): string {
  switch (status) {
    case "open":
      return "border-danger-soft/40 bg-danger-soft/10 text-danger-soft";
    case "acknowledged":
      return "border-accent/40 bg-accent/10 text-accent-deep";
    case "resolved":
      return "border-line bg-surface-2 text-slate/65";
  }
}

function statusTone(status: ScheduleStatus): string {
  switch (status) {
    case "absent":
      return "text-danger-soft";
    case "late":
    case "early_out":
      return "text-danger-soft/90";
    case "worked":
      return "text-accent-deep";
    case "scheduled":
      return "text-ink";
    case "off":
      return "text-slate/55";
  }
}

export default async function PersonDetailPage({ params }: PageProps) {
  const signedIn = await hasDemoSession();
  if (!signedIn) {
    redirect("/login");
  }

  const { id } = await params;
  const person = getPersonById(id);
  if (!person) {
    notFound();
  }

  const level = riskLevelFromPoints(person.points);
  const towardCap = pointsTowardCap(person);
  const capPct = Math.round((towardCap / person.policyCap) * 100);
  const trend = incidentSummary(person, 30);
  const narrative = attendanceTrendNarrative(person, 30);
  const isNominee = employeeOfTheMonth()?.person.id === person.id;

  // Track record + status-change action read/write the real Neon DB
  // (see docs/employee-track-record-plan.md) — everything else on this
  // page above is still mock-driven. Degrade gracefully rather than
  // crash the whole profile page if the DB is unreachable.
  let history: HistoryEntry[] = [];
  let dbSnapshot: Awaited<ReturnType<typeof getEmployeePolicySnapshot>> = null;
  let historyError: string | null = null;
  try {
    [history, dbSnapshot] = await Promise.all([
      getEmployeeHistory(person.id),
      getEmployeePolicySnapshot(person.id),
    ]);
  } catch {
    historyError = "Live track record is unavailable right now.";
  }

  return (
    <OpsShell active="people" crumb={person.name}>
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-6 py-8 sm:px-8 sm:py-10">
        <div className="animate-fade-up">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center gap-2 border border-line bg-white/70 px-4 text-sm font-medium text-ink transition-colors hover:border-accent/40 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <span aria-hidden>←</span>
            Back to dashboard
          </Link>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-[0.16em] text-slate/55 uppercase">
                Employee profile
              </p>
              <h1 className="font-display mt-2 flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                {person.name}
                {isNominee ? (
                  <span className="inline-flex items-center gap-1.5 border border-accent/40 bg-accent/10 px-2.5 py-1 text-sm font-semibold tracking-wide text-accent-deep uppercase">
                    <span aria-hidden>★</span>
                    Employee of the month
                  </span>
                ) : null}
              </h1>
              <p className="mt-2 text-base text-slate/70">
                {person.role} · {person.team}
                <span className="mx-2 text-line" aria-hidden>
                  ·
                </span>
                {person.employeeCode}
              </p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-slate/65">
              <div>
                <p className="text-sm tracking-[0.12em] text-slate/50 uppercase">
                  Risk
                </p>
                <p
                  className={`mt-1 flex items-center gap-2 font-medium ${
                    level === "clear"
                      ? "text-accent-deep"
                      : "text-danger-soft"
                  }`}
                >
                  {RISK_LABELS[level]}
                  {level === "pip_flag" && (
                    <span className="border border-danger-soft/40 bg-danger-soft/10 px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.08em] text-danger-soft uppercase">
                      PIP
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm tracking-[0.12em] text-slate/50 uppercase">
                  Phone
                </p>
                <p className="mt-1 font-medium text-ink">{person.phoneMasked}</p>
              </div>
              <div>
                <p className="text-sm tracking-[0.12em] text-slate/50 uppercase">
                  Hire date
                </p>
                <p className="mt-1 font-medium text-ink">{person.hireDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Points summary */}
        <section
          className="animate-fade-up-delay-1 mt-8 grid gap-px border border-line bg-line sm:grid-cols-3"
          aria-label="Points summary"
        >
          <div className="bg-white/80 px-5 py-5">
            <p className="text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
              Open points
            </p>
            <p className="font-display mt-2 text-4xl font-bold tabular-nums text-ink">
              {person.points}
            </p>
            <p className="mt-2 text-sm text-slate/65">
              Suggested: {person.suggestedAction}
            </p>
          </div>
          <div className="bg-white/80 px-5 py-5 sm:col-span-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
                Toward policy cap
              </p>
              <p className="font-display text-sm font-semibold tabular-nums text-ink">
                {towardCap} / {person.policyCap}
                <span className="ml-1.5 font-sans text-sm font-medium text-slate/55">
                  · {RISK_LABELS[level]}
                </span>
              </p>
            </div>
            <div
              className="mt-4 h-2 w-full bg-surface-2"
              role="progressbar"
              aria-valuenow={towardCap}
              aria-valuemin={0}
              aria-valuemax={person.policyCap}
              aria-label="Points toward policy cap"
            >
              <div
                className={`h-full transition-[width] duration-500 ${
                  level === "pip_flag" || level === "at_risk"
                    ? "bg-danger-soft"
                    : level === "watch"
                      ? "bg-danger-soft/70"
                      : "bg-accent"
                }`}
                style={{ width: `${Math.min(capPct, 100)}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-slate/65">
              Last signal: {person.lastSignal} ({person.lastSignalAgo})
            </p>
          </div>
        </section>

        {/* 30-day incident history */}
        <section
          className="animate-fade-up-delay-2 mt-8 border border-line bg-white/65 px-5 py-5 sm:px-6"
          aria-labelledby="trend-heading"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2
              id="trend-heading"
              className="font-display text-lg font-semibold tracking-tight text-ink"
            >
              Last {trend.windowDays} days
            </h2>
            <p className="text-sm tracking-wide text-slate/55 uppercase">
              Incident history
            </p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-px border border-line bg-line">
            <div className="bg-white/80 px-4 py-3">
              <p className="text-sm font-semibold tracking-[0.12em] text-slate/55 uppercase">
                Late arrivals
              </p>
              <p className="font-display mt-1 text-2xl font-bold tabular-nums text-ink">
                {trend.lateCount}
              </p>
            </div>
            <div className="bg-white/80 px-4 py-3">
              <p className="text-sm font-semibold tracking-[0.12em] text-slate/55 uppercase">
                Absences
              </p>
              <p className="font-display mt-1 text-2xl font-bold tabular-nums text-ink">
                {trend.absentCount}
              </p>
            </div>
            <div className="bg-white/80 px-4 py-3">
              <p className="text-sm font-semibold tracking-[0.12em] text-slate/55 uppercase">
                Other incidents
              </p>
              <p className="font-display mt-1 text-2xl font-bold tabular-nums text-ink">
                {trend.otherCount}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate/75">
            {narrative}
          </p>
        </section>

        <div className="animate-fade-up-delay-3 mt-8 grid gap-8 lg:grid-cols-2">
          {/* Schedule */}
          <section aria-labelledby="schedule-heading">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2
                id="schedule-heading"
                className="font-display text-lg font-semibold tracking-tight text-ink"
              >
                This week&apos;s schedule
              </h2>
              <p className="text-sm tracking-wide text-slate/55 uppercase">
                Jul 27 – Aug 2
              </p>
            </div>
            <ul className="divide-y divide-line/70 border border-line bg-white/65">
              {person.schedule.map((day) => (
                <li
                  key={day.date}
                  className="flex items-start justify-between gap-4 px-4 py-3 sm:px-5"
                >
                  <div>
                    <p className="font-medium text-ink">
                      <span className="inline-block w-9 text-slate/55">
                        {day.weekday}
                      </span>
                      {day.shift}
                    </p>
                    {day.note ? (
                      <p className="mt-0.5 pl-9 text-sm text-slate/55">
                        {day.note}
                      </p>
                    ) : null}
                  </div>
                  <p
                    className={`shrink-0 text-sm font-medium ${statusTone(day.status)}`}
                  >
                    {SCHEDULE_STATUS_LABELS[day.status]}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Point ledger */}
          <section aria-labelledby="ledger-heading">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2
                id="ledger-heading"
                className="font-display text-lg font-semibold tracking-tight text-ink"
              >
                Points ledger
              </h2>
              <p className="text-sm tracking-wide text-slate/55 uppercase">
                Demo history
              </p>
            </div>
            {person.pointLedger.length === 0 ? (
              <div className="border border-line bg-white/60 px-5 py-8 text-sm text-slate/65">
                No point events on record. Clear standing.
              </div>
            ) : (
              <ul className="divide-y divide-line/70 border border-line bg-white/65">
                {person.pointLedger.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-start justify-between gap-4 px-4 py-3.5 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        {event.reason}
                      </p>
                      <p className="mt-0.5 text-sm text-slate/55">
                        {event.date}
                        <span className="text-slate/35"> · </span>
                        {event.source}
                      </p>
                    </div>
                    <p className="font-display shrink-0 text-sm font-semibold tabular-nums text-danger-soft">
                      +{event.delta}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Track record — real DB history + status-change action */}
        <section
          className="animate-fade-up-delay-3 mt-8 border border-line bg-white/65 px-5 py-5 sm:px-6"
          aria-labelledby="track-record-heading"
        >
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
            <h2
              id="track-record-heading"
              className="font-display text-lg font-semibold tracking-tight text-ink"
            >
              Track record
            </h2>
            <p className="text-sm tracking-wide text-slate/55 uppercase">
              Live data
            </p>
          </div>

          {historyError ? (
            <div className="border border-line bg-white/60 px-5 py-6 text-sm text-slate/65">
              {historyError}
            </div>
          ) : (
            <>
              {dbSnapshot ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-line bg-surface-2/60 px-4 py-3">
                  <p className="text-sm text-slate/70">
                    Current standing:{" "}
                    <span className="font-display font-semibold text-ink">
                      {dbSnapshot.points} / {dbSnapshot.policyCap} pts
                    </span>{" "}
                    · {RISK_LABELS[dbSnapshot.riskLevel]}
                  </p>
                  {dbSnapshot.riskLevel === "pip_flag" && (
                    <ClearPipButton employeeId={person.id} />
                  )}
                </div>
              ) : null}

              {history.length === 0 ? (
                <div className="border border-line bg-white/60 px-5 py-8 text-sm text-slate/65">
                  No history recorded yet.
                </div>
              ) : (
                <ul className="divide-y divide-line/70 border border-line bg-white/65">
                  {history.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start justify-between gap-4 px-4 py-3.5 sm:px-5"
                    >
                      {entry.kind === "point_event" ? (
                        <>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink">
                              {entry.reason}
                            </p>
                            <p className="mt-0.5 text-sm text-slate/55">
                              {entry.date}
                              <span className="text-slate/35"> · </span>
                              {entry.source}
                            </p>
                          </div>
                          <p
                            className={`font-display shrink-0 text-sm font-semibold tabular-nums ${
                              entry.delta < 0
                                ? "text-accent-deep"
                                : "text-danger-soft"
                            }`}
                          >
                            {entry.delta > 0 ? "+" : ""}
                            {entry.delta}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink">
                              Crossed threshold: {entry.label}
                            </p>
                            <p className="mt-0.5 text-sm text-slate/55">
                              {entry.date}
                              <span className="text-slate/35"> · </span>
                              {entry.pointsAtTrigger} pts at trigger
                            </p>
                          </div>
                          <span
                            className={`shrink-0 border px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.08em] uppercase ${warningStatusTone(entry.status)}`}
                          >
                            {WARNING_STATUS_LABELS[entry.status]}
                          </span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <p className="mt-3 text-sm text-slate/65">
            Sourced from the live database — may differ from the demo
            points ledger above until the rest of this page is migrated
            off mock data.
          </p>
        </section>

        <p className="mt-10 border-t border-line/70 pt-5 text-sm tracking-wide text-slate/50">
          Demo data · SMS intake not connected
        </p>
      </main>
    </OpsShell>
  );
}
