import type { ReactNode } from "react";
import Link from "next/link";
import { SignOutButton } from "@/app/dashboard/sign-out-button";
import { NotificationBell } from "@/components/notification-bell";
import { generateAttendanceAlerts } from "@/lib/alerts-mock";
import { ALERT_SEVERITY_LABELS_BY_LANG, CHROME_COPY } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { getAllPeople } from "@/lib/people-mock";

type OpsNavActive =
  | "dashboard"
  | "analytics"
  | "insights"
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
  const alerts = generateAttendanceAlerts(getAllPeople(lang));

  return (
    <header className="relative z-30 border-b border-line/80 bg-white/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="font-display shrink-0 text-base font-semibold tracking-[0.14em] text-ink uppercase focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
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

        <div className="flex shrink-0 items-center gap-5">
          <nav
            className="flex items-center gap-4 sm:hidden"
            aria-label="Ops navigation mobile"
          >
            {navLink("/dashboard", copy.navDashboardShort, active === "dashboard")}
            {navLink("/analytics", copy.navAnalytics, active === "analytics")}
            {navLink("/insights", copy.navInsightsShort, active === "insights")}
            {navLink("/settings", copy.navSettings, active === "settings")}
          </nav>
          <NotificationBell
            alerts={alerts}
            copy={copy}
            severityLabels={ALERT_SEVERITY_LABELS_BY_LANG[lang]}
          />
          {navLink("/profile", copy.navProfile, active === "profile")}
          <SignOutButton label={copy.signOut} />
        </div>
      </div>
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
