import type { AuthCredentials, User } from '@recipe-box/shared';

import { apiRequest, ApiClientError } from '../../lib/api/http';

// No mock/http split here, unlike recipes/shopping-list: there is no
// meaningful way to mock signing in as a real identity, and the real
// endpoints (this ticket's own backend) already exist.
export const authApi = {
  async register(credentials: AuthCredentials): Promise<User> {
    const { user } = await apiRequest<{ user: User }>('/auth/register', {
      method: 'POST',
      body: credentials,
    });
    return user;
  },

  async login(credentials: AuthCredentials): Promise<User> {
    const { user } = await apiRequest<{ user: User }>('/auth/login', {
      method: 'POST',
      body: credentials,
    });
    return user;
  },

  logout(): Promise<void> {
    return apiRequest<void>('/auth/logout', { method: 'POST' });
  },

  async me(): Promise<User | null> {
    try {
      const { user } = await apiRequest<{ user: User }>('/auth/me');
      return user;
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        return null;
      }
      throw error;
    }
  },
};
