import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OpsShell } from "@/components/ops-shell";
import { SignOutButton } from "@/app/dashboard/sign-out-button";
import { hasDemoSession } from "@/lib/auth-mock";
import { DEMO_MANAGER } from "@/lib/manager-mock";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const signedIn = await hasDemoSession();
  if (!signedIn) {
    redirect("/login");
  }

  const manager = DEMO_MANAGER;

  return (
    <OpsShell active="profile">
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-6 py-8 sm:px-8 sm:py-10">
        <div className="animate-fade-up">
          <p className="text-sm font-semibold tracking-[0.16em] text-slate/55 uppercase">
            Manager profile
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {manager.name}
          </h1>
          <p className="mt-2 text-lg text-slate/70">{manager.role}</p>
        </div>

        <section
          className="animate-fade-up-delay-1 mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Account details"
        >
          <div className="bg-white/80 px-5 py-5">
            <p className="text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
              Email
            </p>
            <p className="mt-2 text-lg font-medium text-ink">
              {manager.email}
            </p>
          </div>
          <div className="bg-white/80 px-5 py-5">
            <p className="text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
              Phone
            </p>
            <p className="mt-2 text-lg font-medium text-ink">
              {manager.phoneMasked}
            </p>
          </div>
          <div className="bg-white/80 px-5 py-5">
            <p className="text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
              Floor
            </p>
            <p className="mt-2 text-lg font-medium text-ink">
              {manager.floor}
            </p>
          </div>
          <div className="bg-white/80 px-5 py-5">
            <p className="text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
              Manager since
            </p>
            <p className="mt-2 text-lg font-medium text-ink">
              {manager.joined}
            </p>
          </div>
        </section>

        <section
          className="animate-fade-up-delay-2 mt-8 border border-line bg-white/70 px-5 py-6 sm:px-6"
          aria-labelledby="notifications-heading"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2
              id="notifications-heading"
              className="font-display text-xl font-semibold tracking-tight text-ink"
            >
              Notification preferences
            </h2>
            <Link
              href="/settings"
              className="text-sm font-medium tracking-wide text-accent-deep uppercase transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              Manage automation
            </Link>
          </div>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate/70">
            Manager alerts, 30-day trend analysis, and recognition
            automations are configured on the settings page and apply across
            every floor you supervise.
          </p>
        </section>

        <div className="animate-fade-up-delay-3 mt-10 flex items-center justify-between border-t border-line/70 pt-6">
          <p className="text-sm tracking-wide text-slate/50">
            Demo account · not connected to a real identity provider
          </p>
          <SignOutButton />
        </div>
      </main>
    </OpsShell>
  );
}
