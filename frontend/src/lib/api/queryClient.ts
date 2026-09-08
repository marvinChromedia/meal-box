import { QueryClient } from '@tanstack/react-query';

import { ApiClientError } from './http';

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) {
    return true; // unknown thrown value — treat as transient, same as a network blip
  }
  if (error.status === null) {
    return true; // NETWORK_ERROR — worth a retry
  }
  return error.status >= 500; // 4xx is the caller's fault, retrying won't help
}

/**
 * Single shared QueryClient — the one place retry/stale-time/refetch defaults
 * live, per AC2. Import this instance rather than constructing another one.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => failureCount < 2 && isRetryableError(error),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
