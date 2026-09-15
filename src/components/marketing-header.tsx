import Link from "next/link";

type MarketingNavActive = "capabilities" | "how-it-works" | null;

const LINKS: { href: string; label: string; key: MarketingNavActive }[] = [
  { href: "/capabilities", label: "Capabilities", key: "capabilities" },
  { href: "/how-it-works", label: "How it works", key: "how-it-works" },
];

/**
 * Light-themed header for public marketing pages other than the
 * homepage (which keeps its own transparent, white-text header
 * layered over the hero photo — see src/app/page.tsx). Used by
 * /capabilities and /how-it-works.
 */
export function MarketingHeader({ active = null }: { active?: MarketingNavActive }) {
  return (
    <header className="relative z-20 border-b border-line/80 bg-white/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-8">
        <Link
          href="/"
          className="font-display text-sm font-semibold tracking-[0.14em] text-ink uppercase focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          AttendPoint
        </Link>
        <nav className="hidden items-center gap-8 sm:flex" aria-label="Primary">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active === link.key ? "page" : undefined}
              className={`text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
                active === link.key
                  ? "font-medium text-ink"
                  : "text-slate/65 hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="text-sm font-medium text-slate/65 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Sign in
          </Link>
        </nav>
        <Link
          href="/login"
          className="inline-flex h-9 items-center justify-center border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-accent-deep/40 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:hidden"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}
