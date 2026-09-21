"use client";

import { useState, useTransition } from "react";

const ERROR_ID = "login-form-error";

function goToLanguage() {
  // Full navigation so the server-set session cookie is guaranteed to
  // be picked up on the very next request. Language choice happens
  // next, at /login/language, before landing on the dashboard — see
  // src/app/login/language/page.tsx.
  window.location.assign("/login/language");
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
    startTransition(async () => {
      try {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(data.error ?? "Sign-in failed. Try again.");
          return;
        }
        goToLanguage();
      } catch {
        setError("Sign-in failed — check your connection and try again.");
      }
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
    </div>
  );
}
