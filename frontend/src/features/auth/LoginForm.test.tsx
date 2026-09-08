import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginForm } from './LoginForm.tsx';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('./api.ts', () => ({
  authApi: { register: vi.fn(), login: vi.fn(), logout: vi.fn(), me: vi.fn() },
}));

import { ApiClientError } from '../../lib/api/http.ts';
import { authApi } from './api.ts';

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginForm', () => {
  it('has a labeled email and password field (accessibility)', () => {
    renderWithProviders(<LoginForm />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('signs in with the entered credentials and navigates to the home page (AC3)', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      id: 'u1',
      email: 'person@example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    renderWithProviders(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'person@example.com',
        password: 'password123',
      });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows the same generic error for wrong password or unknown email (AC4)', async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiClientError('incorrect email or password', 'INVALID_CREDENTIALS', 401),
    );
    renderWithProviders(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nobody@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'whatever' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('incorrect email or password');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
