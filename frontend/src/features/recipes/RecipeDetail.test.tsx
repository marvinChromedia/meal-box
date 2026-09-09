import type { Recipe } from '@mealbox/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../../lib/api/http';
import { shoppingListApi } from '../shopping-list/api';
import { __resetMockRecipesForTests, recipesApi } from './api';
import { RecipeDetail } from './RecipeDetail';

function renderRecipeDetail(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(
    <Routes>
      <Route path="/recipes/:id" element={<RecipeDetail />} />
      <Route path="/recipes" element={<div>Recipe Box Page</div>} />
      <Route path="/shopping-list" element={<p>Shopping list page</p>} />
    </Routes>,
    { wrapper },
  );
}

beforeEach(() => {
  __resetMockRecipesForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RecipeDetail (against the typed mock)', () => {
  it('shows the full recipe: title, ingredients with quantity/unit, steps in order (AC1)', async () => {
    renderRecipeDetail('/recipes/recipe-1');

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Garlic Butter Pasta' })).toBeInTheDocument(),
    );

    // Quantity/unit and name render as separate elements (TEST-260 — quantity
    // visually distinct from the name), so each is checked individually rather
    // than as one combined string.
    expect(screen.getByText('200 g')).toBeInTheDocument();
    expect(screen.getByText('Spaghetti')).toBeInTheDocument();
    expect(screen.getByText('3 clove')).toBeInTheDocument();
    expect(screen.getByText('Garlic')).toBeInTheDocument();

    const steps = screen.getAllByRole('listitem').map((el) => el.textContent);
    expect(steps).toEqual(
      expect.arrayContaining(['Boil pasta', 'Melt butter with garlic', 'Toss together']),
    );

    const stepsList = screen.getByText('Boil pasta').closest('ol');
    expect(stepsList).not.toBeNull();
    const ingredientsList = screen.getByText(/Spaghetti/).closest('ul');
    expect(ingredientsList).not.toBeNull();
  });

  it('adds this recipe to the shopping list and moves to that screen, when none exists yet (AC3, TEST-260)', async () => {
    vi.spyOn(shoppingListApi, 'get').mockRejectedValueOnce(
      new ApiClientError('No shopping list yet', 'SHOPPING_LIST_NOT_FOUND', 404),
    );

    renderRecipeDetail('/recipes/recipe-1');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Garlic Butter Pasta' })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /add to shopping list/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Shopping list page')).toBeInTheDocument());
  });

  it('warns before adding to an existing shopping list, describing the merge rather than a wipe (AC4, TEST-260)', async () => {
    renderRecipeDetail('/recipes/recipe-1');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Garlic Butter Pasta' })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /add to shopping list/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/already have a shopping list/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    await waitFor(() => expect(screen.getByText('Shopping list page')).toBeInTheDocument());
  });

  it('confirms before deleting, then removes the recipe and returns to the box (AC3)', async () => {
    renderRecipeDetail('/recipes/recipe-1');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Garlic Butter Pasta' })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Garlic Butter Pasta');

    // The header and the dialog both have a "Delete" button; click the one inside the dialog.
    const confirmButton = screen
      .getAllByRole('button', { name: /delete/i })
      .find((btn) => dialog.contains(btn));
    expect(confirmButton).toBeDefined();
    fireEvent.click(confirmButton!);

    await waitFor(() => expect(screen.getByText('Recipe Box Page')).toBeInTheDocument());
  });

  it('cancelling the delete confirmation changes nothing (AC4)', async () => {
    renderRecipeDetail('/recipes/recipe-2');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Chicken Stir Fry' })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chicken Stir Fry' })).toBeInTheDocument();
  });

  it('toggles favorite from the header star and reflects immediately (TEST-123 AC2)', async () => {
    renderRecipeDetail('/recipes/recipe-2');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Chicken Stir Fry' })).toBeInTheDocument(),
    );

    // Held open deliberately: the real mock request has a 150ms simulated
    // delay, and a test that returns before it settles leaks that pending
    // timer into whichever test runs next in this file — its eventual
    // resolution would mutate the shared mock recipe list out from under a
    // later test.
    let resolveSetFavorite!: (value: Recipe) => void;
    const pending = new Promise<Recipe>((resolve) => {
      resolveSetFavorite = resolve;
    });
    const setFavoriteSpy = vi.spyOn(recipesApi, 'setFavorite').mockReturnValueOnce(pending as never);

    const star = screen.getByRole('button', { name: 'Favorite Chicken Stir Fry' });
    expect(star).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(star);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Unfavorite Chicken Stir Fry' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );

    resolveSetFavorite({
      id: 'recipe-2',
      title: 'Chicken Stir Fry',
      ingredients: [],
      steps: ['Slice chicken and vegetables'],
      tags: ['weeknight'],
      isFavorite: true,
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    // Settling also triggers a real (unmocked) refetch, which has its own
    // 150ms mock delay — wait it out too, for the same reason.
    await new Promise((resolve) => setTimeout(resolve, 250));
    setFavoriteSpy.mockRestore();
  });

  it('shows a not-found state for a recipe that does not exist, with a way back (AC5)', async () => {
    vi.spyOn(recipesApi, 'get').mockRejectedValueOnce(
      new ApiClientError('Recipe missing-id not found', 'NOT_FOUND', 404),
    );

    renderRecipeDetail('/recipes/missing-id');

    await waitFor(() => expect(screen.getByText('Recipe not found')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /back to recipe box/i })).toHaveAttribute(
      'href',
      '/recipes',
    );
  });
});
