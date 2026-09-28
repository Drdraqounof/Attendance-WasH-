"use client";

import { useState, useTransition } from "react";
import { AuthField } from "@/app/login/auth-field";
import { authButtonClass } from "@/app/login/auth-shell";
import { isValidEmail } from "@/lib/account-rules";

const ERROR_ID = "forgot-form-error";

export function ForgotPasswordForm() {
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/password-reset/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(body.error ?? "Couldn't send a reset link. Try again.");
          return;
        }
        setSent(true);
      } catch {
        setError("Couldn't send a reset link — check your connection and try again.");
      }
    });
  }

  if (sent) {
    return (
      <p role="status" className="border border-accent/40 bg-accent/10 px-4 py-4 text-sm leading-relaxed text-accent-deep">
        If that email has an AttendPoint account, a reset link is on its way. It works once and
        expires in one hour. Didn&apos;t get it? Check the address and try again, or ask HR.
      </p>
    );
  }

  const hasError = Boolean(error);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <AuthField
        id="email"
        label="Email"
        type="email"
        autoComplete="username"
        placeholder="manager@ops.example"
        invalid={hasError}
        describedBy={hasError ? ERROR_ID : undefined}
      />
      <p id={ERROR_ID} role="alert" className="min-h-5 text-sm font-medium text-danger-soft">
        {error}
      </p>
      <button type="submit" disabled={pending} className={authButtonClass}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
