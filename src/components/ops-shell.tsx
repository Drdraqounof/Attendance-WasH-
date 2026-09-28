import type { ReactNode } from "react";
import Link from "next/link";
import { SignOutButton } from "@/app/dashboard/sign-out-button";
import { NotificationBell } from "@/components/notification-bell";
import { ROLE_LABELS } from "@/lib/access";
import { CHROME_COPY } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import {
  getNotifications,
  getUnreadNotificationCount,
} from "@/lib/notifications-queries";
import { requireSession } from "@/lib/session";

type OpsNavActive =
  | "dashboard"
  | "analytics"
  | "insights"
  | "map"
  | "settings"
  | "profile"
  | "people";

const navLink = (
  href: string,
  label: string,
  active: boolean,
) => (
  <Link
    href={href}
    className={`text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
      active
        ? "font-medium text-ink"
        : "text-slate/60 hover:text-ink"
    }`}
    aria-current={active ? "page" : undefined}
  >
    {label}
  </Link>
);

export async function OpsHeader({
  active,
  crumb,
}: {
  active: OpsNavActive;
  crumb?: string;
}) {
  const lang = await getLang();
  const copy = CHROME_COPY[lang];
  const session = await requireSession();
  const reader = { email: session.email, scope: session.scope };
  const [notifications, unreadCount] = await Promise.all([
    getNotifications(reader, 10),
    getUnreadNotificationCount(reader),
  ]);
  const canSwitch = session.assignments.length > 1;

  return (
    <header className="relative z-30 border-b border-line/80 bg-white/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-8 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="font-display shrink-0 text-base font-semibold tracking-[0.08em] text-ink uppercase sm:tracking-[0.14em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            AttendPoint
          </Link>
          <span className="hidden text-line sm:inline" aria-hidden>
            /
          </span>
          <nav
            className="hidden items-center gap-5 sm:flex"
            aria-label="Ops navigation"
          >
            {navLink("/dashboard", copy.navDashboard, active === "dashboard")}
            {navLink("/analytics", copy.navAnalytics, active === "analytics")}
            {navLink("/insights", copy.navInsights, active === "insights")}
            {navLink("/map", copy.navMap, active === "map")}
            {navLink("/settings", copy.navSettings, active === "settings")}
          </nav>
          {crumb ? (
            <>
              <span className="hidden text-line md:inline" aria-hidden>
                /
              </span>
              <span className="hidden truncate text-base text-slate/60 md:inline">
                {crumb}
              </span>
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <div
            className="hidden items-center gap-2 border border-line bg-white/70 px-3 py-1.5 text-sm lg:flex"
            title={`Signed in as ${session.email}`}
          >
            <span className="font-semibold tracking-[0.12em] text-accent-deep uppercase">
              {ROLE_LABELS[session.active.role]}
            </span>
            <span className="max-w-56 truncate text-slate/70">
              {session.active.station?.name ?? "All stations"}
            </span>
            {canSwitch ? (
              <Link
                href="/login/workspace?switch=1"
                className="font-medium text-slate/60 underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                Switch
              </Link>
            ) : null}
          </div>
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            copy={copy}
          />
          {navLink("/profile", copy.navProfile, active === "profile")}
          <SignOutButton label={copy.signOut} />
        </div>
      </div>
      {/* Phone nav: its own row, scrolls sideways instead of overflowing the header. */}
      <nav
        className="flex items-center gap-5 overflow-x-auto border-t border-line/60 px-6 py-3 whitespace-nowrap sm:hidden"
        aria-label="Ops navigation mobile"
      >
        {navLink("/dashboard", copy.navDashboardShort, active === "dashboard")}
        {navLink("/analytics", copy.navAnalytics, active === "analytics")}
        {navLink("/insights", copy.navInsightsShort, active === "insights")}
        {navLink("/map", copy.navMap, active === "map")}
        {navLink("/settings", copy.navSettings, active === "settings")}
      </nav>
    </header>
  );
}

export async function OpsShell({
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
