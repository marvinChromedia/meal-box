/**
 * The one seam for attaching request credentials (TEST-159 decides the actual
 * mechanism — token in a header, cookie-based session, etc). Whoever builds
 * that ticket calls `setAuthHeaderProvider` once at app startup; every request
 * `client.ts` makes already runs through `getAuthHeaders()`, so no call site
 * changes when auth lands.
 */
type AuthHeaderProvider = () => Record<string, string> | undefined;

let authHeaderProvider: AuthHeaderProvider | null = null;

export function setAuthHeaderProvider(provider: AuthHeaderProvider | null): void {
  authHeaderProvider = provider;
}

export function getAuthHeaders(): Record<string, string> {
  return authHeaderProvider?.() ?? {};
}
