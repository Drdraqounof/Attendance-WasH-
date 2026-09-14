import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasDemoSession } from "@/lib/auth-mock";
import { LanguagePicker } from "./language-picker";

export const metadata: Metadata = {
  title: "Choose your language",
};

/**
 * Shown right after "Enter dashboard" / "Continue without credentials"
 * on /login (src/app/login/login-form.tsx), before the manager lands
 * on the dashboard. The choice made here is stored in the shared
 * `attendpoint_lang` cookie (src/lib/i18n.ts) and read by the app
 * chrome (src/components/ops-shell.tsx) on every page from then on.
 *
 * Heading/subtitle live inside LanguagePicker (client) so this
 * screen's own text switches to the picked language immediately on
 * click, rather than only affecting pages after it.
 */
export default async function LanguagePage() {
  const signedIn = await hasDemoSession();
  if (!signedIn) {
    redirect("/login");
  }

  return (
    <div className="ops-atmosphere relative flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="ops-grid absolute inset-0 opacity-70" aria-hidden />
      <div className="relative z-10 w-full max-w-md text-center">
        <div className="live-pulse mx-auto mb-4 h-[3px] w-16 sm:w-24" aria-hidden />
        <LanguagePicker />
      </div>
    </div>
  );
}
