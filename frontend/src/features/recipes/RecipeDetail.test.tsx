import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../../lib/api/http';
import { recipesApi } from './api';
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
    </Routes>,
    { wrapper },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RecipeDetail (against the typed mock)', () => {
  it('shows the full recipe: title, ingredients with quantity/unit, steps in order (AC1)', async () => {
    renderRecipeDetail('/recipes/recipe-1');

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Garlic Butter Pasta' })).toBeInTheDocument(),
    );

    expect(screen.getByText(/200 g Spaghetti/)).toBeInTheDocument();
    expect(screen.getByText(/3 clove Garlic/)).toBeInTheDocument();

    const steps = screen.getAllByRole('listitem').map((el) => el.textContent);
    expect(steps).toEqual(
      expect.arrayContaining(['Boil pasta', 'Melt butter with garlic', 'Toss together']),
    );

    const stepsList = screen.getByText('Boil pasta').closest('ol');
    expect(stepsList).not.toBeNull();
    const ingredientsList = screen.getByText(/Spaghetti/).closest('ul');
    expect(ingredientsList).not.toBeNull();
  });

  it('confirms before deleting, then removes the recipe and returns to the box (AC3)', async () => {
    renderRecipeDetail('/recipes/recipe-1');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Garlic Butter Pasta' })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Garlic Butter Pasta');

    // Hold the delete request open so "confirmed" and "resolved" can't be
    // confused for each other by timing (TEST-235) — the mutation is still
    // pending when we assert the confirm click actually triggered it, and
    // navigation is asserted only after we deliberately resolve it.
    let resolveRemove!: () => void;
    const pendingRemove = new Promise<void>((resolve) => {
      resolveRemove = resolve;
    });
    const removeSpy = vi.spyOn(recipesApi, 'remove').mockReturnValueOnce(pendingRemove);

    // The header and the dialog both have a "Delete" button; click the one inside the dialog.
    const confirmButton = screen
      .getAllByRole('button', { name: /delete/i })
      .find((btn) => dialog.contains(btn));
    expect(confirmButton).toBeDefined();
    fireEvent.click(confirmButton!);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Deleting…' })).toBeInTheDocument(),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('Recipe Box Page')).not.toBeInTheDocument();

    resolveRemove();
    await waitFor(() => expect(screen.getByText('Recipe Box Page')).toBeInTheDocument());
    removeSpy.mockRestore();
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
