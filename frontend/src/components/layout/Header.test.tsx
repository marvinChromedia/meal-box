import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../features/auth/api.ts', () => ({
  authApi: { register: vi.fn(), login: vi.fn(), logout: vi.fn(), me: vi.fn() },
}));

import { authApi } from '../../features/auth/api.ts';
import { Header } from './Header.tsx';

function renderHeader(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={<Header />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Header', () => {
  it('signed in: shows navigation, the signed-in user, and a sign-out control (AC2, TEST-249)', async () => {
    vi.mocked(authApi.me).mockResolvedValue({
      id: 'u1',
      email: 'cook@example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    renderHeader('/recipes');

    await waitFor(() => expect(screen.getByRole('link', { name: 'Recipe Box' })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Shopping List' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'cook@example.com' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('signed in: the current page is conveyed programmatically via aria-current (AC3)', async () => {
    vi.mocked(authApi.me).mockResolvedValue({
      id: 'u1',
      email: 'cook@example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    renderHeader('/recipes');

    await waitFor(() => expect(screen.getByRole('link', { name: 'Recipe Box' })).toHaveAttribute('aria-current', 'page'));
    expect(screen.getByRole('link', { name: 'Shopping List' })).not.toHaveAttribute('aria-current');
  });

  it('signed in: the nav sits in a labeled landmark (AC3)', async () => {
    vi.mocked(authApi.me).mockResolvedValue({
      id: 'u1',
      email: 'cook@example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    renderHeader('/recipes');

    await waitFor(() => expect(screen.getByRole('navigation')).toBeInTheDocument());
  });

  it('signed in: sign-out calls the API and the button reflects the pending state', async () => {
    vi.mocked(authApi.me).mockResolvedValue({
      id: 'u1',
      email: 'cook@example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    let resolveLogout!: () => void;
    vi.mocked(authApi.logout).mockReturnValue(
      new Promise((resolve) => {
        resolveLogout = resolve;
      }),
    );
    renderHeader('/recipes');

    const signOutButton = await screen.findByRole('button', { name: 'Sign out' });
    fireEvent.click(signOutButton);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Signing out…' })).toBeInTheDocument());
    resolveLogout();
    await waitFor(() => expect(authApi.logout).toHaveBeenCalled());
  });

  it('signed out: shows no navigation and no sign-out control, but still shows the brand (AC4)', async () => {
    vi.mocked(authApi.me).mockResolvedValue(null);
    renderHeader('/login');

    await waitFor(() => expect(screen.getByText('MealBox')).toBeInTheDocument());
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Recipe Box' })).not.toBeInTheDocument();
  });
});
