import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, authLinkClass, authSecondaryButtonClass } from "@/app/login/auth-shell";
import { isResetTokenUsable } from "@/lib/account";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  // The URL carries the reset token — never leak it via Referer.
  referrer: "no-referrer",
};

/** Landing page for the one-time link from /forgot-password. */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const token = (await searchParams)?.token ?? "";
  const usable = token.length > 0 && (await isResetTokenUsable(token));

  if (!usable) {
    return (
      <AuthShell
        heading="This link has expired"
        intro="Reset links work once and expire after one hour. Request a new one to continue."
      >
        <Link href="/forgot-password" className={authSecondaryButtonClass}>
          Request a new link
        </Link>
        <p className="mt-4 text-sm">
          <Link href="/login" className={authLinkClass}>
            Back to sign in
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      heading="Choose a new password"
      intro="You'll be signed out of any other devices once it's changed."
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
