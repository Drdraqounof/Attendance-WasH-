import type { Metadata } from "next";
import Link from "next/link";
import { MarketingCtaBand } from "@/components/marketing-cta-band";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How an attendance event becomes a scored, auditable risk signal in AttendPoint — from intake to manager action.",
};

const STEPS = [
  {
    number: "01",
    title: "A signal comes in",
    body: "An attendance event — a manager entry, an imported CSV row, or (on the roadmap) an inbound SMS — reaches the engine tagged with whatever details your rules care about.",
  },
  {
    number: "02",
    title: "Your rules score it",
    body: "The event maps to one of the point rules you've defined and adds to the employee's rolling 12-month ledger. You decide what each rule is worth.",
  },
  {
    number: "03",
    title: "Risk bands update instantly",
    body: "The employee's point total re-bands immediately against the current risk thresholds. Nothing waits for a nightly job or a manual recalculation.",
  },
  {
    number: "04",
    title: "Managers see it on the priority roster",
    body: "Anyone crossing a threshold surfaces on the dashboard's priority roster and intervene-now list, worst first, with a suggested next action grounded in the actual threshold crossed.",
  },
  {
    number: "05",
    title: "Every step is on the record",
    body: "The point event, the threshold crossing, and any manual status change (which always requires a written reason) all land on the employee's track record — an auditable history, not a mutated total.",
  },
] as const;

const FAQ = [
  {
    q: "How do I decide how many points something is worth?",
    a: "You set it. Every event type gets a point value you define — weight it by duration, by notice, by severity, or by whatever matters to how your team runs.",
  },
  {
    q: "What happens when someone crosses a threshold?",
    a: "Whatever you've set up for that threshold — a check-in, a formal meeting, an escalation review. The system flags the crossing and notifies automatically; it never takes action on its own.",
  },
  {
    q: "Can the point values or thresholds be changed?",
    a: "Yes — every point rule and every threshold is editable from Settings, and every page that scores against them reads the live, current values, not a hardcoded copy.",
  },
  {
    q: "Does an edited threshold rewrite history?",
    a: "No. Point events are an append-only ledger. Editing a threshold changes where future events band — it never rewrites what already happened.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-full flex-col">
      <MarketingHeader active="how-it-works" />

      <section className="ops-atmosphere relative border-b border-line">
        <div className="ops-grid absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-24">
          <div className="live-pulse mb-5 h-[3px] w-16 sm:w-24" aria-hidden />
          <p className="text-sm font-semibold tracking-[0.18em] text-accent-deep uppercase">
            How it works
          </p>
          <h1 className="font-display mt-4 max-w-2xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Signal in. Risk out.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate/80 sm:text-lg">
            Every attendance event follows the same five-step path, from
            the moment it's logged to the moment a manager sees it on
            their roster.
          </p>
        </div>
      </section>

      <section className="relative border-b border-line bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-24">
          <ol className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
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
                    className="mt-6 hidden h-px w-full bg-line lg:block"
                    aria-hidden
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative border-b border-line">
        <div className="mx-auto max-w-4xl px-6 py-20 sm:px-8 sm:py-24">
          <p className="text-sm font-semibold tracking-[0.18em] text-accent-deep uppercase">
            Questions
          </p>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Common questions
          </h2>

          <dl className="mt-10 divide-y divide-line border-t border-line">
            {FAQ.map((item) => (
              <div key={item.q} className="py-6">
                <dt className="font-display text-lg font-semibold tracking-tight text-ink">
                  {item.q}
                </dt>
                <dd className="mt-2 text-base leading-relaxed text-slate/75">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-8 text-sm text-slate/60">
            See example point configurations on{" "}
            <Link
              href="/capabilities"
              className="font-medium text-accent-deep underline decoration-accent-deep/30 underline-offset-2 transition-colors hover:text-ink"
            >
              Capabilities
            </Link>
            .
          </p>
        </div>
      </section>

      <MarketingCtaBand
        heading="See a signal move through the whole path."
        body="Sign in to follow a real employee from a logged event to a risk band to a manager alert."
      />
      <MarketingFooter />
    </div>
  );
}
