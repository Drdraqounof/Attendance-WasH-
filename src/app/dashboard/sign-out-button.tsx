"use client";

export function SignOutButton({ label = "Sign out" }: { label?: string }) {
  async function onSignOut() {
    // Cookie is httpOnly (set by /api/login), so it can only be
    // cleared via a server response, not document.cookie.
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
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
