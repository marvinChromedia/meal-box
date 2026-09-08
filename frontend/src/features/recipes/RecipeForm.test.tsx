import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../../lib/api/http';
import { recipesApi } from './api';
import { RecipeForm } from './RecipeForm';

function renderRecipeForm(path: string) {
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
      <Route path="/recipes/new" element={<RecipeForm />} />
      <Route path="/recipes/:id/edit" element={<RecipeForm />} />
      <Route path="/recipes/:id" element={<div>Recipe Detail Page</div>} />
    </Routes>,
    { wrapper },
  );
}

/** Fills the form's single default ingredient row and single default step row. */
function fillMinimalRecipe() {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Tomato Soup' } });
  fireEvent.change(screen.getByLabelText('Ingredient name'), { target: { value: 'Tomato' } });
  fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '4' } });
  fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'whole' } });
  fireEvent.change(screen.getByLabelText('Step 1'), { target: { value: 'Simmer' } });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RecipeForm — create (AC1)', () => {
  it('creates a recipe from a filled-in form and navigates to its detail page', async () => {
    renderRecipeForm('/recipes/new');

    fillMinimalRecipe();
    fireEvent.click(screen.getByRole('button', { name: 'Save recipe' }));

    await waitFor(() => expect(screen.getByText('Recipe Detail Page')).toBeInTheDocument());
  });

  it('blocks submission and shows field errors for a missing title, no ingredient, a non-numeric quantity, and no steps (AC5)', () => {
    renderRecipeForm('/recipes/new');

    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: 'four' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save recipe' }));

    expect(screen.getByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('Ingredient name is required.')).toBeInTheDocument();
    expect(screen.getByText('Quantity must be a number.')).toBeInTheDocument();
    expect(screen.getByText('Add at least one step.')).toBeInTheDocument();
  });

  it('accepts an empty unit — free text, valid for countable ingredients', async () => {
    renderRecipeForm('/recipes/new');
    fillMinimalRecipe();
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: '' } });

    const createSpy = vi.spyOn(recipesApi, 'create');
    fireEvent.click(screen.getByRole('button', { name: 'Save recipe' }));

    await waitFor(() => expect(createSpy).toHaveBeenCalled());
    expect(createSpy.mock.calls[0]![0].ingredients[0]!.unit).toBe('');
  });

  it('does not lose entered values when the API rejects the save (AC6)', async () => {
    vi.spyOn(recipesApi, 'create').mockRejectedValueOnce(
      new ApiClientError('title already exists', 'CONFLICT', 409),
    );
    renderRecipeForm('/recipes/new');

    fillMinimalRecipe();
    fireEvent.click(screen.getByRole('button', { name: 'Save recipe' }));

    await waitFor(() => expect(screen.getByText('title already exists')).toBeInTheDocument());

    expect(screen.getByLabelText('Title')).toHaveValue('Tomato Soup');
    expect(screen.getByLabelText('Ingredient name')).toHaveValue('Tomato');
    expect(screen.getByLabelText('Step 1')).toHaveValue('Simmer');
  });
});

describe('RecipeForm — ingredient rows (AC2)', () => {
  it('removing a middle row keeps the remaining rows their own values, no inheriting or dropping', () => {
    renderRecipeForm('/recipes/new');

    fireEvent.click(screen.getByRole('button', { name: 'Add ingredient' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add ingredient' }));

    const nameInputs = screen.getAllByLabelText('Ingredient name');
    expect(nameInputs).toHaveLength(3);
    fireEvent.change(nameInputs[0]!, { target: { value: 'First' } });
    fireEvent.change(nameInputs[1]!, { target: { value: 'Middle' } });
    fireEvent.change(nameInputs[2]!, { target: { value: 'Last' } });

    fireEvent.click(screen.getByRole('button', { name: 'Remove Middle row' }));

    const remaining = screen
      .getAllByLabelText('Ingredient name')
      .map((el) => (el as HTMLInputElement).value);
    expect(remaining).toEqual(['First', 'Last']);
  });
});

describe('RecipeForm — step reordering (AC3)', () => {
  it('moving a step up changes the saved order', async () => {
    renderRecipeForm('/recipes/new');

    fillMinimalRecipe();
    fireEvent.change(screen.getByLabelText('Step 1'), { target: { value: 'First' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add step' }));
    fireEvent.change(screen.getByLabelText('Step 2'), { target: { value: 'Second' } });

    fireEvent.click(screen.getByRole('button', { name: 'Move step 2 up' }));

    expect(screen.getByLabelText('Step 1')).toHaveValue('Second');
    expect(screen.getByLabelText('Step 2')).toHaveValue('First');

    const createSpy = vi.spyOn(recipesApi, 'create');
    fireEvent.click(screen.getByRole('button', { name: 'Save recipe' }));

    await waitFor(() => expect(createSpy).toHaveBeenCalled());
    expect(createSpy.mock.calls[0]![0].steps).toEqual(['Second', 'First']);
  });
});

describe('RecipeForm — edit (AC4)', () => {
  it('pre-fills the form and updates the existing recipe rather than creating a new one', async () => {
    const updateSpy = vi.spyOn(recipesApi, 'update');
    renderRecipeForm('/recipes/recipe-1/edit');

    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('Garlic Butter Pasta'));
    expect(
      screen.getAllByLabelText('Ingredient name').map((el) => (el as HTMLInputElement).value),
    ).toEqual(['Spaghetti', 'Garlic', 'Butter']);

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Garlic Butter Pasta v2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save recipe' }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    expect(updateSpy.mock.calls[0]![0]).toBe('recipe-1');
    expect(updateSpy.mock.calls[0]![1].title).toBe('Garlic Butter Pasta v2');
    await waitFor(() => expect(screen.getByText('Recipe Detail Page')).toBeInTheDocument());
  });

  it('shows a not-found state for an id that does not exist', async () => {
    vi.spyOn(recipesApi, 'get').mockRejectedValueOnce(
      new ApiClientError('Recipe missing not found', 'NOT_FOUND', 404),
    );
    renderRecipeForm('/recipes/missing/edit');

    await waitFor(() => expect(screen.getByText('Recipe not found')).toBeInTheDocument());
  });
});
