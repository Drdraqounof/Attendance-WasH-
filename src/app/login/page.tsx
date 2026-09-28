import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, authLinkClass, authSecondaryButtonClass } from "./auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Manager sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ reset?: string; registered?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const notice =
    params.reset === "1"
      ? "Your password has been changed. Sign in with your new password."
      : params.registered === "1"
        ? "Account created. Sign in to continue."
        : null;

  return (
    <AuthShell
      heading="Manager sign in"
      intro="Sign in with your WashCycle manager email to enter the ops floor."
      footer={
        <div className="flex flex-col gap-3">
          <p>New to AttendPoint?</p>
          <Link href="/register" className={authSecondaryButtonClass}>
            Create an account
          </Link>
        </div>
      }
    >
      {notice ? (
        <p
          role="status"
          className="mb-6 border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent-deep"
        >
          {notice}
        </p>
      ) : null}
      <LoginForm />
      <p className="mt-4 text-right text-sm">
        <Link href="/forgot-password" className={authLinkClass}>
          Forgot password?
        </Link>
      </p>
    </AuthShell>
  );
}
