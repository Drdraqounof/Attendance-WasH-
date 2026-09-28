import type { Metadata } from "next";
import { OpsShell } from "@/components/ops-shell";
import { SignOutButton } from "@/app/dashboard/sign-out-button";
import { NotificationPreferences } from "@/app/profile/notification-preferences";
import { describeAssignment, ROLE_LABELS } from "@/lib/access";
import { PROFILE_COPY } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const session = await requireSession();

  const lang = await getLang();
  const copy = PROFILE_COPY[lang];

  return (
    <OpsShell active="profile">
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-6 py-8 sm:px-8 sm:py-10">
        <div className="animate-fade-up">
          <p className="text-sm font-semibold tracking-[0.16em] text-slate/55 uppercase">
            {copy.eyebrow}
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {session.displayName}
          </h1>
          <p className="mt-2 text-lg text-slate/70">{ROLE_LABELS[session.active.role]}</p>
        </div>

        <section
          className="animate-fade-up-delay-1 mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Account details"
        >
          <div className="bg-white/80 px-5 py-5">
            <p className="text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
              {copy.labelEmail}
            </p>
            <p className="mt-2 text-lg font-medium break-all text-ink">
              {session.email}
            </p>
          </div>
          <div className="bg-white/80 px-5 py-5">
            <p className="text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
              Active role
            </p>
            <p className="mt-2 text-lg font-medium text-ink">
              {ROLE_LABELS[session.active.role]}
            </p>
          </div>
          <div className="bg-white/80 px-5 py-5">
            <p className="text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
              Station
            </p>
            <p className="mt-2 text-lg font-medium text-ink">
              {session.active.station?.name ?? "All stations"}
            </p>
          </div>
          <div className="bg-white/80 px-5 py-5">
            <p className="text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
              Assignments
            </p>
            <ul className="mt-2 space-y-1 text-sm text-ink">
              {session.assignments.map((assignment) => (
                <li key={`${assignment.role}-${assignment.station?.id ?? "all"}`}>
                  {describeAssignment(assignment)}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <NotificationPreferences copy={copy} />

        <div className="animate-fade-up-delay-3 mt-10 flex items-center justify-between border-t border-line/70 pt-6">
          <p className="text-sm tracking-wide text-slate/50">
            {copy.footer}
          </p>
          <SignOutButton />
        </div>
      </main>
    </OpsShell>
  );
}
