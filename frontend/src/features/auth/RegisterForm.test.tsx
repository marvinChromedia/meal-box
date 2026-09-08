import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RegisterForm } from './RegisterForm.tsx';

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

describe('RegisterForm', () => {
  it('has a labeled email and password field (accessibility)', () => {
    renderWithProviders(<RegisterForm />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('submits the entered credentials and navigates to /login on success (AC1)', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      id: 'u1',
      email: 'person@example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    renderWithProviders(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        email: 'person@example.com',
        password: 'password123',
      });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { state: { justRegistered: true } });
    });
  });

  it('shows the server error when the email is already taken (AC2)', async () => {
    vi.mocked(authApi.register).mockRejectedValue(
      new ApiClientError('that email is already registered', 'EMAIL_TAKEN', 409),
    );
    renderWithProviders(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'taken@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('that email is already registered');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
