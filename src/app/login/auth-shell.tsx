import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Shared frame for the signed-out account pages — /login, /register,
 * /forgot-password, /reset-password — so they read as one flow.
 */
export function AuthShell({
  heading,
  intro,
  children,
  footer,
}: {
  heading: string;
  intro: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="ops-atmosphere relative flex min-h-full flex-1 flex-col">
      <div className="ops-grid absolute inset-0 opacity-70" aria-hidden />

      <header className="relative z-10">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-end px-6 py-5 sm:px-8">
          <Link
            href="/"
            className="text-sm text-slate/65 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Back home
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 pb-16 pt-4 sm:px-8 sm:pb-20">
        <div className="w-full max-w-md">
          <div className="live-pulse mb-4 h-[3px] w-16 sm:w-24" aria-hidden />

          <p className="font-display animate-fade-up text-[clamp(2.5rem,8vw,3.75rem)] leading-[0.92] font-bold tracking-tight text-ink">
            AttendPoint
          </p>

          <h1 className="animate-fade-up-delay-1 mt-5 font-display text-xl font-semibold tracking-tight text-slate sm:text-2xl">
            {heading}
          </h1>
          <div className="animate-fade-up-delay-1 mt-2 text-base leading-relaxed text-slate/75">
            {intro}
          </div>

          <div className="animate-fade-up-delay-2 mt-8">{children}</div>

          {footer ? (
            <div className="animate-fade-up-delay-3 mt-8 border-t border-line/70 pt-5 text-sm text-slate/70">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export const authLinkClass =
  "font-medium text-accent-deep underline-offset-4 transition-colors hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

export const authInputClass =
  "h-12 w-full border border-line bg-white px-4 text-ink outline-none transition-[border-color,box-shadow] placeholder:text-slate/40 focus:border-accent focus:shadow-[0_0_0_3px_rgba(13,148,136,0.18)] aria-invalid:border-danger-soft";

export const authButtonClass =
  "inline-flex h-12 w-full items-center justify-center bg-accent text-sm font-semibold tracking-wide text-white transition-[background-color,transform,opacity] duration-200 hover:bg-accent-deep hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

export const authSecondaryButtonClass =
  "inline-flex h-12 w-full items-center justify-center border border-line bg-white/80 text-sm font-semibold tracking-wide text-ink transition-colors hover:border-accent/50 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";
