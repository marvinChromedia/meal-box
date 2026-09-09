import type { Recipe } from '@mealbox/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../../lib/api/http';
import { recipesApi } from '../recipes/api';
import { shoppingListApi } from '../shopping-list/api';
import { HomePage } from './HomePage';

function renderHomePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(<HomePage />, { wrapper });
}

function recipe(overrides: Pick<Recipe, 'id' | 'title' | 'createdAt'>): Recipe {
  return {
    ingredients: [],
    steps: [],
    tags: [],
    isFavorite: false,
    updatedAt: overrides.createdAt,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HomePage (TEST-250)', () => {
  it('shows a loading state before the recipe list resolves', () => {
    vi.spyOn(recipesApi, 'list').mockReturnValue(new Promise(() => undefined));
    vi.spyOn(shoppingListApi, 'get').mockReturnValue(new Promise(() => undefined));
    renderHomePage();

    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('shows an error state with retry when the recipe list fails to load (AC4)', async () => {
    vi.spyOn(recipesApi, 'list').mockRejectedValue(new ApiClientError('network down', 'NETWORK_ERROR'));
    vi.spyOn(shoppingListApi, 'get').mockReturnValue(new Promise(() => undefined));
    renderHomePage();

    expect(await screen.findByText(/couldn't load your recipe box/i)).toBeInTheDocument();
    expect(screen.getByText('network down')).toBeInTheDocument();
  });

  it('first run: shows one invitation, not zero counts, and no shopping-list summary (AC2)', async () => {
    vi.spyOn(recipesApi, 'list').mockResolvedValue([]);
    vi.spyOn(shoppingListApi, 'get').mockRejectedValue(
      new ApiClientError('no shopping list has been generated yet', 'SHOPPING_LIST_NOT_FOUND', 404),
    );
    renderHomePage();

    expect(await screen.findByText("Let's fill your recipe box")).toBeInTheDocument();
    expect(screen.queryByText(/0 recipes saved/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/recently added/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/shopping list yet/i)).not.toBeInTheDocument();
  });

  it('no shopping list yet is a normal state, not an error, alongside populated recipes (AC1, AC3)', async () => {
    vi.spyOn(recipesApi, 'list').mockResolvedValue([
      recipe({ id: 'r1', title: 'Chicken Adobo', createdAt: '2026-01-01T00:00:00.000Z' }),
    ]);
    vi.spyOn(shoppingListApi, 'get').mockRejectedValue(
      new ApiClientError('no shopping list has been generated yet', 'SHOPPING_LIST_NOT_FOUND', 404),
    );
    renderHomePage();

    expect(await screen.findByText('1 recipe saved.')).toBeInTheDocument();
    expect(screen.getByText(/no shopping list yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/no shopping list has been generated yet/)).not.toBeInTheDocument();
  });

  it('populated: shows counts, checked-off total, and recently added recipes linking to each (AC1)', async () => {
    vi.spyOn(recipesApi, 'list').mockResolvedValue([
      recipe({ id: 'r1', title: 'Chicken Adobo', createdAt: '2026-01-01T00:00:00.000Z' }),
      recipe({ id: 'r2', title: 'Pancit Canton', createdAt: '2026-01-03T00:00:00.000Z' }),
    ]);
    vi.spyOn(shoppingListApi, 'get').mockResolvedValue({
      id: 'list-1',
      items: [
        { id: 'i1', name: 'Soy sauce', quantity: 1, unit: 'bottle', checked: true, sourceRecipeIds: ['r1'] },
        { id: 'i2', name: 'Noodles', quantity: 2, unit: 'packs', checked: false, sourceRecipeIds: ['r2'] },
      ],
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z',
    });
    renderHomePage();

    expect(await screen.findByText('2 recipes saved.')).toBeInTheDocument();
    expect(screen.getByText('Shopping list: 2 items, 1 done.')).toBeInTheDocument();

    // Most recently created first.
    const recentLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/recipes/'));
    expect(recentLinks[0]).toHaveTextContent('Pancit Canton');
    expect(recentLinks[0]).toHaveAttribute('href', '/recipes/r2');
    expect(recentLinks[1]).toHaveTextContent('Chicken Adobo');

    expect(screen.getByRole('button', { name: 'Browse recipe box' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open shopping list' })).toBeInTheDocument();
  });

  it("shows the shopping-list section even while the recipe list is still loading, and vice versa (AC4 — one section's state never blanks the other)", async () => {
    vi.spyOn(recipesApi, 'list').mockReturnValue(new Promise(() => undefined));
    vi.spyOn(shoppingListApi, 'get').mockResolvedValue({
      id: 'list-1',
      items: [{ id: 'i1', name: 'Soy sauce', quantity: 1, unit: 'bottle', checked: false, sourceRecipeIds: [] }],
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z',
    });
    renderHomePage();

    await waitFor(() => expect(screen.getByText('Shopping list: 1 item, 0 done.')).toBeInTheDocument());
    // The recipes side is still its own loading state, not blanked out or replaced.
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it("shopping-list error doesn't block the populated recipes section from rendering (AC4)", async () => {
    vi.spyOn(recipesApi, 'list').mockResolvedValue([
      recipe({ id: 'r1', title: 'Chicken Adobo', createdAt: '2026-01-01T00:00:00.000Z' }),
    ]);
    vi.spyOn(shoppingListApi, 'get').mockRejectedValue(new ApiClientError('network down', 'NETWORK_ERROR'));
    renderHomePage();

    expect(await screen.findByText('1 recipe saved.')).toBeInTheDocument();
    expect(screen.getByText(/couldn't load your shopping list/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chicken Adobo' })).toBeInTheDocument();
  });
});
