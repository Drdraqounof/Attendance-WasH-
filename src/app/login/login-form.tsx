"use client";

import { useState, useTransition } from "react";
import { DEMO_COOKIE } from "@/lib/auth-constants";

const ERROR_ID = "login-form-error";

function setDemoCookie() {
  document.cookie = `${DEMO_COOKIE}=1; path=/; max-age=86400; SameSite=Lax`;
}

function goToDashboard() {
  // Full navigation so the cookie is always picked up by the next request.
  window.location.assign("/dashboard");
}

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();
    const password = String(new FormData(form).get("password") ?? "");

    if (!email || !password) {
      setError("Enter an email and password to continue.");
      return;
    }

    setError("");
    startTransition(() => {
      setDemoCookie();
      goToDashboard();
    });
  }

  function onDemoAccess() {
    setError("");
    startTransition(() => {
      setDemoCookie();
      goToDashboard();
    });
  }

  const hasError = Boolean(error);

  return (
    <div className="w-full">
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium text-slate">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="manager@ops.example"
            aria-invalid={hasError}
            aria-describedby={hasError ? ERROR_ID : undefined}
            className="h-12 border border-line bg-white px-4 text-ink outline-none transition-[border-color,box-shadow] placeholder:text-slate/40 focus:border-accent focus:shadow-[0_0_0_3px_rgba(13,148,136,0.18)] aria-invalid:border-danger-soft"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-medium text-slate">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={hasError}
            aria-describedby={hasError ? ERROR_ID : undefined}
            className="h-12 border border-line bg-white px-4 text-ink outline-none transition-[border-color,box-shadow] placeholder:text-slate/40 focus:border-accent focus:shadow-[0_0_0_3px_rgba(13,148,136,0.18)] aria-invalid:border-danger-soft"
          />
        </div>

        <p
          id={ERROR_ID}
          role="alert"
          className="min-h-5 text-sm font-medium text-danger-soft"
        >
          {error}
        </p>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 items-center justify-center bg-accent text-sm font-semibold tracking-wide text-white transition-[background-color,transform,opacity] duration-200 hover:bg-accent-deep hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {pending ? "Signing in…" : "Enter dashboard"}
        </button>
      </form>

      <button
        type="button"
        onClick={onDemoAccess}
        disabled={pending}
        className="mt-3 inline-flex h-12 w-full items-center justify-center border border-line bg-transparent text-sm font-medium text-slate transition-colors hover:border-accent/50 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        Continue without credentials
      </button>

      <p className="mt-6 text-center text-xs tracking-wide text-slate/55">
        <span className="inline-block border border-danger-soft/25 bg-danger-soft/8 px-2.5 py-1 text-danger-soft">
          Demo mode — any credentials work
        </span>
      </p>
    </div>
  );
}
