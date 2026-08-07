import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-8">
          <span className="font-display text-sm font-semibold tracking-[0.14em] text-white/80 uppercase">
            AttendPoint
          </span>
          <Link
            href="/login"
            className="text-sm font-medium text-white/75 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
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
          className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/50 to-slate/35"
          aria-hidden
        />
        <div
          className="ops-grid absolute inset-0 opacity-40 mix-blend-soft-light"
          aria-hidden
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 pt-32 sm:px-8 sm:pb-20">
          <div className="live-pulse mb-4 h-[3px] w-20 sm:mb-5 sm:w-36" aria-hidden />

          <p className="animate-fade-up font-display text-[clamp(2.75rem,10vw,6.5rem)] leading-[0.9] font-bold tracking-tight text-white">
            AttendPoint
          </p>

          <h1 className="animate-fade-up-delay-1 mt-6 max-w-xl font-display text-[clamp(1.35rem,3.2vw,2rem)] leading-snug font-semibold text-white/95">
            Live attendance risk, before the shift slips.
          </h1>

          <p className="animate-fade-up-delay-2 mt-4 max-w-md text-base leading-relaxed text-white/70 sm:text-lg">
            Turn SMS attendance into live risk scores for managers.
          </p>

          <div className="animate-fade-up-delay-3 mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center bg-accent px-7 text-sm font-semibold tracking-wide text-white transition-[background-color,transform] duration-200 hover:bg-accent-deep hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:translate-y-0"
            >
              Manager sign in
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center border border-white/30 px-7 text-sm font-medium text-white/85 transition-colors hover:border-white/55 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              View demo overview
            </a>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="ops-atmosphere relative border-t border-line"
      >
        <div className="ops-grid absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:px-8 sm:py-24">
          <p className="text-sm font-semibold tracking-[0.18em] text-accent-deep uppercase">
            How it works
          </p>
          <h2 className="font-display mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            SMS in. Risk out.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate/80 sm:text-lg">
            Attendance messages land in AttendPoint, map to policy points, and
            surface as live risk scores — so supervisors act before a floor
            problem becomes a shift problem.
          </p>
        </div>
      </section>

      <footer className="border-t border-line bg-surface-2">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-sm text-slate/60 sm:px-8">
          <span className="font-display font-semibold tracking-wide text-slate/70">
            AttendPoint
          </span>
          <span>Demo build</span>
        </div>
      </footer>
    </div>
  );
}
