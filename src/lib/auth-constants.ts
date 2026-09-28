/**
 * Per-user session cookie (random token; its sha256 is the `sessions`
 * row id). Safe for client + server — the value itself is httpOnly.
 */
export const SESSION_COOKIE = "ap_session";
