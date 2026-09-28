"use client";

import { useState, useTransition } from "react";
import { AuthField } from "@/app/login/auth-field";
import { authButtonClass, authInputClass } from "@/app/login/auth-shell";
import type { UserRole } from "@/lib/access";
import {
  isValidEmail,
  nameProblem,
  PASSWORD_MIN_LENGTH,
  passwordProblem,
} from "@/lib/account-rules";

const ERROR_ID = "register-form-error";

export function RegisterForm({ stations }: { stations: { id: number; name: string }[] }) {
  const [role, setRole] = useState<UserRole>("supervisor");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    const stationRaw = String(data.get("station") ?? "");
    const stationId = role === "supervisor" && stationRaw ? Number(stationRaw) : null;

    const problem =
      (role === "supervisor" && stationId === null ? "Choose your station." : null) ??
      nameProblem(name) ??
      (isValidEmail(email) ? null : "Enter a valid email address.") ??
      passwordProblem(password) ??
      (password === confirm ? null : "The passwords don't match.");
    if (problem) {
      setError(problem);
      return;
    }

    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, role, stationId }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(body.error ?? "Registration failed. Try again.");
          return;
        }
        window.location.assign("/login?registered=1");
      } catch {
        setError("Registration failed — check your connection and try again.");
      }
    });
  }

  const hasError = Boolean(error);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <AuthField id="name" label="Full name" autoComplete="name" invalid={hasError} describedBy={hasError ? ERROR_ID : undefined} />
      <AuthField
        id="email"
        label="Work email"
        type="email"
        autoComplete="email"
        placeholder="manager@ops.example"
        invalid={hasError}
        describedBy={hasError ? ERROR_ID : undefined}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-slate">Role</legend>
        <div className="grid grid-cols-2 gap-px border border-line bg-line">
          {(["supervisor", "hr"] as const).map((option) => (
            <label
              key={option}
              className={`flex cursor-pointer items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-accent ${
                role === option ? "bg-ink text-white" : "bg-white text-slate/75 hover:bg-surface-2"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={option}
                checked={role === option}
                onChange={() => setRole(option)}
                className="sr-only"
              />
              {option === "hr" ? "HR" : "Supervisor"}
            </label>
          ))}
        </div>
        <p className="text-sm text-slate/60">
          {role === "hr"
            ? "HR sees every station and manages statuses and policy settings."
            : "Supervisors see the employees at their station."}
        </p>
      </fieldset>

      {role === "supervisor" ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="station" className="text-sm font-medium text-slate">
            Station
          </label>
          <select id="station" name="station" defaultValue="" className={authInputClass}>
            <option value="" disabled>
              {stations.length ? "Choose your station" : "No stations available"}
            </option>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <AuthField
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`}
        invalid={hasError}
        describedBy={hasError ? ERROR_ID : undefined}
      />
      <AuthField
        id="confirm"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        invalid={hasError}
        describedBy={hasError ? ERROR_ID : undefined}
      />

      <p id={ERROR_ID} role="alert" className="min-h-5 text-sm font-medium text-danger-soft">
        {error}
      </p>

      <button type="submit" disabled={pending} className={authButtonClass}>
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
