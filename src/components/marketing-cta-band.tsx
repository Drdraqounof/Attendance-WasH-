import Link from "next/link";

/** Dark closing call-to-action band shared by the homepage and other public pages. */
export function MarketingCtaBand({
  heading = "Bring your floor's attendance data into one console.",
  body = "Sign in to see the risk console, point rule settings, and AI insights running against live demo data.",
}: {
  heading?: string;
  body?: string;
}) {
  return (
    <section className="relative border-t border-line bg-ink">
      <div
        className="ops-grid absolute inset-0 opacity-[0.08] mix-blend-soft-light"
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-16 sm:px-8 sm:py-20 md:flex-row md:items-center">
        <div className="max-w-xl">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {heading}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-white/70">{body}</p>
        </div>
        <Link
          href="/login"
          className="inline-flex h-12 shrink-0 items-center justify-center bg-accent px-7 text-sm font-semibold tracking-wide text-white transition-[background-color,transform] duration-200 hover:bg-accent-deep hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:translate-y-0"
        >
          Manager sign in
        </Link>
      </div>
    </section>
  );
}
