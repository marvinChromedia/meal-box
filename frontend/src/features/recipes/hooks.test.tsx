import type { Recipe } from '@mealbox/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../../lib/api/http';
import { recipesApi } from './api';
import { useCreateRecipe, useRecipe, useRecipes, useSetFavorite } from './hooks';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('recipes hooks (against the typed mock, per AC5)', () => {
  it('useRecipes loads the mock recipe list', async () => {
    const { result } = renderHook(() => useRecipes(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.length).toBeGreaterThan(0);
    expect(result.current.data?.[0].title).toBe('Garlic Butter Pasta');
  });

  it('useCreateRecipe adds a recipe visible to a subsequent useRecipes call', async () => {
    const wrapper = createWrapper();
    const { result: listResult } = renderHook(() => useRecipes(), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));
    const initialCount = listResult.current.data?.length ?? 0;

    const { result: createResult } = renderHook(() => useCreateRecipe(), { wrapper });
    createResult.current.mutate({
      title: 'New Recipe',
      steps: ['Do the thing'],
      tags: [],
      ingredients: [{ name: 'Salt', quantity: 1, unit: 'tsp' }],
    });

    await waitFor(() => expect(createResult.current.isSuccess).toBe(true));
    await waitFor(() => expect(listResult.current.data?.length).toBe(initialCount + 1));
  });
});

describe('useSetFavorite (TEST-123)', () => {
  // Mounted as one combined hook (list + detail + mutation together) rather
  // than three separate renderHook calls, so all three observers live in the
  // same render tree and see each other's cache writes on the same tick.
  function useSetFavoriteHarness(id: string) {
    return { list: useRecipes(), detail: useRecipe(id), mutation: useSetFavorite() };
  }

  it('updates the list and detail caches before the request resolves (AC1 — optimistic)', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSetFavoriteHarness('recipe-2'), { wrapper });
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));
    expect(result.current.detail.data?.isFavorite).toBe(false);

    let resolveSetFavorite!: (value: Recipe) => void;
    const pending = new Promise<Recipe>((resolve) => {
      resolveSetFavorite = resolve;
    });
    const setFavoriteSpy = vi.spyOn(recipesApi, 'setFavorite').mockReturnValueOnce(pending as never);

    result.current.mutation.mutate({ id: 'recipe-2', isFavorite: true });

    await waitFor(() =>
      expect(result.current.list.data?.find((r) => r.id === 'recipe-2')?.isFavorite).toBe(true),
    );
    await waitFor(() => expect(result.current.detail.data?.isFavorite).toBe(true));
    expect(result.current.mutation.isPending).toBe(true);

    resolveSetFavorite({ ...result.current.detail.data!, isFavorite: true });
    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
    setFavoriteSpy.mockRestore();
  });

  it('rolls back both caches when the request fails', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSetFavoriteHarness('recipe-2'), { wrapper });
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));

    let rejectSetFavorite!: (error: unknown) => void;
    const pending = new Promise<never>((_resolve, reject) => {
      rejectSetFavorite = reject;
    });
    const setFavoriteSpy = vi.spyOn(recipesApi, 'setFavorite').mockReturnValueOnce(pending);

    result.current.mutation.mutate({ id: 'recipe-2', isFavorite: true });

    await waitFor(() =>
      expect(result.current.list.data?.find((r) => r.id === 'recipe-2')?.isFavorite).toBe(true),
    );
    await waitFor(() => expect(result.current.detail.data?.isFavorite).toBe(true));

    rejectSetFavorite(new ApiClientError('Could not save', 'NETWORK_ERROR'));
    await waitFor(() => expect(result.current.mutation.isError).toBe(true));
    await waitFor(() =>
      expect(result.current.list.data?.find((r) => r.id === 'recipe-2')?.isFavorite).toBe(false),
    );
    await waitFor(() => expect(result.current.detail.data?.isFavorite).toBe(false));

    setFavoriteSpy.mockRestore();
  });
});
