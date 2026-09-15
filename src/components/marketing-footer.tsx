import Link from "next/link";

/** Shared footer for the homepage and the other public marketing pages. */
export function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-surface-2">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <span className="font-display font-semibold tracking-wide text-slate/80">
            AttendPoint
          </span>
          <p className="mt-1 text-sm text-slate/55">
            Automated attendance notification &amp; attendance point system.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate/60">
          <Link
            href="/capabilities"
            className="transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Capabilities
          </Link>
          <Link
            href="/how-it-works"
            className="transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            How it works
          </Link>
          <Link
            href="/login"
            className="transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Sign in
          </Link>
          <span className="text-slate/40">Demo build</span>
        </div>
      </div>
    </footer>
  );
}
