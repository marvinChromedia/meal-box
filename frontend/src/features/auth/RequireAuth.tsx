import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useCurrentUser } from './hooks.ts';

// Frontend counterpart to the backend's requireAuth: while signed out, a
// protected screen redirects to /login instead of rendering (AC3's
// "protected screens are no longer reachable").
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <div className="flex justify-center py-10 text-sm text-ink-muted">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
