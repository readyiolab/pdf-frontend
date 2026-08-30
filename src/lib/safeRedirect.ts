/** Validates a stored post-OAuth return path is same-origin and relative. */
export function safeInternalPath(raw: string | null, fallback: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  try {
    const u = new URL(raw, window.location.origin);
    if (u.origin !== window.location.origin) return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
