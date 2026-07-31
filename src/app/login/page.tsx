import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Manager sign in",
};

export default function LoginPage() {
  return (
    <div className="ops-atmosphere relative flex min-h-full flex-1 flex-col">
      <div className="ops-grid absolute inset-0 opacity-70" aria-hidden />

      <header className="relative z-10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-end px-6 py-5 sm:px-8">
          <Link
            href="/"
            className="text-sm text-slate/65 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Back home
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-16 pt-4 sm:px-8 sm:pb-20">
        <div className="w-full max-w-md">
          <div className="live-pulse mb-4 h-[3px] w-16 sm:w-24" aria-hidden />

          <p className="font-display animate-fade-up text-[clamp(2.5rem,8vw,3.75rem)] leading-[0.92] font-bold tracking-tight text-ink">
            AttendPoint
          </p>

          <h1 className="animate-fade-up-delay-1 mt-5 font-display text-xl font-semibold tracking-tight text-slate sm:text-2xl">
            Manager sign in
          </h1>
          <p className="animate-fade-up-delay-1 mt-2 text-base leading-relaxed text-slate/75">
            Enter the ops floor. Demo access needs no real account.
          </p>

          <div className="animate-fade-up-delay-2 mt-8">
            <LoginForm />
          </div>
        </div>
      </main>
    </div>
  );
}
