"use client";

import { DEMO_COOKIE } from "@/lib/auth-constants";

export function SignOutButton({ label = "Sign out" }: { label?: string }) {
  function onSignOut() {
    document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      className="text-sm font-medium text-slate/70 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      {label}
    </button>
  );
}
