"use client";

import { useState, useTransition } from "react";
import { AuthField } from "@/app/login/auth-field";
import { authButtonClass } from "@/app/login/auth-shell";
import { PASSWORD_MIN_LENGTH, passwordProblem } from "@/lib/account-rules";

const ERROR_ID = "reset-form-error";

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");

    const problem =
      passwordProblem(password) ?? (password === confirm ? null : "The passwords don't match.");
    if (problem) {
      setError(problem);
      return;
    }

    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/password-reset/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(body.error ?? "Couldn't change your password. Try again.");
          return;
        }
        window.location.assign("/login?reset=1");
      } catch {
        setError("Couldn't change your password — check your connection and try again.");
      }
    });
  }

  const hasError = Boolean(error);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <AuthField
        id="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`}
        invalid={hasError}
        describedBy={hasError ? ERROR_ID : undefined}
      />
      <AuthField
        id="confirm"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        invalid={hasError}
        describedBy={hasError ? ERROR_ID : undefined}
      />
      <p id={ERROR_ID} role="alert" className="min-h-5 text-sm font-medium text-danger-soft">
        {error}
      </p>
      <button type="submit" disabled={pending} className={authButtonClass}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
