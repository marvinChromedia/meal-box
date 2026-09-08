import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../features/auth/api.ts', () => ({
  authApi: { register: vi.fn(), login: vi.fn(), logout: vi.fn(), me: vi.fn() },
}));

import { authApi } from '../../features/auth/api.ts';
import { AppLayout } from './AppLayout.tsx';

function renderAtRoute(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/one" element={<h2>Page one</h2>} />
            <Route path="/two" element={<h2>Page two</h2>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authApi.me).mockResolvedValue(null);
});

describe('AppLayout', () => {
  it('renders exactly one <main>, with the routed page inside it (AC1, AC3)', async () => {
    renderAtRoute('/one');

    const mains = screen.getAllByRole('main');
    expect(mains).toHaveLength(1);
    expect(await screen.findByRole('heading', { name: 'Page one' })).toBeInTheDocument();
    expect(mains[0]).toContainElement(screen.getByRole('heading', { name: 'Page one' }));
  });

  it('swaps the routed content when the route changes, without duplicating the header', async () => {
    renderAtRoute('/two');

    expect(await screen.findByRole('heading', { name: 'Page two' })).toBeInTheDocument();
    expect(screen.getAllByText('MealBox')).toHaveLength(1);
  });
});
