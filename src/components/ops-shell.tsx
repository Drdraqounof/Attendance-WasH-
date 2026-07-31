import type { ReactNode } from "react";
import Link from "next/link";
import { SignOutButton } from "@/app/dashboard/sign-out-button";

type OpsNavActive = "dashboard" | "analytics" | "people";

const navLink = (
  href: string,
  label: string,
  active: boolean,
) => (
  <Link
    href={href}
    className={`text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
      active
        ? "font-medium text-ink"
        : "text-slate/60 hover:text-ink"
    }`}
    aria-current={active ? "page" : undefined}
  >
    {label}
  </Link>
);

export function OpsHeader({
  active,
  crumb,
}: {
  active: OpsNavActive;
  crumb?: string;
}) {
  return (
    <header className="relative z-10 border-b border-line/80 bg-white/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="font-display shrink-0 text-sm font-semibold tracking-[0.14em] text-ink uppercase focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            AttendPoint
          </Link>
          <span className="hidden text-line sm:inline" aria-hidden>
            /
          </span>
          <nav
            className="hidden items-center gap-4 sm:flex"
            aria-label="Ops navigation"
          >
            {navLink("/dashboard", "Dashboard", active === "dashboard")}
            {navLink("/analytics", "Analytics", active === "analytics")}
          </nav>
          {crumb ? (
            <>
              <span className="hidden text-line md:inline" aria-hidden>
                /
              </span>
              <span className="hidden truncate text-sm text-slate/60 md:inline">
                {crumb}
              </span>
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <nav
            className="flex items-center gap-3 sm:hidden"
            aria-label="Ops navigation mobile"
          >
            {navLink("/dashboard", "Dash", active === "dashboard")}
            {navLink("/analytics", "Analytics", active === "analytics")}
          </nav>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

export function OpsShell({
  active,
  crumb,
  children,
}: {
  active: OpsNavActive;
  crumb?: string;
  children: ReactNode;
}) {
  return (
    <div className="ops-atmosphere relative flex min-h-full flex-1 flex-col">
      <div className="ops-grid absolute inset-0 opacity-50" aria-hidden />
      <OpsHeader active={active} crumb={crumb} />
      {children}
    </div>
  );
}
