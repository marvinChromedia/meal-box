import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../../lib/api/http';
import { recipesApi } from './api';
import { RecipeBox } from './RecipeBox';

function renderRecipeBox() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
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
