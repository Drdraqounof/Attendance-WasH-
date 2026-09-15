import Image from "next/image";
import Link from "next/link";
import { MarketingCtaBand } from "@/components/marketing-cta-band";
import { MarketingFooter } from "@/components/marketing-footer";

const CAPABILITIES = [
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
] as const;

const STEPS = [
  {
    number: "01",
    title: "Signals come in",
    body: "Attendance events — SMS, manager entries, imported records — reach the engine as they happen, each tagged with duration and notice status.",
  },
  {
    number: "02",
    title: "Policy scores them",
    body: "Every event maps to a policy rule and adds points on a rolling 12-month ledger. Nothing is scored twice; nothing is scored silently.",
  },
  {
    number: "03",
    title: "Managers act early",
    body: "Risk bands, alerts, and a priority roster put the right names in front of the right supervisor before a shift problem becomes a policy one.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-8">
          <span className="font-display text-sm font-semibold tracking-[0.14em] text-white/90 uppercase">
            AttendPoint
          </span>
          <nav
            className="hidden items-center gap-8 sm:flex"
            aria-label="Primary"
          >
            <Link
              href="/capabilities"
              className="text-sm font-medium text-white/75 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              Capabilities
            </Link>
            <Link
              href="/how-it-works"
              className="text-sm font-medium text-white/75 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              How it works
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-white/75 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              Sign in
            </Link>
          </nav>
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center border border-white/30 px-4 text-sm font-medium text-white transition-colors hover:border-white/55 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:hidden"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden">
        <Image
          src="/hero-ops.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/55 to-slate/35"
          aria-hidden
        />
        <div
          className="ops-grid absolute inset-0 opacity-40 mix-blend-soft-light"
          aria-hidden
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 pt-32 sm:px-8 sm:pb-20">
          <div className="live-pulse mb-5 h-[3px] w-16 sm:w-24" aria-hidden />

          <p className="animate-fade-up flex items-center gap-2 text-sm font-semibold tracking-[0.18em] text-white/70 uppercase">
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 bg-accent"
              aria-hidden
            />
            Attendance operations platform
          </p>

          <h1 className="animate-fade-up-delay-1 mt-5 max-w-3xl font-display text-[clamp(2.25rem,6vw,4.25rem)] leading-[1.02] font-bold tracking-tight text-white">
            Live attendance risk, before the shift slips.
          </h1>

          <p className="animate-fade-up-delay-2 mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
            AttendPoint turns attendance signals into policy-scored risk in
            real time, so operations managers see who needs attention — and
            why — without digging through inboxes.
          </p>

          <div className="animate-fade-up-delay-3 mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center bg-accent px-7 text-sm font-semibold tracking-wide text-white transition-[background-color,transform] duration-200 hover:bg-accent-deep hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:translate-y-0"
            >
              Manager sign in
            </Link>
            <Link
              href="/capabilities"
              className="inline-flex h-12 items-center justify-center border border-white/30 px-7 text-sm font-medium text-white/85 transition-colors hover:border-white/55 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Explore capabilities
            </Link>
          </div>
        </div>
      </section>

      <section
        id="capabilities"
        className="ops-atmosphere relative border-t border-line"
      >
        <div className="ops-grid absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-accent-deep uppercase">
                Capabilities
              </p>
              <h2 className="font-display mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                One system, from signal to intervention.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate/80 sm:text-lg">
                Policy rules, risk bands, and manager workflows live in one
                place — configurable, auditable, and grounded in real
                numbers at every step.
              </p>
            </div>
            <Link
              href="/capabilities"
              className="shrink-0 text-sm font-medium text-accent-deep transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              See all capabilities →
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
            {CAPABILITIES.map((item) => (
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

      <section
        id="how-it-works"
        className="relative border-t border-line bg-surface"
      >
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-accent-deep uppercase">
                How it works
              </p>
              <h2 className="font-display mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Signal in. Risk out.
              </h2>
            </div>
            <Link
              href="/how-it-works"
              className="shrink-0 text-sm font-medium text-accent-deep transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              See the full walkthrough →
            </Link>
          </div>

          <ol className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((step, index) => (
              <li key={step.number} className="relative">
                <span className="font-display text-sm font-semibold tabular-nums text-accent-deep">
                  {step.number}
                </span>
                <h3 className="font-display mt-3 text-lg font-semibold tracking-tight text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate/70">
                  {step.body}
                </p>
                {index < STEPS.length - 1 && (
                  <span
                    className="mt-6 hidden h-px w-full bg-line sm:block"
                    aria-hidden
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <MarketingCtaBand />
      <MarketingFooter />
    </div>
  );
}
