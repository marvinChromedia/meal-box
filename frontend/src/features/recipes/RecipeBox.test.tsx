import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../../lib/api/http';
import { shoppingListApi } from '../shopping-list/api';
import { recipesApi } from './api';
import { RecipeBox } from './RecipeBox';

function renderRecipeBox() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // A real /shopping-list route so AC3's "moves to the shopping list screen"
  // is observable, without registering that route in App.tsx (TEST-77's job).
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={children} />
          <Route path="/shopping-list" element={<p>Shopping list page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return render(<RecipeBox />, { wrapper });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RecipeBox (against the typed mock, per TEST-155 AC5)', () => {
  it('shows a loading state before the list resolves (AC1)', () => {
    renderRecipeBox();
    expect(screen.getByRole('status')).toHaveTextContent(/loading recipes/i);
  });

  it('lists saved recipes by title once loaded (AC1)', async () => {
    renderRecipeBox();

    await waitFor(() => expect(screen.getByText('Garlic Butter Pasta')).toBeInTheDocument());
    expect(screen.getByText('Chicken Stir Fry')).toBeInTheDocument();
  });

  it('filters by title, case-insensitively (AC2)', async () => {
    renderRecipeBox();
    await waitFor(() => expect(screen.getByText('Garlic Butter Pasta')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/search by title or ingredient/i), {
      target: { value: 'GARLIC' },
    });

    expect(screen.getByText('Garlic Butter Pasta')).toBeInTheDocument();
    expect(screen.queryByText('Chicken Stir Fry')).not.toBeInTheDocument();
  });

  it('filters by ingredient even when the term is not in any title (AC3)', async () => {
    renderRecipeBox();
    await waitFor(() => expect(screen.getByText('Chicken Stir Fry')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/search by title or ingredient/i), {
      target: { value: 'soy sauce' },
    });

    expect(screen.getByText('Chicken Stir Fry')).toBeInTheDocument();
    expect(screen.queryByText('Garlic Butter Pasta')).not.toBeInTheDocument();
  });

  it('links each recipe to its own detail route (AC4)', async () => {
    renderRecipeBox();
    await waitFor(() => expect(screen.getByText('Garlic Butter Pasta')).toBeInTheDocument());

    expect(screen.getByRole('link', { name: /garlic butter pasta/i })).toHaveAttribute(
      'href',
      '/recipes/recipe-1',
    );
  });

  it('shows a "no matches" state distinct from "no recipes yet", with a way back (AC5)', async () => {
    renderRecipeBox();
    await waitFor(() => expect(screen.getByText('Garlic Butter Pasta')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/search by title or ingredient/i), {
      target: { value: 'nonexistent ingredient' },
    });

    expect(screen.getByText('No matches')).toBeInTheDocument();
    expect(screen.queryByText('No recipes yet')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear search/i }));

    expect(screen.getByText('Garlic Butter Pasta')).toBeInTheDocument();
    expect(screen.getByText('Chicken Stir Fry')).toBeInTheDocument();
  });

  it('shows the "no recipes yet" state when the box is empty (AC5)', async () => {
    vi.spyOn(recipesApi, 'list').mockResolvedValueOnce([]);
    renderRecipeBox();

    await waitFor(() => expect(screen.getByText('No recipes yet')).toBeInTheDocument());
  });

  it('shows an error state with a retry when the list fails to load', async () => {
    vi.spyOn(recipesApi, 'list').mockRejectedValueOnce(
      new ApiClientError('network down', 'NETWORK_ERROR', null),
    );
    renderRecipeBox();

    await waitFor(() => expect(screen.getByText(/couldn't load recipes/i)).toBeInTheDocument());
    expect(screen.getByText('network down')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => expect(screen.getByText('Garlic Butter Pasta')).toBeInTheDocument());
  });
});

describe('RecipeBox selection mode (TEST-153)', () => {
  async function enterSelectionMode() {
    renderRecipeBox();
    await waitFor(() => expect(screen.getByText('Garlic Butter Pasta')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /select recipes/i }));
  }

  it('selects and deselects more than one recipe, visibly (AC1)', async () => {
    await enterSelectionMode();

    const pasta = screen.getByLabelText('Garlic Butter Pasta') as HTMLInputElement;
    const stirFry = screen.getByLabelText('Chicken Stir Fry') as HTMLInputElement;

    fireEvent.click(pasta);
    fireEvent.click(stirFry);
    expect(pasta.checked).toBe(true);
    expect(stirFry.checked).toBe(true);

    fireEvent.click(pasta);
    expect(pasta.checked).toBe(false);
    expect(stirFry.checked).toBe(true);
  });

  it('shows how many recipes are selected (AC2)', async () => {
    await enterSelectionMode();

    expect(screen.getByText('0 recipes selected')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Garlic Butter Pasta'));
    expect(screen.getByText('1 recipe selected')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Chicken Stir Fry'));
    expect(screen.getByText('2 recipes selected')).toBeInTheDocument();
  });

  it('disables generate with an explanation when nothing is selected (AC4)', async () => {
    await enterSelectionMode();

    expect(screen.getByRole('button', { name: /generate shopping list/i })).toBeDisabled();
    expect(screen.getByText(/select at least one recipe/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Garlic Butter Pasta'));

    expect(screen.getByRole('button', { name: /generate shopping list/i })).toBeEnabled();
  });

  it('cancelling selection mode clears the selection', async () => {
    await enterSelectionMode();
    fireEvent.click(screen.getByLabelText('Garlic Butter Pasta'));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByText(/recipes selected/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /select recipes/i }));
    expect(screen.getByText('0 recipes selected')).toBeInTheDocument();
  });

  it('warns before generating over an existing list, describing the merge rather than a wipe (AC5)', async () => {
    await enterSelectionMode();
    fireEvent.click(screen.getByLabelText('Garlic Butter Pasta'));
    fireEvent.click(screen.getByRole('button', { name: /generate shopping list/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/already have a shopping list/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    await waitFor(() => expect(screen.getByText('Shopping list page')).toBeInTheDocument());
  });

  it('generates immediately and moves to the shopping list screen when none exists yet (AC3)', async () => {
    vi.spyOn(shoppingListApi, 'get').mockRejectedValueOnce(
      new ApiClientError('No shopping list yet', 'SHOPPING_LIST_NOT_FOUND', 404),
    );

    await enterSelectionMode();
    fireEvent.click(screen.getByLabelText('Garlic Butter Pasta'));
    fireEvent.click(screen.getByRole('button', { name: /generate shopping list/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Shopping list page')).toBeInTheDocument());
  });
});
