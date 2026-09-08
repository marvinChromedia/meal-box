import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useCreateRecipe, useRecipes } from './hooks';

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
