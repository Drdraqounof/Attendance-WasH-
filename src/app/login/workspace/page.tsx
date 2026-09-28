import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isValidAssignment } from "@/lib/access";
import { getSession } from "@/lib/session";
import { WorkspacePicker } from "./workspace-picker";

export const metadata: Metadata = {
  title: "Choose your workspace",
};

/**
 * Shown after sign-in when a user has more than one role/station
 * assignment (e.g. HR, or a supervisor covering two stations), and
 * from the "Switch" link in the app header. Lists only the caller's
 * own assignments — see docs/auth/roles-and-stations.md.
 */
export default async function WorkspacePage({
  searchParams,
}: {
  searchParams?: Promise<{ switch?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const switching = (await searchParams)?.switch === "1";
  const options = session.assignments.filter(isValidAssignment);

  return (
    <div className="ops-atmosphere relative flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="ops-grid absolute inset-0 opacity-70" aria-hidden />
      <div className="relative z-10 w-full max-w-lg">
        <div className="live-pulse mx-auto mb-4 h-[3px] w-16 sm:w-24" aria-hidden />
        <h1 className="animate-fade-up font-display text-center text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Choose your workspace
        </h1>
        <p className="animate-fade-up-delay-1 mt-3 text-center text-base leading-relaxed text-slate/75">
          Signed in as {session.displayName}. What you see and can change depends on the
          role and station you pick.
        </p>
        <WorkspacePicker
          options={options}
          current={session.active}
          next={switching ? "/dashboard" : "/login/language"}
        />
      </div>
    </div>
  );
}
