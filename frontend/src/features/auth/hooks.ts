import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthCredentials } from '@mealbox/shared';

import { queryKeys } from '../../lib/api/queryKeys';
import { authApi } from './api';

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.currentUser(),
    queryFn: authApi.me,
    retry: false,
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (credentials: AuthCredentials) => authApi.register(credentials),
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: AuthCredentials) => authApi.login(credentials),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.currentUser(), user);
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.auth.currentUser(), null);
    },
  });
}
