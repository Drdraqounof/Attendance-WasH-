import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, authLinkClass } from "@/app/login/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      heading="Reset your password"
      intro="Enter the email you sign in with and we'll send you a link to choose a new password. The link works once, for one hour."
      footer={
        <p>
          Remembered it?{" "}
          <Link href="/login" className={authLinkClass}>
            Back to sign in
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
