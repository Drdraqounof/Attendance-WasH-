import {
  DEMO_ROSTER,
  RISK_LABELS,
  type RiskLevel,
  riskLevelFromPoints,
  type RosterEmployee,
} from "@/lib/dashboard-mock";
import Link from "next/link";

function riskTone(level: RiskLevel): string {
  switch (level) {
    case "pip_flag":
      return "text-danger-soft";
    case "at_risk":
      return "text-danger-soft";
    case "watch":
      return "text-danger-soft/85";
    case "clear":
      return "text-accent-deep";
  }
}

function riskMark(level: RiskLevel): string {
  switch (level) {
    case "pip_flag":
      return "bg-danger-soft";
    case "at_risk":
      return "bg-danger-soft";
    case "watch":
      return "bg-danger-soft/55";
    case "clear":
      return "bg-accent";
  }
}

function personHref(id: string) {
  return `/dashboard/people/${id}`;
}

function RosterRow({ employee }: { employee: RosterEmployee }) {
  const level = riskLevelFromPoints(employee.points);
  const label = RISK_LABELS[level];
  const href = personHref(employee.id);

  return (
    <li>
      <Link
        href={href}
        className="grid grid-cols-[minmax(0,1.4fr)_auto_3.5rem] items-center gap-x-3 border-b border-line/70 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-2/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:px-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_3.5rem] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_auto_3.5rem_minmax(0,1.2fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_auto_3.5rem_minmax(0,1.1fr)_minmax(0,1fr)]"
        aria-label={`Open profile for ${employee.name}`}
      >
        <span className="min-w-0">
          <span className="block truncate font-medium text-ink">
            {employee.name}
          </span>
          <span className="mt-0.5 block truncate text-sm text-slate/60 md:hidden">
            {employee.role} · {employee.team}
          </span>
        </span>

        <span className="hidden min-w-0 truncate text-sm text-slate/75 md:block">
          {employee.role}
          <span className="text-slate/40"> · </span>
          {employee.team}
        </span>

        <span className="inline-flex items-center gap-2 text-sm font-medium">
          <span
            className={`h-1.5 w-1.5 shrink-0 ${riskMark(level)}`}
            aria-hidden
          />
          <span className={riskTone(level)}>{label}</span>
        </span>

        <span className="text-right font-display text-sm font-semibold tabular-nums text-ink">
          {employee.points}
        </span>

        <span className="hidden min-w-0 lg:block">
          <span className="block truncate text-sm text-slate/80">
            {employee.lastSignal}
          </span>
          <span className="mt-0.5 block text-sm text-slate/55">
            {employee.lastSignalAgo}
          </span>
        </span>

        <span className="hidden truncate text-sm text-slate/75 xl:block">
          {employee.suggestedAction}
        </span>
      </Link>
    </li>
  );
}

export function PriorityRoster({ roster }: { roster: RosterEmployee[] }) {
  if (roster.length === 0) {
    return (
      <div className="border border-line bg-white/60 px-5 py-10 text-center">
        <p className="font-display text-lg font-semibold text-ink">
          No roster signals yet
        </p>
        <p className="mt-2 text-sm text-slate/65">
          When SMS intake is connected, attendance risk will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-line bg-white/65">
      <div className="flex items-baseline justify-between gap-4 border-b border-line/80 px-4 py-3 sm:px-5">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
          Priority roster
        </h2>
        <p className="text-sm tracking-wide text-slate/55 uppercase">
          Highest risk first · click a row
        </p>
      </div>

      <div
        className="hidden border-b border-line/80 px-4 py-2.5 text-sm tracking-[0.12em] text-slate/60 uppercase sm:grid sm:grid-cols-[minmax(0,1.4fr)_auto_3.5rem] sm:gap-x-3 sm:px-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_3.5rem] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_auto_3.5rem_minmax(0,1.2fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_auto_3.5rem_minmax(0,1.1fr)_minmax(0,1fr)]"
        aria-hidden
      >
        <span>Name</span>
        <span className="hidden md:block">Role / Team</span>
        <span>Risk</span>
        <span className="text-right">Points</span>
        <span className="hidden lg:block">Last signal</span>
        <span className="hidden xl:block">Suggested action</span>
      </div>

      <ul aria-label="Priority roster">
        {roster.map((employee) => (
          <RosterRow key={employee.id} employee={employee} />
        ))}
      </ul>
    </div>
  );
}

export function InterveneNow({ targets }: { targets: RosterEmployee[] }) {
  if (targets.length === 0) {
    return (
      <section className="border border-line/80 bg-white/40 px-5 py-6">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
          Intervene now
        </h2>
        <p className="mt-2 text-sm text-slate/65">
          No at-risk employees on this shift. Keep the board clear.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="intervene-heading">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2
          id="intervene-heading"
          className="font-display text-lg font-semibold tracking-tight text-ink"
        >
          Intervene now
        </h2>
        <p className="text-sm tracking-wide text-slate/55 uppercase">
          Action targets
        </p>
      </div>
      <ol className="divide-y divide-line/70 border border-line bg-white/65">
        {targets.map((person, index) => (
          <li key={person.id}>
            <Link
              href={personHref(person.id)}
              className="flex flex-col gap-1 px-4 py-4 transition-colors hover:bg-surface-2/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5"
              aria-label={`Open profile for ${person.name}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-display text-sm font-semibold tabular-nums text-danger-soft">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium text-ink">{person.name}</span>
                  <span className="text-sm text-slate/55">
                    {person.points} pts
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate/65 sm:pl-8">
                  {person.role} · {person.team} · {person.lastSignal}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium text-accent-deep sm:text-right">
                {person.suggestedAction}
              </p>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Pre-sorted demo roster for the console. */
export const dashboardRoster = DEMO_ROSTER;
